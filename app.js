/**
 * ==========================================================================
 * CARROSSEL INTELIGENTE MAKER - CONTROLE DO MOTOR & GUIAS (app.js v4.0)
 * ==========================================================================
 * Versão simplificada focada exclusivamente no MOTOR do carrossel.
 * - Controle Mestre do Motor com rampa e freio
 * - Comando de Voz instantâneo (Ligar / Desligar)
 * - Slider e presets de velocidade do motor (50%, 85%, 100%)
 * - Navegação de 5 abas (Controle, Esquemas, Gravar ESP32, Conectar, Código)
 * - Gerador de código em 1 clique para Arduino IDE
 */

document.addEventListener('DOMContentLoaded', () => {
  const comm = window.carouselComm;
  const voice = window.carouselVoice;

  // Estado local do motor
  let motorSpeedPercent = 85;

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
  // CONTROLE DE VELOCIDADE DO MOTOR
  // ========================================================================
  const speedSlider = document.getElementById('motor-speed-slider');
  const speedDisplay = document.getElementById('speed-display');
  const presetButtons = document.querySelectorAll('.btn-preset');

  function updateMotorSpeed(newVal) {
    motorSpeedPercent = parseInt(newVal, 10);
    if (speedSlider) speedSlider.value = motorSpeedPercent;
    if (speedDisplay) speedDisplay.textContent = `${motorSpeedPercent}%`;

    presetButtons.forEach(btn => {
      const pVal = parseInt(btn.getAttribute('data-speed'), 10);
      btn.classList.toggle('active', pVal === motorSpeedPercent);
    });

    // Se o motor estiver ligado, atualiza a velocidade em tempo real
    if (comm.hardwareState.power) {
      const pwmValue = Math.round((motorSpeedPercent / 100) * 255);
      comm.hardwareState.motorSpeed = pwmValue;
      comm.sendMotor(true, pwmValue);
      realMotor.textContent = `LIGADO (${motorSpeedPercent}%)`;
    }
  }

  if (speedSlider) {
    speedSlider.addEventListener('input', (e) => {
      updateMotorSpeed(e.target.value);
    });
  }

  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      updateMotorSpeed(btn.getAttribute('data-speed'));
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
 * PROJETO: CARROSSEL INTELIGENTE MAKER - CONTROLE DO MOTOR
 * Placa: ESP32 Dev Module (ESP32 Convencional 38 pinos)
 * ==============================================================================
 * BIBLIOTECAS NECESSÁRIAS (Instalar via Ferramentas -> Gerenciar Bibliotecas):
 * 1. "ArduinoJson" (por Benoit Blanchon - versão 6.x)
 * 2. "WebSockets" (por Markus Sattler - versão 2.4.x)
 * ==============================================================================
 * PINOS DE LIGAÇÃO:
 * - Pino GPIO 25: Sinal de controle do Motor (IN do Relé ou Gate do Transistor)
 * - Pino GPIO 27: Sinal PWM de velocidade (opcional se usar driver)
 * - Pino GND: Conectar no GND do Relé/Bateria
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

// --- PINOS ---
#define PIN_MOTOR_CTRL   25    // Liga/Desliga no Relé ou Transistor
#define PIN_MOTOR_PWM    27    // PWM de velocidade

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

// Estado do Motor
bool motorState = false;
uint8_t currentSpeed = 0;
uint8_t targetSpeed = 0;
unsigned long lastRampTime = 0;
unsigned long lastCommActivity = 0;
const unsigned long WATCHDOG_TIMEOUT = 10000; // 10s de segurança sem celular

void broadcastState();
void processCommand(const char* json);
void setMotorPower(bool on, uint8_t speed = 255);

// Callbacks Bluetooth BLE
class ServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) { bleConnected = true; lastCommActivity = millis(); }
    void onDisconnect(BLEServer* pServer) { bleConnected = false; pServer->startAdvertising(); }
};

class CmdCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
        std::string rx = pCharacteristic->getValue();
        if (rx.length() > 0) {
            lastCommActivity = millis();
            processCommand(rx.c_str());
        }
    }
};

void setup() {
  Serial.begin(115200);
  delay(300);

  // 1. Configura pinos de saída (GARANTE QUE COMEÇA DESLIGADO)
  pinMode(PIN_MOTOR_CTRL, OUTPUT);
  pinMode(PIN_MOTOR_PWM, OUTPUT);
  digitalWrite(PIN_MOTOR_CTRL, LOW);

  // Configura PWM de 20kHz (sem zumbido)
  ledcSetup(0, 20000, 8);
  ledcAttachPin(PIN_MOTOR_PWM, 0);
  ledcWrite(0, 0);

  // 2. Inicia Wi-Fi em modo Ponto de Acesso (AP)
  WiFi.mode(WIFI_AP);
  WiFi.softAP(WIFI_SSID, WIFI_PASS);
  Serial.println("\n[Wi-Fi] Rede criada: Carrossel_Maker_ESP32 (senha: carrossel123)");
  Serial.print("[Wi-Fi] IP do ESP32: "); Serial.println(WiFi.softAPIP());

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
      lastCommActivity = millis();
      broadcastState();
    } else if (type == WStype_TEXT) {
      lastCommActivity = millis();
      processCommand((char*)payload);
    }
  });

  // 4. Inicia Bluetooth BLE
  BLEDevice::init(BLE_NAME);
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
      if (currentSpeed < targetSpeed) {
        currentSpeed = (currentSpeed + 5 >= targetSpeed) ? targetSpeed : currentSpeed + 5;
        digitalWrite(PIN_MOTOR_CTRL, HIGH);
        ledcWrite(0, currentSpeed);
      }
    } else {
      if (currentSpeed > 0) {
        currentSpeed = (currentSpeed <= 10) ? 0 : currentSpeed - 10;
        ledcWrite(0, currentSpeed);
        if (currentSpeed == 0) {
          digitalWrite(PIN_MOTOR_CTRL, LOW);
        }
      }
    }
  }

  server.handleClient();
  ws.loop();

  // Watchdog de segurança: se passar 10s sem sinal e o motor estiver rodando, para sozinho
  if (motorState && (now - lastCommActivity > WATCHDOG_TIMEOUT)) {
    Serial.println("[SEGURANCA] Celular desconectado! Parando motor.");
    setMotorPower(false);
  }

  delay(4);
}

