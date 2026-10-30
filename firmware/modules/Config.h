#ifndef CARROSSEL_CONFIG_H
#define CARROSSEL_CONFIG_H

#include <Arduino.h>

/**
 * ============================================================================
 * DEFINIÇÃO DE PINAGEM E PARÂMETROS - ESP32 CONVENCIONAL (ESP32-WROOM-32)
 * ============================================================================
 * ATENÇÃO ELÉTRICA:
 * O ESP32 opera com nível lógico de 3.3V. Cargas de potência (motor, pisca-pisca,
 * alto-falantes) NUNCA devem ser ligadas diretamente aos GPIOs.
 * Todos os pinos aqui definidos respeitam os Strapping Pins do ESP32 para evitar
 * travamentos durante o boot (GPIO 0, 2, 12, 15 deixados livres ou neutros).
 */

// --- PINOS DO DRIVER DO MOTOR (Ponte H / Driver MOSFET) ---
// GPIO 25 e 26 para sentido de giro / freio
// GPIO 27 para modulação de velocidade via PWM (LEDC)
#define PIN_MOTOR_IN1         25
#define PIN_MOTOR_IN2         26
#define PIN_MOTOR_PWM         27
#define PWM_MOTOR_CHANNEL     0
#define PWM_MOTOR_FREQ        20000   // 20 kHz (frequência inaudível, sem zumbido no motor)
#define PWM_MOTOR_RESOLUTION  8       // 8 bits (0 a 255)

// --- PINOS DO MÓDULO DE ÁUDIO (DFPlayer Mini / Serial MP3) ---
// Utiliza UART2 do ESP32: TX2=GPIO 17, RX2=GPIO 16
// IMPORTANTE: Colocar resistor de 1k no pino RX do DFPlayer para proteção de nível lógico 3.3V/5V.
#define PIN_AUDIO_TX          17
#define PIN_AUDIO_RX          16

// --- PINO DE CONTROLE DO PISCA-PISCA COLORIDO ---
// GPIO 33 para comando do estágio de chaveamento (Relé ou MOSFET isolado)
// O pisca-pisca original mantém sua própria caixinha controladora de efeitos.
#define PIN_LIGHT_CONTROL     33

// --- PINO DO BOTÃO FÍSICO DE EMERGÊNCIA / LOCAL (Opcional) ---
// Botão normalmente aberto ligado com resistor de pull-up interno
#define PIN_PHYSICAL_BUTTON   14

// --- PARÂMETROS DE SEGURANÇA E TIMEOUTS ---
// Tempo máximo sem sinal de comunicação (Wi-Fi ou BLE) antes de acionar desligamento seguro
#define SAFETY_COMM_TIMEOUT_MS  8000   // 8 segundos de watchdog de comunicação
#define MOTOR_RAMP_STEP_MS      20     // Intervalo de rampa suave para partida/parada
#define MOTOR_RAMP_ACCEL_STEP   5      // Incremento de PWM por passo de rampa

// --- CONFIGURAÇÃO DE REDE WI-FI ---
// Por padrão opera em modo Access Point (AP) para conexão direta do celular
#define WIFI_AP_SSID          "Carrossel_Maker_ESP32"
#define WIFI_AP_PASSWORD      "carrossel123"
#define WEBSOCKET_PORT        81
#define HTTP_SERVER_PORT      80

// --- IDENTIFICADORES BLUETOOTH BLE (GATT) ---
#define BLE_DEVICE_NAME       "Carrossel_Maker_BLE"
#define BLE_SERVICE_UUID      "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define BLE_CHAR_CMD_UUID     "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define BLE_CHAR_STATE_UUID   "beb5483e-36e1-4688-b7f5-ea07361b26a9"

#endif // CARROSSEL_CONFIG_H
