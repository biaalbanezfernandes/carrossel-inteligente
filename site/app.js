/**
 * ==========================================================================
 * CARROSSEL INTELIGENTE MAKER - CONTROLE DO MOTOR & GUIAS (app.js v4.2)
 * ==========================================================================
 * Versão focada no MOTOR do carrossel com suporte completo a:
 * - Bluetooth BLE e Wi-Fi WebSocket sem falha de MTU ou Watchdog
 * - Compatibilidade direta com Ponte H L298N (IN1=26, IN2=27) e Relé/MOSFET (26/25)
 * - Controle Mestre do Motor com rampa suave e freio
 * - Comando de Voz instantâneo (Ligar / Desligar)
 * - Slider e presets de velocidade do motor (50%, 85%, 100%) com debounce BLE
 */

document.addEventListener('DOMContentLoaded', () => {
  const comm = window.carouselComm;
  const voice = window.carouselVoice;

  // Estado local do motor
  let motorSpeedPercent = 85;
  let speedDebounceTimer = null;

  // ========================================================================
  // NAVEGAÇÃO ENTRE AS 5 ABAS
  // ========================================================================
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');

      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPane = document.getElementById(targetId);
      if (targetPane) {
        targetPane.classList.add('active');
      }
    });
  });

  // ========================================================================
  // SELETOR DE ESQUEMA DO MOTOR (RELÉ vs MOSFET)
  // ========================================================================
  const btnCircuitOpts = document.querySelectorAll('.btn-circuit-opt');
  const circuitRelayBox = document.getElementById('circuit-detail-relay');
  const circuitMosfetBox = document.getElementById('circuit-detail-mosfet');

  btnCircuitOpts.forEach(btn => {
    btn.addEventListener('click', () => {
      btnCircuitOpts.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.getAttribute('data-circuit');

      if (mode === 'relay') {
        circuitRelayBox.classList.remove('hidden');
        circuitMosfetBox.classList.add('hidden');
      } else {
        circuitRelayBox.classList.add('hidden');
        circuitMosfetBox.classList.remove('hidden');
      }
    });
  });

  // ========================================================================
  // CONTROLE DE VELOCIDADE DO MOTOR (COM DEBOUNCE PARA NÃO CONGESTIONAR BLE)
  // ========================================================================
  const speedSlider = document.getElementById('motor-speed-slider');
  const speedDisplay = document.getElementById('speed-display');
  const presetButtons = document.querySelectorAll('.btn-preset');

  function updateMotorSpeed(newVal, immediateSend = false) {
    motorSpeedPercent = parseInt(newVal, 10);
    if (speedSlider) speedSlider.value = motorSpeedPercent;
    if (speedDisplay) speedDisplay.textContent = `${motorSpeedPercent}%`;

    presetButtons.forEach(btn => {
      const pVal = parseInt(btn.getAttribute('data-speed'), 10);
      btn.classList.toggle('active', pVal === motorSpeedPercent);
    });

    if (comm.hardwareState.power || comm.hardwareState.motor) {
      const pwmValue = Math.round((motorSpeedPercent / 100) * 255);
      comm.hardwareState.motorSpeed = pwmValue;
      realMotor.textContent = `LIGADO (${motorSpeedPercent}%)`;

      if (speedDebounceTimer) clearTimeout(speedDebounceTimer);
      if (immediateSend) {
        comm.sendMotor(true, pwmValue);
      } else {
        speedDebounceTimer = setTimeout(() => {
          comm.sendMotor(true, pwmValue);
        }, 80);
      }
    }
  }

  if (speedSlider) {
    speedSlider.addEventListener('input', (e) => {
      updateMotorSpeed(e.target.value, false);
    });
    speedSlider.addEventListener('change', (e) => {
      updateMotorSpeed(e.target.value, true);
    });
  }

  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      updateMotorSpeed(btn.getAttribute('data-speed'), true);
    });
  });

  // ========================================================================
  // CÓDIGO FONTE DO ESP32 (ARDUINO IDE - COMPLETO E EM 1 ARQUIVO)
  // ========================================================================
  const codeBox = document.getElementById('generated-code-box');
  const btnCopyCode = document.getElementById('btn-copy-code');
  const copyStatus = document.getElementById('copy-status');

  const esp32SketchSource = `/*
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

#define PWM_FREQ         20000 // 20 kHz (sem zumbido audível)
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

  Serial.println("\\n[Wi-Fi] Rede criada: Carrossel_Maker_ESP32 (senha: carrossel123)");
  Serial.print("[Wi-Fi] IP do ESP32: ");
  Serial.println(WiFi.softAPIP());

  // 3. Servidor Web e WebSocket
  server.enableCORS(true);
  server.on("/api/ping", HTTP_GET, []() {
    lastCommActivity = millis();
    server.send(200, "application/json", "{\\"status\\":\\"ok\\"}");
  });
  server.begin();

  ws.begin();
  ws.onEvent([](uint8_t num, WStype_t type, uint8_t *payload, size_t len) {
    if (type == WStype_CONNECTED) {
      wsClients++;
      lastCommActivity = millis();
      broadcastState();
    } else if (type == WStype_DISCONNECTED) {
      if (wsClients > 0) wsClients--;
    } else if (type == WStype_TEXT) {
      lastCommActivity = millis();
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
        if (currentSpeed < 60) currentSpeed = 60;
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
    Serial.printf("[MOTOR] LIGADO -> PWM alvo: %u\\n", targetSpeed);
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
  if (!raw || raw[0] == '\\0') return;

  if (raw[0] == 'M' && raw[1] == ':') {
    bool on = (raw[2] == '1');
    int spd = 220;
    if (raw[3] == ':' && raw[4] != '\\0') spd = atoi(raw + 4);
    setMotorPower(on, (uint8_t)constrain(spd, 0, 255));
    return;
  }
  if (strcmp(raw, "PING") == 0) return;
  if (strcmp(raw, "G") == 0 || strcmp(raw, "GET_STATE") == 0) {
    broadcastState();
    return;
  }

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
    String s(raw);
    if (s.indexOf("GET_STATE") >= 0) {
      broadcastState();
    } else if (s.indexOf("MOTOR") >= 0 || s.indexOf("POWER") >= 0) {
      bool on = (s.indexOf("true") >= 0 || s.indexOf(":1") >= 0);
      int spdIdx = s.indexOf("\\"speed\\":");
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

  if (bleConnected && pBleStateChar) {
    char bleBuf[64];
    snprintf(bleBuf, sizeof(bleBuf),
      "{\\"motor\\":%s,\\"power\\":%s,\\"speed\\":%u}",
      motorState ? "true" : "false",
      motorState ? "true" : "false",
      (unsigned)reportedSpeed);
    pBleStateChar->setValue((uint8_t*)bleBuf, strlen(bleBuf));
    pBleStateChar->notify();
  }
}
`;

  if (codeBox) {
    codeBox.value = esp32SketchSource;
  }

  if (btnCopyCode) {
    btnCopyCode.addEventListener('click', () => {
      navigator.clipboard.writeText(esp32SketchSource).then(() => {
        copyStatus.textContent = '✅ Código Copiado com Sucesso!';
        setTimeout(() => { copyStatus.textContent = ''; }, 3500);
      });
    });
  }

  // ========================================================================
  // ELEMENTOS DE CONTROLE (ABA 1)
  // ========================================================================
  const dotEsp = document.getElementById('dot-esp');
  const txtEsp = document.getElementById('txt-esp');
  const dotWifi = document.getElementById('dot-wifi');
  const txtWifi = document.getElementById('txt-wifi');
  const dotBle = document.getElementById('dot-ble');
  const txtBle = document.getElementById('txt-ble');
  const demoBanner = document.getElementById('demo-banner');

  const inputIp = document.getElementById('input-esp-ip');
  const btnConnectWifi = document.getElementById('btn-connect-wifi');
  const btnConnectBle = document.getElementById('btn-connect-ble');
  const btnToggleDemo = document.getElementById('btn-toggle-demo');
  const connFeedback = document.getElementById('conn-feedback');

  const btnMaster = document.getElementById('btn-master');
  const masterTitle = document.getElementById('master-title');
  const masterSub = document.getElementById('master-sub');

  const badgeMotor = document.getElementById('badge-motor');
  const realMotor = document.getElementById('real-motor');
  const btnToggleMotor = document.getElementById('btn-toggle-motor');

  const btnVoice = document.getElementById('btn-voice');
  const voiceBtnText = document.getElementById('voice-btn-text');
  const voiceStatus = document.getElementById('voice-status');
  const voiceTranscript = document.getElementById('voice-transcript');

  const eventLog = document.getElementById('event-log');
  const btnClearLog = document.getElementById('btn-clear-log');

  function appendLog(message, type = 'info') {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-BR');
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    const timeSpan = document.createElement('span');
    timeSpan.className = 'log-time';
    timeSpan.textContent = `[${timeStr}]`;
    const textSpan = document.createElement('span');
    textSpan.textContent = ` ${message}`;
    entry.appendChild(timeSpan);
    entry.appendChild(textSpan);
    if (eventLog) {
      eventLog.appendChild(entry);
      eventLog.scrollTop = eventLog.scrollHeight;
    }
  }

  comm.onLog((msg, type) => appendLog(msg, type));
  if (btnClearLog) {
    btnClearLog.addEventListener('click', () => { if (eventLog) eventLog.innerHTML = ''; });
  }

  comm.onConnectivityChange(({ channel, isDemo }) => {
    dotEsp.className = 'status-dot dot-offline';
    dotWifi.className = 'status-dot dot-offline';
    dotBle.className = 'status-dot dot-offline';
    txtEsp.textContent = 'Desconectado';
    txtWifi.textContent = 'Off';
    txtBle.textContent = 'Off';
    demoBanner.classList.toggle('hidden', !isDemo);

    if (isDemo) {
      dotEsp.className = 'status-dot dot-warn';
      txtEsp.textContent = 'Simulado';
      connFeedback.textContent = 'Modo Demonstração ativo: sem conexão física com ESP32.';
    } else if (channel === 'wifi') {
      dotEsp.className = 'status-dot dot-online';
      txtEsp.textContent = 'Online';
      dotWifi.className = 'status-dot dot-online';
      txtWifi.textContent = 'Ativo';
      connFeedback.textContent = comm.mqttClient ? 'Conectado pela nuvem (funciona por 5G).' : `Conectado via Wi-Fi ao ESP32 (${inputIp.value}).`;
    } else if (channel === 'ble') {
      dotEsp.className = 'status-dot dot-online';
      txtEsp.textContent = 'Online';
      dotBle.className = 'status-dot dot-online';
      txtBle.textContent = 'Ativo';
      connFeedback.textContent = 'Conectado via Bluetooth BLE ao ESP32.';
    } else {
      connFeedback.textContent = 'Desconectado do ESP32. Escolha BLE, Wi-Fi ou Modo Demo.';
    }
  });

  // ========================================================================
  // FUNÇÃO MESTRE UNIVERSAL: LIGAR / DESLIGAR O MOTOR NA HORA (CLIQUE E VOZ)
  // ========================================================================
  function applyMotorPower(turnOn) {
    appendLog(`Comando: ${turnOn ? 'LIGAR MOTOR' : 'PARAR MOTOR'}`, turnOn ? 'success' : 'warn');

    const targetPwm = Math.round((motorSpeedPercent / 100) * 255);

    comm.hardwareState.power = turnOn;
    comm.hardwareState.motor = turnOn;
    comm.hardwareState.motorSpeed = turnOn ? targetPwm : 0;

    if (turnOn) {
      btnMaster.className = 'master-button master-on';
      masterTitle.textContent = 'DESLIGAR';
      masterSub.textContent = 'Toque para parar';

      badgeMotor.className = 'comp-state-badge badge-on';
      badgeMotor.textContent = 'EM ROTAÇÃO';
      realMotor.textContent = `LIGADO (${motorSpeedPercent}%)`;
      btnToggleMotor.className = 'btn-toggle btn-toggle-on';
      btnToggleMotor.textContent = 'Parar Motor';
    } else {
      btnMaster.className = 'master-button master-off';
      masterTitle.textContent = 'LIGAR MOTOR';
      masterSub.textContent = 'Toque para girar';

      badgeMotor.className = 'comp-state-badge badge-off';
      badgeMotor.textContent = 'PARADO';
      realMotor.textContent = 'DESLIGADO (0%)';
      btnToggleMotor.className = 'btn-toggle btn-toggle-off';
      btnToggleMotor.textContent = 'Ligar Motor';
    }

    comm.notifyState();
    comm.sendMotor(turnOn, targetPwm).then((ok) => {
      if (!ok) {
        comm.hardwareState.power = !turnOn;
        comm.hardwareState.motor = !turnOn;
        comm.hardwareState.motorSpeed = !turnOn ? targetPwm : 0;
        comm.notifyState();
        appendLog('Comando não enviado: conecte o Bluetooth BLE, Wi-Fi ou ative o Modo Demo.', 'error');
      }
    });
  }

  window.carouselApplyPower = applyMotorPower;

  comm.onStateUpdate((state) => {
    if (state.motor || state.power) {
      btnMaster.className = 'master-button master-on';
      masterTitle.textContent = 'DESLIGAR';
      masterSub.textContent = 'Toque para parar';
      badgeMotor.className = 'comp-state-badge badge-on';
      badgeMotor.textContent = 'EM ROTAÇÃO';
      const pct = state.motorSpeed ? Math.round((state.motorSpeed / 255) * 100) : motorSpeedPercent;
      realMotor.textContent = `LIGADO (${pct}%)`;
      btnToggleMotor.className = 'btn-toggle btn-toggle-on';
      btnToggleMotor.textContent = 'Parar Motor';
    } else {
      btnMaster.className = 'master-button master-off';
      masterTitle.textContent = 'LIGAR MOTOR';
      masterSub.textContent = 'Toque para girar';
      badgeMotor.className = 'comp-state-badge badge-off';
      badgeMotor.textContent = 'PARADO';
      realMotor.textContent = 'DESLIGADO (0%)';
      btnToggleMotor.className = 'btn-toggle btn-toggle-off';
      btnToggleMotor.textContent = 'Ligar Motor';
    }
  });

  // Clique no Botão Mestre
  btnMaster.addEventListener('click', () => {
    applyMotorPower(!comm.hardwareState.power);
  });

  // Clique no Botão Alternativo do Motor
  btnToggleMotor.addEventListener('click', () => {
    applyMotorPower(!comm.hardwareState.motor);
  });

  // Conexão Wi-Fi
  btnConnectWifi.addEventListener('click', async () => {
    const ip = inputIp.value.trim() || '192.168.4.1';
    if (location.protocol === 'https:' && comm.isCloudConfigured()) {
      connFeedback.textContent = 'Conectando pela nuvem...';
      await comm.connectCloud();
    } else {
      connFeedback.textContent = `Conectando Wi-Fi em ${ip}...`;
      await comm.connectWifi(ip);
    }
  });

  // Conexão Bluetooth BLE
  btnConnectBle.addEventListener('click', async () => {
    connFeedback.textContent = 'Abrindo pareamento Bluetooth BLE...';
    await comm.connectBLE();
  });

  // Modo Demo
  btnToggleDemo.addEventListener('click', () => {
    if (comm.isDemoMode) {
      comm.disconnectAll();
      appendLog('Modo Demonstração desativado.', 'info');
    } else {
      comm.enableDemoMode();
    }
  });

  // Controle de Voz
  btnVoice.addEventListener('click', () => {
    voice.toggle();
  });

  voice.onStatusChange((status, message) => {
    if (status === 'listening') {
      btnVoice.classList.add('listening');
      voiceBtnText.textContent = 'Ouvindo...';
    } else {
      btnVoice.classList.remove('listening');
      voiceBtnText.textContent = 'Comando de Voz';
    }
    voiceStatus.textContent = message;
  });

  // RESPOSTA IMEDIATA AO COMANDO DE VOZ
  voice.onCommand((cmdResult) => {
    const isDesligar = cmdResult.command === 'POWER_OFF' ||
                       cmdResult.action === 'POWER_OFF' ||
                       cmdResult.value === false;

    const isPowerOn = !isDesligar;

    voiceTranscript.textContent = `Reconhecido: "${cmdResult.raw}" ➔ ${isPowerOn ? 'LIGADO' : 'DESLIGADO'}`;
    appendLog(`Voz: ${isPowerOn ? 'LIGAR MOTOR' : 'DESLIGAR MOTOR'}`, isPowerOn ? 'success' : 'warn');

    applyMotorPower(isPowerOn);
  });

  appendLog('Painel Carrossel MAKER pronto! Use "Conectar BLE" ou "Conectar Wi-Fi".', 'info');
  appendLog('Segurança: Motor inicia desligado por padrão.', 'info');

  if (comm.isCloudConfigured()) {
    comm.connectCloud();
  }
});
