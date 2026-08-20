#include "session_list.h"

#include <windows.h>
#include <mmdeviceapi.h>
#include <audiopolicy.h>

#include <set>

std::vector<uint32_t> ListActiveSessionPids() {
  std::set<uint32_t> pids;

  HRESULT hr = CoInitializeEx(nullptr, COINIT_MULTITHREADED);
  bool needUninit = SUCCEEDED(hr);

  IMMDeviceEnumerator* enumerator = nullptr;
  IMMDevice* device = nullptr;
  IAudioSessionManager2* sessionManager = nullptr;
  IAudioSessionEnumerator* sessionEnumerator = nullptr;

  do {
    hr = CoCreateInstance(__uuidof(MMDeviceEnumerator), nullptr, CLSCTX_ALL,
                           __uuidof(IMMDeviceEnumerator), (void**)&enumerator);
    if (FAILED(hr) || !enumerator) break;

    hr = enumerator->GetDefaultAudioEndpoint(eRender, eConsole, &device);
    if (FAILED(hr) || !device) break;

    hr = device->Activate(__uuidof(IAudioSessionManager2), CLSCTX_ALL, nullptr,
                           (void**)&sessionManager);
    if (FAILED(hr) || !sessionManager) break;

    hr = sessionManager->GetSessionEnumerator(&sessionEnumerator);
    if (FAILED(hr) || !sessionEnumerator) break;

    int count = 0;
    hr = sessionEnumerator->GetCount(&count);
    if (FAILED(hr)) break;

    for (int i = 0; i < count; i++) {
      IAudioSessionControl* control = nullptr;
      if (FAILED(sessionEnumerator->GetSession(i, &control)) || !control) continue;

      IAudioSessionControl2* control2 = nullptr;
      if (SUCCEEDED(control->QueryInterface(__uuidof(IAudioSessionControl2), (void**)&control2)) &&
          control2) {
        AudioSessionState state;
        bool isSystemSession = control2->IsSystemSoundsSession() == S_OK;
        if (SUCCEEDED(control2->GetState(&state)) && state != AudioSessionStateExpired &&
            !isSystemSession) {
          DWORD pid = 0;
          if (SUCCEEDED(control2->GetProcessId(&pid)) && pid != 0) {
            pids.insert(pid);
          }
        }
        control2->Release();
      }
      control->Release();
    }
  } while (false);

  if (sessionEnumerator) sessionEnumerator->Release();
  if (sessionManager) sessionManager->Release();
  if (device) device->Release();
  if (enumerator) enumerator->Release();
  if (needUninit) CoUninitialize();

  return std::vector<uint32_t>(pids.begin(), pids.end());
}
