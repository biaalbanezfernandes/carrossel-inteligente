#include "SafetyManager.h"

SafetyManager::SafetyManager(StateManager &stateMgr)
  : stateManagerRef(stateMgr),
    lastCommActivity(0),
    failsafeActive(false),
    lastBtnState(HIGH),
    lastDebounceTime(0) {}

void SafetyManager::begin() {
  pinMode(PIN_PHYSICAL_BUTTON, INPUT_PULLUP);
  lastCommActivity = millis();
  failsafeActive = false;
}

void SafetyManager::feedWatchdog() {
  lastCommActivity = millis();
  if (failsafeActive) {
    failsafeActive = false;
  }
}

void SafetyManager::loop() {
  unsigned long now = millis();

  // 1. Leitura com debounce do botão físico local
  int reading = digitalRead(PIN_PHYSICAL_BUTTON);
  if (reading != lastBtnState) {
    lastDebounceTime = now;
  }

  if ((now - lastDebounceTime) > 50) {
    // Botão pressionado (nível lógico LOW com pull-up)
    if (reading == LOW) {
      if (stateManagerRef.isMasterOn()) {
        triggerEmergencyStop("Botão físico de parada pressionado");
      }
    }
  }
  lastBtnState = reading;

  // 2. Watchdog de Comunicação: se o carrossel estiver ligado e passar mais
  // de SAFETY_COMM_TIMEOUT_MS sem nenhum comando ou ping do celular:
  if (stateManagerRef.isMasterOn()) {
    if (now - lastCommActivity > SAFETY_COMM_TIMEOUT_MS) {
      triggerEmergencyStop("Timeout de perda de comunicação com celular (Watchdog de Segurança)");
    }
  }
}

void SafetyManager::triggerEmergencyStop(const char *reason) {
  failsafeActive = true;
  Serial.printf("[SEGURANCA ATIVADA] Parada segura executada: %s\n", reason);

  // Desliga todas as cargas com prioridade absoluta
  stateManagerRef.setMasterPower(false);
}

void SafetyManager::resetFailsafe() {
  failsafeActive = false;
  lastCommActivity = millis();
}
