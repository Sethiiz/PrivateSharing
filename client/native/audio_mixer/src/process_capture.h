#pragma once

#include <napi.h>

#include <atomic>
#include <cstdint>
#include <thread>

class ProcessCapture {
 public:
  // `onData` recebe cada bloco de áudio capturado. `onEnded` é chamado uma
  // única vez quando a captura para sozinha (processo-alvo encerrou, ou a
  // ativação/captura falhou) — nunca quando for o próprio JS que pediu Stop().
  ProcessCapture(uint32_t pid, Napi::Function onData, Napi::Function onEnded);
  ~ProcessCapture();

  void Stop();

 private:
  void Run();

  uint32_t pid_;
  std::atomic<bool> stop_{false};
  std::thread thread_;
  Napi::ThreadSafeFunction dataTsfn_;
  // Recebe uma string com o motivo (ex: "process-exited", "activation-failed")
  // — só pra log/diagnóstico, o JS não depende do valor exato.
  Napi::ThreadSafeFunction endedTsfn_;
};
