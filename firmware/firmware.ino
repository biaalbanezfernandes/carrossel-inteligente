/**
 * ============================================================================
 * PROJETO: CARROSSEL INTELIGENTE COM ESP32 (ARDUINO IDE SKETCH)
 * ============================================================================
 * Para compilar via Arduino IDE:
 * 1. Selecione a placa: "ESP32 Dev Module" (ESP32 convencional).
 * 2. Instale as bibliotecas: "ArduinoJson" (v6) e "WebSockets" (por Markus Sattler).
 * 3. As pastas e arquivos em "modules/" devem permanecer na mesma pasta do sketch.
 */

#include "modules/Config.h"
#include "modules/MotorModule.h"
#include "modules/AudioModule.h"
#include "modules/LightModule.h"
#include "modules/StateManager.h"
#include "modules/SafetyManager.h"
#include "modules/WiFiModule.h"
#include "modules/BLEModule.h"

MotorModule motorModule;
AudioModule audioModule;
LightModule lightModule;

StateManager stateManager(motorModule, audioModule, lightModule);
SafetyManager safetyManager(stateManager);

WiFiModule wifiModule(stateManager, safetyManager);
BLEModule bleModule(stateManager, safetyManager);

void onHardwareStateChanged(const String &jsonState) {
  wifiModule.broadcastState(jsonState);
  bleModule.notifyState(jsonState);
}

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n--- CARROSSEL MAKER ESP32 (Arduino IDE) ---");

  motorModule.begin();
  audioModule.begin();
  lightModule.begin();
  stateManager.begin();
  safetyManager.begin();

  stateManager.setChangeCallback(onHardwareStateChanged);

  wifiModule.begin();
  bleModule.begin();

  Serial.println("[BOOT] Pronto. Saidas desligadas.");
}

void loop() {
  motorModule.update();
  wifiModule.loop();
  bleModule.loop();
  safetyManager.loop();
  delay(5);
}
