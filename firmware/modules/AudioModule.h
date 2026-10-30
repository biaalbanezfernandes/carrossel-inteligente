#ifndef AUDIO_MODULE_H
#define AUDIO_MODULE_H

#include <Arduino.h>
#include <HardwareSerial.h>
#include "Config.h"

/**
 * Módulo de Controle de Áudio
 * Comunicação serial com módulo MP3 (ex: DFPlayer Mini / YX5200)
 * Trilha sonora infantil para o carrossel.
 */
class AudioModule {
public:
  AudioModule();
  void begin();

  void play();
  void stop();
  void setVolume(uint8_t volume); // 0 a 30

  bool isPlaying() const { return playingState; }

private:
  HardwareSerial mp3Serial;
  bool playingState;
  uint8_t currentVolume;

  void sendCommand(uint8_t command, uint16_t argument);
};

#endif // AUDIO_MODULE_H
