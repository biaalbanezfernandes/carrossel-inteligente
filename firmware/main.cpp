/**
 * ============================================================================
 * PROJETO: CARROSSEL INFANTIL INTELIGENTE COM ESP32 CONVENCIONAL
 * Ponto de Entrada Principal (main.cpp)
 * ============================================================================
 * Arquitetura Modular:
 * - StateManager: Orquestração geral e telemetria
 * - MotorModule: Rampa de aceleração suave e frenagem segura
 * - AudioModule: Controle UART DFPlayer Mini
 * - LightModule: Acionamento de relé/MOSFET para pisca-pisca de Natal
 * - WiFiModule: Ponto de acesso, Web Server e WebSocket bidirecional
 * - BLEModule: Serviço GATT customizado para Web Bluetooth
 * - SafetyManager: Watchdog de perda de comunicação e parada de emergência
 *
 * REGRA FUNDAMENTAL:
 * - Todas as saídas iniciam rigorosamente DESLIGADAS por segurança infantil.
 * ============================================================================
 */

#include <Arduino.h>
#include "modules/Config.h"
#include "modules/MotorModule.h"
#include "modules/AudioModule.h"
#include "modules/LightModule.h"
#include "modules/StateManager.h"
#include "modules/SafetyManager.h"
#include "modules/WiFiModule.h"
#include "modules/BLEModule.h"

// Instâncias dos Módulos Físicos
MotorModule motorModule;
AudioModule audioModule;
LightModule lightModule;

// Gerenciadores de Estado e Segurança
StateManager stateManager(motorModule, audioModule, lightModule);
SafetyManager safetyManager(stateManager);

// Módulos de Comunicação
WiFiModule wifiModule(stateManager, safetyManager);
BLEModule bleModule(stateManager, safetyManager);

// Callback global: propaga alterações de estado para Wi-Fi e BLE simultaneamente
void onHardwareStateChanged(const String &jsonState) {
  wifiModule.broadcastState(jsonState);
  bleModule.notifyState(jsonState);
}

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n==============================================");
  Serial.println("   CARROSSEL INTELIGENTE MAKER - ESP32        ");
  Serial.println("   Inicializando modulos de hardware e rede   ");
  Serial.println("==============================================");

  // 1. Inicializa atuadores (todos em estado DESLIGADO)
  motorModule.begin();
  audioModule.begin();
  lightModule.begin();
  stateManager.begin();
  safetyManager.begin();

  // 2. Registra callback de notificação de estado
  stateManager.setChangeCallback(onHardwareStateChanged);

  // 3. Inicializa canais de comunicação (Wi-Fi AP + BLE)
  wifiModule.begin();
  bleModule.begin();

  Serial.println("[STATUS] Sistema pronto e em espera.");
  Serial.println("[STATUS] Seguranca Infantil: Saidas 100% desligadas.");
}

void loop() {
  // Atualiza rampa suave do motor
  motorModule.update();

  // Processa loops de comunicação
  wifiModule.loop();
  bleModule.loop();

  // Monitora watchdog de comunicação e botão de emergência
  safetyManager.loop();

  // Pequeno delay para liberar a CPU para tarefas de background do RTOS
  delay(5);
}
