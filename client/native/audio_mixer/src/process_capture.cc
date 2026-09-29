#include "process_capture.h"

#include <windows.h>
#include <mmdeviceapi.h>
#include <audioclient.h>
#include <audioclientactivationparams.h>
#include <objidl.h>

#include <algorithm>
#include <cstdio>
#include <cstring>
#include <string>
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

// true assim que o Windows confirma que o processo terminou (ou o handle nem
// pôde ser aberto). Não tem relação com a sessão sumir/voltar do mixer —
// aquilo é só cosmético e não deveria derrubar a captura.
bool ProcessHasExited(HANDLE processHandle, std::string* debugReason) {
  if (!processHandle) return false;
  DWORD exitCode = STILL_ACTIVE;
  if (!GetExitCodeProcess(processHandle, &exitCode)) {
    *debugReason = "process-exited getexitcode-failed lastError=" + std::to_string(GetLastError());
    return true;
  }
  if (exitCode != STILL_ACTIVE) {
    *debugReason = "process-exited exitCode=" + std::to_string(exitCode);
    return true;
  }
  return false;
}

}  // namespace

namespace {
void CallEnded(Napi::ThreadSafeFunction& tsfn, const std::string& reason) {
  tsfn.BlockingCall(new std::string(reason), [](Napi::Env env, Napi::Function jsCallback, std::string* reason) {
    jsCallback.Call({Napi::String::New(env, *reason)});
    delete reason;
  });
}
}  // namespace

ProcessCapture::ProcessCapture(uint32_t pid, Napi::Function onData, Napi::Function onEnded) : pid_(pid) {
  dataTsfn_ = Napi::ThreadSafeFunction::New(onData.Env(), onData, "ProcessCaptureData", 0, 1);
  endedTsfn_ = Napi::ThreadSafeFunction::New(onEnded.Env(), onEnded, "ProcessCaptureEnded", 0, 1);
  thread_ = std::thread(&ProcessCapture::Run, this);
}

ProcessCapture::~ProcessCapture() { Stop(); }

void ProcessCapture::Stop() {
  if (stop_.exchange(true)) return;
  if (thread_.joinable()) thread_.join();
  dataTsfn_.Release();
  endedTsfn_.Release();
}

void ProcessCapture::Run() {
  HRESULT hr = CoInitializeEx(nullptr, COINIT_MULTITHREADED);
  bool needUninit = SUCCEEDED(hr);

  // Só serve pra notar quando o processo-alvo morre de verdade; se não
  // conseguirmos abrir o handle (processo protegido, corrida na saída etc.),
  // seguimos sem essa checagem — os erros do WASAPI abaixo cobrem o resto.
  HANDLE processHandle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION | SYNCHRONIZE, FALSE, pid_);

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
    if (processHandle) CloseHandle(processHandle);
    if (needUninit) CoUninitialize();
    if (!stop_.load()) CallEnded(endedTsfn_, "activate-call-failed");
    return;
  }

  handler->Wait();
  if (asyncOp) asyncOp->Release();

  IAudioClient* audioClient = handler->client_;
  HRESULT activateResult = handler->result_;
  handler->Release();

  if (FAILED(activateResult) || !audioClient) {
    if (processHandle) CloseHandle(processHandle);
    if (needUninit) CoUninitialize();
    if (!stop_.load()) CallEnded(endedTsfn_, "activation-failed");
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
    if (processHandle) CloseHandle(processHandle);
    if (needUninit) CoUninitialize();
    if (!stop_.load()) CallEnded(endedTsfn_, "client-init-failed");
    return;
  }

  audioClient->SetEventHandle(hEvent);

  IAudioCaptureClient* captureClient = nullptr;
  hr = audioClient->GetService(__uuidof(IAudioCaptureClient), (void**)&captureClient);
  if (FAILED(hr) || !captureClient) {
    CloseHandle(hEvent);
    audioClient->Release();
    if (processHandle) CloseHandle(processHandle);
    if (needUninit) CoUninitialize();
    if (!stop_.load()) CallEnded(endedTsfn_, "capture-service-failed");
    return;
  }

  audioClient->Start();

  std::string endReason = "stopped-by-js";
  while (!stop_.load()) {
    std::string exitDebug;
    if (ProcessHasExited(processHandle, &exitDebug)) {
      endReason = exitDebug;
      break;
    }

    // 100ms (não 500) porque isso também limita quanto tempo Stop() trava o
    // processo principal do Electron esperando essa thread perceber o pedido.
    DWORD waitResult = WaitForSingleObject(hEvent, 100);
    if (stop_.load()) break;
    if (waitResult != WAIT_OBJECT_0) continue;

    UINT32 packetLength = 0;
    if (FAILED(captureClient->GetNextPacketSize(&packetLength))) {
      endReason = "get-next-packet-size-failed";
      break;
    }

    bool clientFailed = false;
    while (packetLength != 0) {
      BYTE* data = nullptr;
      UINT32 numFrames = 0;
      DWORD flags = 0;
      if (FAILED(captureClient->GetBuffer(&data, &numFrames, &flags, nullptr, nullptr))) {
        packetLength = 0;
        clientFailed = true;
        endReason = "get-buffer-failed";
        break;
      }

      if (numFrames > 0) {
        auto* samples = new std::vector<float>(static_cast<size_t>(numFrames) * wfx.nChannels);
        if (flags & AUDCLNT_BUFFERFLAGS_SILENT) {
          std::fill(samples->begin(), samples->end(), 0.0f);
        } else {
          memcpy(samples->data(), data, samples->size() * sizeof(float));
        }

        dataTsfn_.BlockingCall(samples, [](Napi::Env env, Napi::Function jsCallback, std::vector<float>* chunk) {
          Napi::Float32Array arr = Napi::Float32Array::New(env, chunk->size());
          memcpy(arr.Data(), chunk->data(), chunk->size() * sizeof(float));
          jsCallback.Call({arr});
          delete chunk;
        });
      }

      captureClient->ReleaseBuffer(numFrames);
      if (FAILED(captureClient->GetNextPacketSize(&packetLength))) {
        packetLength = 0;
        clientFailed = true;
        endReason = "get-next-packet-size-failed";
        break;
      }
    }
    if (clientFailed) break;
  }

  audioClient->Stop();
  captureClient->Release();
  CloseHandle(hEvent);
  audioClient->Release();
  if (processHandle) CloseHandle(processHandle);
  if (needUninit) CoUninitialize();

  // Se saímos por conta própria (processo morreu ou o cliente WASAPI falhou),
  // avisa o JS pra ele limpar a UI/nó de áudio sem precisar continuar
  // reconsultando a lista de sessões.
  if (!stop_.load()) CallEnded(endedTsfn_, endReason);
}
