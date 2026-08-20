#include "process_capture.h"

#include <windows.h>
#include <mmdeviceapi.h>
#include <audioclient.h>
#include <audioclientactivationparams.h>
#include <objidl.h>

#include <algorithm>
#include <cstdio>
#include <cstring>
#include <vector>

namespace {

class CompletionHandler : public IActivateAudioInterfaceCompletionHandler, public IAgileObject {
 public:
  CompletionHandler() : event_(CreateEventW(nullptr, FALSE, FALSE, nullptr)) {}

  STDMETHODIMP QueryInterface(REFIID riid, void** ppv) override {
    if (riid == __uuidof(IUnknown) || riid == __uuidof(IActivateAudioInterfaceCompletionHandler)) {
      *ppv = static_cast<IActivateAudioInterfaceCompletionHandler*>(this);
      AddRef();
      return S_OK;
    }
    if (riid == __uuidof(IAgileObject)) {
      *ppv = static_cast<IAgileObject*>(this);
      AddRef();
      return S_OK;
    }
    *ppv = nullptr;
    return E_NOINTERFACE;
  }
  STDMETHODIMP_(ULONG) AddRef() override { return InterlockedIncrement(&ref_); }
  STDMETHODIMP_(ULONG) Release() override {
    ULONG r = InterlockedDecrement(&ref_);
    if (r == 0) delete this;
    return r;
  }

  STDMETHODIMP ActivateCompleted(IActivateAudioInterfaceAsyncOperation* operation) override {
    HRESULT hrActivate = E_FAIL;
    IUnknown* audioInterface = nullptr;
    HRESULT hr = operation->GetActivateResult(&hrActivate, &audioInterface);
    if (SUCCEEDED(hr) && SUCCEEDED(hrActivate) && audioInterface) {
      audioInterface->QueryInterface(__uuidof(IAudioClient), (void**)&client_);
      audioInterface->Release();
    }
    result_ = SUCCEEDED(hr) ? hrActivate : hr;
    SetEvent(event_);
    return S_OK;
  }

  void Wait() { WaitForSingleObject(event_, INFINITE); }
  ~CompletionHandler() {
    if (event_) CloseHandle(event_);
  }

  IAudioClient* client_ = nullptr;
  HRESULT result_ = E_FAIL;

 private:
  volatile LONG ref_ = 1;
  HANDLE event_;
};

}  // namespace

ProcessCapture::ProcessCapture(uint32_t pid, Napi::Function callback) : pid_(pid) {
  tsfn_ = Napi::ThreadSafeFunction::New(callback.Env(), callback, "ProcessCapture", 0, 1);
  thread_ = std::thread(&ProcessCapture::Run, this);
}

ProcessCapture::~ProcessCapture() { Stop(); }

void ProcessCapture::Stop() {
  if (stop_.exchange(true)) return;
  if (thread_.joinable()) thread_.join();
  tsfn_.Release();
}