void setMotorPower(bool on, uint8_t speed) {
  motorState = on;
  targetSpeed = on ? speed : 0;
  if (!on) {
    targetSpeed = 0;
    currentSpeed = 0;
    digitalWrite(PIN_MOTOR_CTRL, LOW);
    ledcWrite(0, 0);
  }
  broadcastState();
}

void processCommand(const char* json) {
  StaticJsonDocument<256> doc;
  if (deserializeJson(doc, json)) return;
  const char* cmd = doc["cmd"];
  if (!cmd) return;
  bool val = doc["value"] | false;
  uint8_t spd = doc["speed"] | 220;

  if (strcmp(cmd, "POWER") == 0 || strcmp(cmd, "MOTOR") == 0) {
    setMotorPower(val, spd);
  } else if (strcmp(cmd, "GET_STATE") == 0) {
    broadcastState();
  }
}

void broadcastState() {
  StaticJsonDocument<256> doc;
  doc["type"] = "state";
  JsonObject p = doc.createNestedObject("payload");
  p["power"] = motorState;
  p["motor"] = motorState;
  p["speed"] = currentSpeed;
  p["uptime"] = millis() / 1000;
  String out;
  serializeJson(doc, out);

  ws.broadcastTXT(out);
  if (bleConnected && pBleStateChar) {
    pBleStateChar->setValue((uint8_t*)out.c_str(), out.length());
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
      connFeedback.textContent = 'Desconectado do ESP32. Escolha Wi-Fi, BLE ou Modo Demo.';
    }
  });

  // ========================================================================
  // FUNÇÃO MESTRE UNIVERSAL: LIGAR / DESLIGAR O MOTOR NA HORA (CLIQUE E VOZ)
  // ========================================================================
  function applyMotorPower(turnOn) {
    appendLog(`Comando: ${turnOn ? 'LIGAR MOTOR' : 'PARAR MOTOR'}`, turnOn ? 'success' : 'warn');

    const targetPwm = Math.round((motorSpeedPercent / 100) * 255);

    // 1. Atualiza variáveis internas imediatamente
    comm.hardwareState.power = turnOn;
    comm.hardwareState.motor = turnOn;
    comm.hardwareState.motorSpeed = turnOn ? targetPwm : 0;

    // 2. Manipula o DOM DIRETAMENTE no mesmo milissegundo (Zero Delay)
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

    // 3. Notifica ouvintes e despacha via Wi-Fi/BLE se conectado
    comm.notifyState();
    comm.sendMotor(turnOn, targetPwm).then((ok) => {
      if (!ok) {
        // Não enviou: volta a tela para o estado anterior (não finge que funcionou)
        comm.hardwareState.power = !turnOn;
        comm.hardwareState.motor = !turnOn;
        comm.hardwareState.motorSpeed = !turnOn ? targetPwm : 0;
        comm.notifyState();
        appendLog('Comando não enviado: ESP32 sem conexão.', 'error');
      }
    });
  }

  // Exportação global direta para ser acionada instantaneamente pelo voice.js
  window.carouselApplyPower = applyMotorPower;

  comm.onStateUpdate((state) => {
    // Sincroniza caso venha telemetria externa do ESP32 físico
    if (state.motor || state.power) {
      btnMaster.className = 'master-button master-on';
      masterTitle.textContent = 'DESLIGAR';
      masterSub.textContent = 'Toque para parar';
      badgeMotor.className = 'comp-state-badge badge-on';
      badgeMotor.textContent = 'EM ROTAÇÃO';
      realMotor.textContent = `LIGADO (${Math.round(((state.motorSpeed || 220) / 255) * 100)}%)`;
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
    // Em página HTTPS o navegador bloqueia ws:// para IP local: usa a nuvem (vale também para 5G)
    if (location.protocol === 'https:') {
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

    // Executa a ação do motor NA HORA (Zero delay)
    applyMotorPower(isPowerOn);
  });

  appendLog('Painel Carrossel MAKER (Motor Simples) pronto!', 'info');
  appendLog('Segurança: Motor inicia desligado por padrão.', 'info');

  // Conecta sozinho na nuvem ao abrir o site (celular em 5G ou Wi-Fi)
  comm.connectCloud();
});
