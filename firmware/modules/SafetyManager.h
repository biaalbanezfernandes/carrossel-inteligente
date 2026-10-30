#ifndef SAFETY_MANAGER_H
#define SAFETY_MANAGER_H

#include <Arduino.h>
#include "Config.h"
#include "StateManager.h"

/**
 * SafetyManager: Guardião de Segurança do Brinquedo Infantil
 * - Monitora Watchdog de Comunicação (timeout de perda de sinal Wi-Fi/BLE)
 * - Botão físico de parada de emergência
 * - Parada segura imediata do motor e desligamento total de atuadores
 * - Garante que nenhuma saída ative de forma não intencional após reinicialização
 */
class SafetyManager {
public:
  SafetyManager(StateManager &stateMgr);
  void begin();
  void loop();

  void feedWatchdog(); // Invocado a cada comando válido recebido por Wi-Fi ou BLE
  bool isFailsafeTriggered() const { return failsafeActive; }
  void resetFailsafe();

private:
  StateManager &stateManagerRef;
  unsigned long lastCommActivity;
  bool failsafeActive;
  bool lastBtnState;
  unsigned long lastDebounceTime;

  void triggerEmergencyStop(const char *reason);
};

#endif // SAFETY_MANAGER_H
