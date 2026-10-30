#include "StateManager.h"

StateManager::StateManager(MotorModule &motor, AudioModule &audio, LightModule &light)
  : motorRef(motor), audioRef(audio), lightRef(light), masterPower(false), onStateChange(nullptr) {}

void StateManager::begin() {
  masterPower = false;
  // Garante que todos os módulos físicos comecem desligados
  motorRef.stop(true);
  audioRef.stop();
  lightRef.turnOff();
}

void StateManager::setMasterPower(bool on) {
  masterPower = on;
  if (on) {
    // SEQUÊNCIA SEGURA DE INICIALIZAÇÃO:
    // 1. Inicia motor com rampa suave
    motorRef.start(255);
    // 2. Inicia áudio
    audioRef.play();
    // 3. Acende o pisca-pisca
    lightRef.turnOn();
  } else {
    // SEQUÊNCIA SEGURA DE DESLIGAMENTO:
    // 1. Para motor com desaceleração/freio
    motorRef.stop(false);
    // 2. Desliga áudio
    audioRef.stop();
    // 3. Apaga iluminação
    lightRef.turnOff();
  }
  notifyChange();
}

void StateManager::setMotor(bool on, uint8_t speed) {
  if (on) {
    motorRef.start(speed);
  } else {
    motorRef.stop(false);
  }
  recomputeMasterStatus();
  notifyChange();
}

void StateManager::setAudio(bool on) {
  if (on) {
    audioRef.play();
  } else {
    audioRef.stop();
  }
  recomputeMasterStatus();
  notifyChange();
}

void StateManager::setLight(bool on) {
  if (on) {
    lightRef.turnOn();
  } else {
    lightRef.turnOff();
  }
  recomputeMasterStatus();
  notifyChange();
}

void StateManager::recomputeMasterStatus() {
  // Se qualquer componente estiver ligado, masterPower reflete true
  masterPower = isMotorOn() || isAudioOn() || isLightOn();
}

String StateManager::getSerializedState() const {
  StaticJsonDocument<256> doc;
  doc["type"] = "state";
  JsonObject payload = doc.createNestedObject("payload");
  payload["power"] = masterPower;
  payload["motor"] = isMotorOn();
  payload["speed"] = motorRef.getSpeed();
  payload["audio"] = isAudioOn();
  payload["light"] = isLightOn();
  payload["uptime"] = millis() / 1000;

  String output;
  serializeJson(doc, output);
  return output;
}

void StateManager::notifyChange() {
  if (onStateChange) {
    onStateChange(getSerializedState());
  }
}
