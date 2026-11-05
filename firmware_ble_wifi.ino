/*
 * ==============================================================================
 * PROJETO: CARROSSEL INTELIGENTE MAKER - CONTROLE DO MOTOR (BLE + WI-FI)
 * Placa: ESP32 Dev Module (ESP32 Convencional 38 pinos)
 * ==============================================================================
 * BIBLIOTECAS NECESSÁRIAS (Instalar via Ferramentas -> Gerenciar Bibliotecas):
 * 1. "ArduinoJson" (por Benoit Blanchon - versão 6.x ou 7.x)
 * 2. "WebSockets" (por Markus Sattler - versão 2.4.x)
 * ==============================================================================
 * COMPATIBILIDADE TOTAL DE LIGAÇÕES (L298N, MOSFET OU RELÉ):
 * - Ponte H L298N: IN1 = GPIO 26, IN2 = GPIO 27 (deixe o jumper no ENA ou ligue ENA no GPIO 25)
 * - Módulo Relé ou MOSFET: Sinal IN/Gate = GPIO 26 (ou GPIO 25)
 * - Pino GND: Conectar no GND do Driver/Relé/Bateria (GND Comum obrigatório)
 * - Pino VIN: 5V da Fonte/USB
 * ==============================================================================
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// --- PINOS (Compatível com L298N IN1=26/IN2=27 e Relé/MOSFET no 26 ou 25) ---
#define PIN_MOTOR_IN1    26    // PWM principal / IN1 da L298N / Sinal Relé ou MOSFET
#define PIN_MOTOR_IN2    27    // IN2 da L298N (mantido em LOW para não frear a Ponte H!)
#define PIN_MOTOR_ENA    25    // Auxiliar Liga/Desliga (caso ENA ou Relé esteja no 25)

#define PWM_FREQ         1000  // 1 kHz (ideal para torque forte na Ponte H L298N)
#define PWM_BITS         8     // Resolução de 8 bits (0 a 255)

// --- CONFIGURAÇÃO DA REDE WI-FI & BLUETOOTH ---
const char* WIFI_SSID = "Carrossel_Maker_ESP32";
const char* WIFI_PASS = "carrossel123";
const char* BLE_NAME  = "Carrossel_Maker_BLE";

#define BLE_SERVICE_UUID    "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define BLE_CHAR_CMD_UUID   "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define BLE_CHAR_STATE_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a9"

WebServer server(80);
WebSocketsServer ws(81);

BLEServer* pBleServer = nullptr;
BLECharacteristic* pBleCmdChar = nullptr;
BLECharacteristic* pBleStateChar = nullptr;
bool bleConnected = false;
uint8_t wsClients = 0;

// Estado do Motor
bool motorState = false;
uint8_t currentSpeed = 0;
uint8_t targetSpeed = 0;
unsigned long lastRampTime = 0;
unsigned long lastCommActivity = 0;
const unsigned long WATCHDOG_TIMEOUT = 12000; // 12s de segurança sem comunicação Wi-Fi

void broadcastState();
void processCommand(const char* raw);
void setMotorPower(bool on, uint8_t speed = 220);

// Funções auxiliares de PWM compatíveis com pacote ESP32 2.x e 3.x
void setupPwmPin(uint8_t pin) {
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  ledcAttach(pin, PWM_FREQ, PWM_BITS);
#else
  ledcSetup(0, PWM_FREQ, PWM_BITS);
  ledcAttachPin(pin, 0);
#endif
}

void writePwmDuty(uint8_t pin, uint8_t duty) {
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  ledcWrite(pin, duty);
#else
  ledcWrite(0, duty);
#endif
}

// Callbacks Bluetooth BLE
class ServerCallbacks: public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    bleConnected = true;
    lastCommActivity = millis();
    Serial.println("[BLE] Celular conectado via Bluetooth!");
  }
  void onDisconnect(BLEServer* pServer) {
    bleConnected = false;
    Serial.println("[BLE] Celular desconectado do Bluetooth.");
    if (motorState && wsClients == 0) {
      Serial.println("[SEGURANCA] Bluetooth desconectado! Parando motor.");
      setMotorPower(false);
    }
    pServer->startAdvertising();
  }
};

class CmdCallbacks: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    String rx = String(pCharacteristic->getValue().c_str());
    if (rx.length() > 0) {
      lastCommActivity = millis();
      Serial.print("[BLE CMD] Recebido: ");
      Serial.println(rx);
      processCommand(rx.c_str());
    }
  }
};

void setup() {
  Serial.begin(115200);
  delay(300);

  // 1. Configura pinos de saída (GARANTE QUE COMEÇA 100% DESLIGADO)
  pinMode(PIN_MOTOR_IN1, OUTPUT);
  pinMode(PIN_MOTOR_IN2, OUTPUT);
  pinMode(PIN_MOTOR_ENA, OUTPUT);

  digitalWrite(PIN_MOTOR_IN2, LOW); // IN2 sempre LOW para L298N girar livremente
  digitalWrite(PIN_MOTOR_ENA, LOW);

  // Configura PWM de 20kHz no pino 26 (IN1)
  setupPwmPin(PIN_MOTOR_IN1);
  writePwmDuty(PIN_MOTOR_IN1, 0);

  // 2. Inicia Wi-Fi em modo Ponto de Acesso (AP)
  WiFi.mode(WIFI_AP);
  WiFi.softAP(WIFI_SSID, WIFI_PASS);

  Serial.println("\n[Wi-Fi] Rede criada: Carrossel_Maker_ESP32 (senha: carrossel123)");
  Serial.print("[Wi-Fi] IP do ESP32: ");
  Serial.println(WiFi.softAPIP());

  // 3. Servidor Web e WebSocket
  server.enableCORS(true);
  server.on("/api/ping", HTTP_GET, []() {
    lastCommActivity = millis();
    server.send(200, "application/json", "{\"status\":\"ok\"}");
  });
  server.on("/api/status", HTTP_GET, []() {
    lastCommActivity = millis();
    StaticJsonDocument<256> doc;
    doc["type"] = "state";
    JsonObject p = doc.createNestedObject("payload");
    p["power"] = motorState;
    p["motor"] = motorState;
    p["speed"] = motorState ? targetSpeed : 0;
    p["uptime"] = millis() / 1000;
    String out;
    serializeJson(doc, out);
    server.send(200, "application/json", out);
  });
  server.begin();

  ws.begin();
  ws.onEvent([](uint8_t num, WStype_t type, uint8_t *payload, size_t len) {
    if (type == WStype_CONNECTED) {
      wsClients++;
      lastCommActivity = millis();
      Serial.printf("[WS] Cliente #%u conectado.\n", num);
      broadcastState();
    } else if (type == WStype_DISCONNECTED) {
      if (wsClients > 0) wsClients--;
      Serial.printf("[WS] Cliente #%u desconectado.\n", num);
    } else if (type == WStype_TEXT) {
      lastCommActivity = millis();
      Serial.printf("[WS CMD] Recebido: %s\n", (char*)payload);
      processCommand((char*)payload);
    }
  });

  // 4. Inicia Bluetooth BLE com MTU expandido (evita corte de JSON em 20 bytes)
  BLEDevice::init(BLE_NAME);
  BLEDevice::setMTU(517);
  pBleServer = BLEDevice::createServer();
  pBleServer->setCallbacks(new ServerCallbacks());
  BLEService *pService = pBleServer->createService(BLE_SERVICE_UUID);

  pBleCmdChar = pService->createCharacteristic(
    BLE_CHAR_CMD_UUID,
    BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR
  );
  pBleCmdChar->setCallbacks(new CmdCallbacks());

  pBleStateChar = pService->createCharacteristic(
    BLE_CHAR_STATE_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  pBleStateChar->addDescriptor(new BLE2902());

  pService->start();
  BLEAdvertising *pAdv = BLEDevice::getAdvertising();
  pAdv->addServiceUUID(BLE_SERVICE_UUID);
  pAdv->setScanResponse(true);
  pAdv->setMinPreferred(0x06);
  pAdv->setMinPreferred(0x12);
  BLEDevice::startAdvertising();

  lastCommActivity = millis();
  Serial.println("[PRONTO] Carrossel MAKER pronto! Motor desligado por padrao.");
}

void loop() {
  unsigned long now = millis();

  // Rampa suave de aceleração e desaceleração do motor (Soft-Start)
  if (now - lastRampTime >= 15) {
    lastRampTime = now;
    if (motorState) {
      digitalWrite(PIN_MOTOR_IN2, LOW);
      digitalWrite(PIN_MOTOR_ENA, HIGH);

      if (currentSpeed < targetSpeed) {
        if (currentSpeed < 60) currentSpeed = 60; // Torque mínimo inicial
        currentSpeed = (currentSpeed + 5 >= targetSpeed) ? targetSpeed : currentSpeed + 5;
        writePwmDuty(PIN_MOTOR_IN1, currentSpeed);
      } else if (currentSpeed > targetSpeed) {
        currentSpeed = (currentSpeed <= targetSpeed + 5) ? targetSpeed : currentSpeed - 5;
        writePwmDuty(PIN_MOTOR_IN1, currentSpeed);
      }
    } else {
      if (currentSpeed > 0) {
        currentSpeed = (currentSpeed <= 15) ? 0 : currentSpeed - 15;
        writePwmDuty(PIN_MOTOR_IN1, currentSpeed);
        if (currentSpeed == 0) {
          digitalWrite(PIN_MOTOR_IN2, LOW);
          digitalWrite(PIN_MOTOR_ENA, LOW);
        }
      }
    }
  }

  server.handleClient();
  ws.loop();

  // Watchdog de segurança: se não estiver com BLE ativo e passar 12s sem sinal, para o motor
  if (motorState && !bleConnected && (now - lastCommActivity > WATCHDOG_TIMEOUT)) {
    Serial.println("[SEGURANCA] Sem comunicacao ativa! Parando motor.");
    setMotorPower(false);
  }

  delay(4);
}

void setMotorPower(bool on, uint8_t speed) {
  motorState = on;
  if (on) {
    targetSpeed = (speed < 60) ? 60 : speed;
    digitalWrite(PIN_MOTOR_IN2, LOW);
    digitalWrite(PIN_MOTOR_ENA, HIGH);
    if (currentSpeed < 60) {
      currentSpeed = 60;
      writePwmDuty(PIN_MOTOR_IN1, currentSpeed);
    }
    Serial.printf("[MOTOR] LIGADO -> PWM alvo: %u (GPIO26=PWM, GPIO27=LOW, GPIO25=HIGH)\n", targetSpeed);
  } else {
    targetSpeed = 0;
    currentSpeed = 0;
    writePwmDuty(PIN_MOTOR_IN1, 0);
    digitalWrite(PIN_MOTOR_IN2, LOW);
    digitalWrite(PIN_MOTOR_ENA, LOW);
    Serial.println("[MOTOR] DESLIGADO -> Parado imediatamente.");
  }
  broadcastState();
}

void processCommand(const char* raw) {
  if (!raw || raw[0] == '\0') return;

  // 1. Suporte a comando compacto "M:1:220" / "M:0:0" / "PING" / "G"
  if (raw[0] == 'M' && raw[1] == ':') {
    bool on = (raw[2] == '1');
    int spd = 220;
    if (raw[3] == ':' && raw[4] != '\0') spd = atoi(raw + 4);
    setMotorPower(on, (uint8_t)constrain(spd, 0, 255));
    return;
  }
  if (strcmp(raw, "PING") == 0) return;
  if (strcmp(raw, "G") == 0 || strcmp(raw, "GET_STATE") == 0) {
    broadcastState();
    return;
  }

  // 2. Parsing JSON (suporta formato completo e formato curto <= 20 bytes)
  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, raw);
  if (!err) {
    if (!doc["m"].isNull()) {
      bool on = doc["m"].as<int>() != 0 || doc["m"].as<bool>();
      uint8_t spd = doc["s"] | (on ? 220 : 0);
      setMotorPower(on, spd);
      return;
    }

    const char* cmd = doc["cmd"] | doc["c"];
    if (!cmd) return;

    if (strcmp(cmd, "PING") == 0) return;
    if (strcmp(cmd, "GET_STATE") == 0 || strcmp(cmd, "G") == 0) {
      broadcastState();
      return;
    }

    if (strcmp(cmd, "POWER") == 0 || strcmp(cmd, "MOTOR") == 0 || strcmp(cmd, "M") == 0) {
      bool val = false;
      if (doc["value"].is<bool>()) val = doc["value"].as<bool>();
      else if (doc["value"].is<int>()) val = (doc["value"].as<int>() != 0);
      else if (doc["v"].is<bool>()) val = doc["v"].as<bool>();
      else if (doc["v"].is<int>()) val = (doc["v"].as<int>() != 0);

      uint8_t spd = doc["speed"] | doc["s"] | (val ? 220 : 0);
      setMotorPower(val, spd);
      return;
    }
  } else {
    // 3. Fallback tolerante caso o JSON tenha sido cortado pelo MTU de 20 bytes do BLE
    String s(raw);
    if (s.indexOf("GET_STATE") >= 0) {
      broadcastState();
    } else if (s.indexOf("MOTOR") >= 0 || s.indexOf("POWER") >= 0) {
      bool on = (s.indexOf("true") >= 0 || s.indexOf(":1") >= 0);
      int spdIdx = s.indexOf("\"speed\":");
      uint8_t spd = 220;
      if (spdIdx >= 0) {
        spd = (uint8_t)constrain(s.substring(spdIdx + 8).toInt(), 0, 255);
      }
      setMotorPower(on, spd);
    }
  }
}

void broadcastState() {
  uint8_t reportedSpeed = motorState ? targetSpeed : 0;

  // JSON completo para WebSocket
  StaticJsonDocument<256> doc;
  doc["type"] = "state";
  JsonObject p = doc.createNestedObject("payload");
  p["power"] = motorState;
  p["motor"] = motorState;
  p["speed"] = reportedSpeed;
  p["uptime"] = millis() / 1000;
  String out;
  serializeJson(doc, out);
  ws.broadcastTXT(out);

  // JSON enxuto para BLE Notify (garante que nunca estoura MTU básico)
  if (bleConnected && pBleStateChar) {
    char bleBuf[64];
    snprintf(bleBuf, sizeof(bleBuf),
      "{\"motor\":%s,\"power\":%s,\"speed\":%u}",
      motorState ? "true" : "false",
      motorState ? "true" : "false",
      (unsigned)reportedSpeed);
    pBleStateChar->setValue((uint8_t*)bleBuf, strlen(bleBuf));
    pBleStateChar->notify();
  }
}
