#include <napi.h>

#include <memory>
#include <unordered_map>

#include "process_capture.h"
#include "session_list.h"

namespace {

std::unordered_map<uint32_t, std::unique_ptr<ProcessCapture>> g_captures;

Napi::Value ListSessions(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  auto pids = ListActiveSessionPids();
  Napi::Array result = Napi::Array::New(env, pids.size());
  for (size_t i = 0; i < pids.size(); i++) {
    result[i] = Napi::Number::New(env, pids[i]);
  }
  return result;
}

Napi::Value StartCapture(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsFunction()) {
    Napi::TypeError::New(env, "startCapture(pid, callback) esperado").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  uint32_t pid = info[0].As<Napi::Number>().Uint32Value();
  Napi::Function callback = info[1].As<Napi::Function>();

  g_captures.erase(pid);
  g_captures[pid] = std::make_unique<ProcessCapture>(pid, callback);
  return env.Undefined();
}

Napi::Value StopCapture(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "stopCapture(pid) esperado").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  uint32_t pid = info[0].As<Napi::Number>().Uint32Value();
  g_captures.erase(pid);
  return env.Undefined();
}

Napi::Value StopAll(const Napi::CallbackInfo& info) {
  g_captures.clear();
  return info.Env().Undefined();
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("listSessions", Napi::Function::New(env, ListSessions));
  exports.Set("startCapture", Napi::Function::New(env, StartCapture));
  exports.Set("stopCapture", Napi::Function::New(env, StopCapture));
  exports.Set("stopAll", Napi::Function::New(env, StopAll));
  return exports;
}

}  // namespace

NODE_API_MODULE(audio_mixer, Init)