void ProcessCapture::Run() {
  HRESULT hr = CoInitializeEx(nullptr, COINIT_MULTITHREADED);
  bool needUninit = SUCCEEDED(hr);

  AUDIOCLIENT_ACTIVATION_PARAMS params;
  ZeroMemory(&params, sizeof(params));
  params.ActivationType = AUDIOCLIENT_ACTIVATION_TYPE_PROCESS_LOOPBACK;
  params.ProcessLoopbackParams.TargetProcessId = pid_;
  params.ProcessLoopbackParams.ProcessLoopbackMode = PROCESS_LOOPBACK_MODE_INCLUDE_TARGET_PROCESS_TREE;

  PROPVARIANT pv;
  ZeroMemory(&pv, sizeof(pv));
  pv.vt = VT_BLOB;
  pv.blob.cbSize = sizeof(params);
  pv.blob.pBlobData = reinterpret_cast<BYTE*>(&params);

  CompletionHandler* handler = new CompletionHandler();
  IActivateAudioInterfaceAsyncOperation* asyncOp = nullptr;

  hr = ActivateAudioInterfaceAsync(VIRTUAL_AUDIO_DEVICE_PROCESS_LOOPBACK, __uuidof(IAudioClient), &pv,
                                    handler, &asyncOp);
  if (FAILED(hr)) {
    handler->Release();
    if (asyncOp) asyncOp->Release();
    if (needUninit) CoUninitialize();
    return;
  }

  handler->Wait();
  if (asyncOp) asyncOp->Release();

  IAudioClient* audioClient = handler->client_;
  HRESULT activateResult = handler->result_;
  handler->Release();

  if (FAILED(activateResult) || !audioClient) {
    if (needUninit) CoUninitialize();
    return;
  }

  WAVEFORMATEX wfx;
  ZeroMemory(&wfx, sizeof(wfx));
  wfx.wFormatTag = WAVE_FORMAT_IEEE_FLOAT;
  wfx.nChannels = 2;
  wfx.nSamplesPerSec = 48000;
  wfx.wBitsPerSample = 32;
  wfx.nBlockAlign = static_cast<WORD>(wfx.nChannels * wfx.wBitsPerSample / 8);
  wfx.nAvgBytesPerSec = wfx.nSamplesPerSec * wfx.nBlockAlign;

  HANDLE hEvent = CreateEventW(nullptr, FALSE, FALSE, nullptr);

  hr = audioClient->Initialize(AUDCLNT_SHAREMODE_SHARED,
                                AUDCLNT_STREAMFLAGS_LOOPBACK | AUDCLNT_STREAMFLAGS_EVENTCALLBACK,
                                2000000, 0, &wfx, nullptr);
  if (FAILED(hr)) {
    CloseHandle(hEvent);
    audioClient->Release();
    if (needUninit) CoUninitialize();
    return;
  }

  audioClient->SetEventHandle(hEvent);

  IAudioCaptureClient* captureClient = nullptr;
  hr = audioClient->GetService(__uuidof(IAudioCaptureClient), (void**)&captureClient);
  if (FAILED(hr) || !captureClient) {
    CloseHandle(hEvent);
    audioClient->Release();
    if (needUninit) CoUninitialize();
    return;
  }

  audioClient->Start();

  while (!stop_.load()) {
    DWORD waitResult = WaitForSingleObject(hEvent, 500);
    if (stop_.load()) break;
    if (waitResult != WAIT_OBJECT_0) continue;

    UINT32 packetLength = 0;
    if (FAILED(captureClient->GetNextPacketSize(&packetLength))) break;

    while (packetLength != 0) {
      BYTE* data = nullptr;
      UINT32 numFrames = 0;
      DWORD flags = 0;
      if (FAILED(captureClient->GetBuffer(&data, &numFrames, &flags, nullptr, nullptr))) {
        packetLength = 0;
        break;
      }

      if (numFrames > 0) {
        auto* samples = new std::vector<float>(static_cast<size_t>(numFrames) * wfx.nChannels);
        if (flags & AUDCLNT_BUFFERFLAGS_SILENT) {
          std::fill(samples->begin(), samples->end(), 0.0f);
        } else {
          memcpy(samples->data(), data, samples->size() * sizeof(float));
        }

        tsfn_.BlockingCall(samples, [](Napi::Env env, Napi::Function jsCallback, std::vector<float>* chunk) {
          Napi::Float32Array arr = Napi::Float32Array::New(env, chunk->size());
          memcpy(arr.Data(), chunk->data(), chunk->size() * sizeof(float));
          jsCallback.Call({arr});
          delete chunk;
        });
      }

      captureClient->ReleaseBuffer(numFrames);
      if (FAILED(captureClient->GetNextPacketSize(&packetLength))) {
        packetLength = 0;
        break;
      }
    }
  }

  audioClient->Stop();
  captureClient->Release();
  CloseHandle(hEvent);
  audioClient->Release();
  if (needUninit) CoUninitialize();
}
