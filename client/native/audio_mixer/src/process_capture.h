#pragma once

#include <napi.h>

#include <atomic>
#include <cstdint>
#include <thread>

class ProcessCapture {
 public:
  ProcessCapture(uint32_t pid, Napi::Function callback);
  ~ProcessCapture();

  void Stop();

 private:
  void Run();

  uint32_t pid_;
  std::atomic<bool> stop_{false};
  std::thread thread_;
  Napi::ThreadSafeFunction tsfn_;
};
