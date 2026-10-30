#ifndef STATE_MANAGER_H
#define STATE_MANAGER_H

#include <Arduino.h>
#include <ArduinoJson.h>
#include "MotorModule.h"
#include "AudioModule.h"
#include "LightModule.h"

// Callback para notificar canais de comunicação quando o estado mudar
typedef void (*StateChangeCallback)(const String &jsonState);

/**
 * StateManager: Gerenciador Central de Estado e Orquestração do Carrossel
 */
class StateManager {
public:
  StateManager(MotorModule &motor, AudioModule &audio, LightModule &light);
  void begin();

  // Comandos Mestres (Ligar / Desligar Geral com sequência segura)
  void setMasterPower(bool on);

  // Comandos Individuais
  void setMotor(bool on, uint8_t speed = 255);
  void setAudio(bool on);
  void setLight(bool on);

  // Telemetria & Serialização
  String getSerializedState() const;
  bool isMasterOn() const { return masterPower; }
  bool isMotorOn() const { return motorRef.isRunning() || motorRef.getTargetActive(); }
  bool isAudioOn() const { return audioRef.isPlaying(); }
  bool isLightOn() const { return lightRef.isOn(); }

  void setChangeCallback(StateChangeCallback cb) { onStateChange = cb; }
  void notifyChange();

private:
  MotorModule &motorRef;
  AudioModule &audioRef;
  LightModule &lightRef;

  bool masterPower;
  StateChangeCallback onStateChange;

  void recomputeMasterStatus();
};

#endif // STATE_MANAGER_H
