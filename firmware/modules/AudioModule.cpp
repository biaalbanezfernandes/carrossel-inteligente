#include "AudioModule.h"

AudioModule::AudioModule()
  : mp3Serial(2), playingState(false), currentVolume(22) {}

void AudioModule::begin() {
  // Inicializa UART2 nos pinos configurados com baud rate padrão 9600
  mp3Serial.begin(9600, SERIAL_8N1, PIN_AUDIO_RX, PIN_AUDIO_TX);
  delay(150); // Tempo para estabilização do circuito de áudio

  // Define volume padrão e garante que inicia parado
  setVolume(currentVolume);
  delay(50);
  stop();
}

void AudioModule::play() {
  // Comando 0x0F: Tocar pasta/música específica ou comando 0x0D (Play)
  // 0x0D retoma ou inicia reprodução
  sendCommand(0x0D, 0x0000);
  playingState = true;
}

void AudioModule::stop() {
  // Comando 0x16: Stop
  sendCommand(0x16, 0x0000);
  playingState = false;
}

void AudioModule::setVolume(uint8_t volume) {
  if (volume > 30) volume = 30;
  currentVolume = volume;
  // Comando 0x06: Definir volume (0-30)
  sendCommand(0x06, currentVolume);
}

void AudioModule::sendCommand(uint8_t command, uint16_t argument) {
  // Frame padrão do protocolo DFPlayer Mini de 10 bytes:
  // [0] 0x7E - Start
  // [1] 0xFF - Version
  // [2] 0x06 - Length
  // [3] CMD  - Command
  // [4] 0x00 - Feedback (0=no feedback)
  // [5] ArgH - Parameter High byte
  // [6] ArgL - Parameter Low byte
  // [7] ChkH - Checksum High byte
  // [8] ChkL - Checksum Low byte
  // [9] 0xEF - End

  uint8_t frame[10];
  frame[0] = 0x7E;
  frame[1] = 0xFF;
  frame[2] = 0x06;
  frame[3] = command;
  frame[4] = 0x00;
  frame[5] = (uint8_t)(argument >> 8);
  frame[6] = (uint8_t)(argument & 0xFF);

  // Cálculo de checksum
  uint16_t sum = 0;
  for (int i = 1; i < 7; i++) {
    sum += frame[i];
  }
  uint16_t checksum = -sum;
  frame[7] = (uint8_t)(checksum >> 8);
  frame[8] = (uint8_t)(checksum & 0xFF);
  frame[9] = 0xEF;

  mp3Serial.write(frame, 10);
  mp3Serial.flush();
}
