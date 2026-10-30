/**
 * ==========================================================================
 * CARROSSEL INTELIGENTE MAKER - CONTROLE, NAVEGAÇÃO & GERADOR NO-CODE (app.js)
 * ==========================================================================
 * - Orquestra eventos de tela e navegação por abas (Controle, Esquema, Config)
 * - Integração de voz e comunicação Wi-Fi / BLE com ESP32
 * - Seletor de modo de alimentação (Pilhas/Bateria vs Fonte) com conselhos técnicos
 * - Gerador No-Code de sketch C++ completo para Arduino IDE com 1 clique
 */

document.addEventListener('DOMContentLoaded', () => {
  const comm = window.carouselComm;
  const voice = window.carouselVoice;

  // ========================================================================
  // NAVEGAÇÃO ENTRE ABAS (TABS)
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
  // SELETOR INTERATIVO DE ALIMENTAÇÃO (PILHAS/BATERIA vs FONTE)
  // ========================================================================
  const powerAdvice = document.getElementById('power-advice');
  const powerButtons = document.querySelectorAll('.btn-power-opt');

  const powerAdvices = {
    battery: `
      <strong>💡 Dicas Críticas para Alimentação por Pilhas ou Baterias:</strong><br>
      • <strong>Melhor Opção (Bateria Recarregável):</strong> Utilize <strong>2 Baterias 18650 Li-Ion (7.4V)</strong> ligadas a um módulo regulador Step-Down LM2596 regulado em 5.0V. Isso garante alta corrente e longa duração sem quedas bruscas.<br>
      • <strong>Opção Power Bank USB:</strong> Um Power Bank de 5V com saída mínima de 2.4A pode alimentar o ESP32 e o motor se este for de 5V.<br>
      • <strong>Cuidado com Pilhas AA Comuns:</strong> 4 pilhas AA alcalinas fornecem ~6V, mas perdem tensão rapidamente com o consumo contínuo do motor e Wi-Fi.<br>
      • ⚠️ <strong>NUNCA utilize bateria de 9V (a quadradinha):</strong> Ela possui resistência interna muito alta e descarrega em menos de 5 minutos com motores elétricos!
    `,
    powersupply: `
      <strong>🔌 Dicas para Alimentação por Fonte de Tomada (Recomendado para Feiras / Testes):</strong><br>
      • <strong>Fonte 5V / 3A a 4A:</strong> Ideal se o seu motor e pisca-pisca forem de 5V (USB). Alimenta o pino VIN do ESP32, o DFPlayer e o motor de forma estável e contínua.<br>
      • <strong>Fonte 12V / 3A:</strong> Ideal se o seu motor for de 12V. O 12V vai direto para o borne VM do driver de motor, e um módulo Step-Down abaixa para 5.0V para alimentar o ESP32 e o som.<br>
      • <strong>Aviso de Segurança:</strong> Fontes chaveadas devem possuir selo INMETRO e gabinete isolado para garantir segurança total com crianças.
    `
  };

  function updatePowerAdvice(mode) {
    if (powerAdvice && powerAdvices[mode]) {
      powerAdvice.innerHTML = powerAdvices[mode];
    }
  }

  powerButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      powerButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.getAttribute('data-power');
      updatePowerAdvice(mode);
    });
  });

  // Inicializa com o conselho padrão
  updatePowerAdvice('battery');

  // ========================================================================
  // GERADOR DE CÓDIGO NO-CODE PARA ESP32 / ARDUINO IDE
  // ========================================================================
  const btnGenerateCode = document.getElementById('btn-generate-code');
  const btnCopyCode = document.getElementById('btn-copy-code');
  const codeBox = document.getElementById('generated-code-box');
  const copyStatus = document.getElementById('copy-status');

  function generateEsp32Sketch() {
    const ssid = document.getElementById('cfg-wifi-ssid').value.trim() || 'Carrossel_Maker_ESP32';
    const pass = document.getElementById('cfg-wifi-pass').value.trim() || 'carrossel123';
    const bleName = document.getElementById('cfg-ble-name').value.trim() || 'Carrossel_Maker_BLE';
    const speed = document.getElementById('cfg-motor-speed').value;
    const rampMode = document.getElementById('cfg-ramp-speed').value;
    const volume = document.getElementById('cfg-audio-vol').value || 22;
    const lightType = document.getElementById('cfg-light-type').value;
    const watchdogTimeout = document.getElementById('cfg-watchdog').value || 8000;

    let rampStep = 5;
    let rampInterval = 20;
    if (rampMode === 'slow') {
      rampStep = 2;
      rampInterval = 25;
    } else if (rampMode === 'fast') {
      rampStep = 10;
      rampInterval = 15;
    }

    const sketch = `/*
 * ==============================================================================
 * PROJETO: CARROSSEL INTELIGENTE MAKER - SKETCH COMPLETO PARA ARDUINO IDE
 * Gerado automaticamente pela interface Web No-Code do Carrossel MAKER
 * Placa: ESP32 Dev Module (ESP32 Convencional)
 * ==============================================================================
 * BIBLIOTECAS NECESSÁRIAS (Instalar via Gerenciador de Bibliotecas da Arduino IDE):
 * 1. "ArduinoJson" (por Benoit Blanchon - versão 6.x)
 * 2. "WebSockets" (por Markus Sattler - versão 2.4.x)
 * ==============================================================================
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>
#include <HardwareSerial.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// --- PINAGEM DO HARDWARE ---
#define PIN_MOTOR_IN1      25
#define PIN_MOTOR_IN2      26
#define PIN_MOTOR_PWM      27
#define PIN_AUDIO_TX       17
#define PIN_AUDIO_RX       16
#define PIN_LIGHT_CTRL     33
#define PIN_EMERGENCY_BTN  14

// --- PARÂMETROS CONFIGURADOS NO SITE ---
const char* WIFI_SSID = "${ssid}";
const char* WIFI_PASS = "${pass}";
const char* BLE_NAME  = "${bleName}";
const uint8_t MAX_SPEED = ${speed};
const uint8_t RAMP_STEP = ${rampStep};
const unsigned long RAMP_INTERVAL = ${rampInterval};
const uint8_t INITIAL_VOLUME = ${volume};
const unsigned long WATCHDOG_TIMEOUT = ${watchdogTimeout};

// --- SERVIÇO BLE (UUIDs Padronizados) ---
#define BLE_SERVICE_UUID    "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define BLE_CHAR_CMD_UUID   "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define BLE_CHAR_STATE_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a9"

// --- OBJETOS DE HARDWARE E REDE ---
WebServer server(80);
WebSocketsServer ws(81);
HardwareSerial mp3Serial(2);

BLEServer* pBleServer = nullptr;
BLECharacteristic* pBleCmdChar = nullptr;
BLECharacteristic* pBleStateChar = nullptr;
bool bleConnected = false;

// --- ESTADO DO HARDWARE ---
bool statePower = false;
bool stateMotor = false;
bool stateAudio = false;
bool stateLight = false;
uint8_t currentSpeed = 0;
uint8_t targetSpeed = 0;
bool targetActive = false;
unsigned long lastRampTime = 0;
unsigned long lastCommActivity = 0;

// --- DECLARAÇÕES DE FUNÇÃO ---
void sendMp3Command(uint8_t cmd, uint16_t arg);
void broadcastState();
void processJsonCommand(const char* json);
void emergencyStop(const char* reason);

// --- CALLBACKS BLE ---
class ServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) { bleConnected = true; lastCommActivity = millis(); }
    void onDisconnect(BLEServer* pServer) { bleConnected = false; pServer->startAdvertising(); }
};

class CmdCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
        std::string rx = pCharacteristic->getValue();
        if (rx.length() > 0) {
            lastCommActivity = millis();
            processJsonCommand(rx.c_str());
        }
    }
};

void setup() {
  Serial.begin(115200);
  delay(300);

  // 1. Configura pinos e garante estado 100% desligado (Segurança Infantil)
  pinMode(PIN_MOTOR_IN1, OUTPUT);
  pinMode(PIN_MOTOR_IN2, OUTPUT);
  pinMode(PIN_MOTOR_PWM, OUTPUT);
  pinMode(PIN_LIGHT_CTRL, OUTPUT);
  pinMode(PIN_EMERGENCY_BTN, INPUT_PULLUP);

  digitalWrite(PIN_MOTOR_IN1, LOW);
  digitalWrite(PIN_MOTOR_IN2, LOW);
  digitalWrite(PIN_LIGHT_CTRL, LOW);

  ledcSetup(0, 20000, 8); // PWM 20kHz, 8 bits no canal 0
  ledcAttachPin(PIN_MOTOR_PWM, 0);
  ledcWrite(0, 0);

  // 2. Inicializa DFPlayer Mini
  mp3Serial.begin(9600, SERIAL_8N1, PIN_AUDIO_RX, PIN_AUDIO_TX);
  delay(100);
  sendMp3Command(0x06, INITIAL_VOLUME); // Ajusta volume
  delay(50);
  sendMp3Command(0x16, 0); // Stop áudio

  // 3. Inicia Wi-Fi Access Point
  WiFi.mode(WIFI_AP);
  WiFi.softAP(WIFI_SSID, WIFI_PASS);
  Serial.print("Wi-Fi AP Ativo: "); Serial.println(WIFI_SSID);
  Serial.print("IP ESP32: "); Serial.println(WiFi.softAPIP());

  // 4. Inicia Servidor Web e WebSocket
  server.enableCORS(true);
  server.on("/api/ping", HTTP_GET, []() { lastCommActivity = millis(); server.send(200, "application/json", "{\\"status\\":\\"ok\\"}"); });
  server.begin();

  ws.begin();
  ws.onEvent([](uint8_t num, WStype_t type, uint8_t *payload, size_t len) {
    if (type == WStype_CONNECTED) {
      lastCommActivity = millis();
      broadcastState();
    } else if (type == WStype_TEXT) {
      lastCommActivity = millis();
      processJsonCommand((char*)payload);
    }
  });

  // 5. Inicia Bluetooth BLE
  BLEDevice::init(BLE_NAME);
  pBleServer = BLEDevice::createServer();
  pBleServer->setCallbacks(new ServerCallbacks());
  BLEService *pService = pBleServer->createService(BLE_SERVICE_UUID);

  pBleCmdChar = pService->createCharacteristic(BLE_CHAR_CMD_UUID, BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR);
  pBleCmdChar->setCallbacks(new CmdCallbacks());

  pBleStateChar = pService->createCharacteristic(BLE_CHAR_STATE_UUID, BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  pBleStateChar->addDescriptor(new BLE2902());

  pService->start();
  BLEAdvertising *pAdv = BLEDevice::getAdvertising();
  pAdv->addServiceUUID(BLE_SERVICE_UUID);
  pAdv->setScanResponse(true);
  BLEDevice::startAdvertising();

  lastCommActivity = millis();
  Serial.println("Carrossel MAKER pronto! Saidas desligadas por padrao.");
}

void loop() {
  unsigned long now = millis();

  // Rampa de Aceleração do Motor
  if (now - lastRampTime >= RAMP_INTERVAL) {
    lastRampTime = now;
    if (targetActive) {
      if (currentSpeed < targetSpeed) {
        currentSpeed = (currentSpeed + RAMP_STEP >= targetSpeed) ? targetSpeed : currentSpeed + RAMP_STEP;
        digitalWrite(PIN_MOTOR_IN1, HIGH);
        digitalWrite(PIN_MOTOR_IN2, LOW);
        ledcWrite(0, currentSpeed);
      }
    } else {
      if (currentSpeed > 0) {
        currentSpeed = (currentSpeed <= RAMP_STEP) ? 0 : currentSpeed - RAMP_STEP;
        ledcWrite(0, currentSpeed);
        if (currentSpeed == 0) {
          digitalWrite(PIN_MOTOR_IN1, LOW);
          digitalWrite(PIN_MOTOR_IN2, LOW);
        }
      }
    }
  }

  // Loops de Rede
  server.handleClient();
  ws.loop();

  // Botão Físico de Emergência
  if (digitalRead(PIN_EMERGENCY_BTN) == LOW) {
    if (statePower) emergencyStop("Botao fisico pressionado");
  }

  // Watchdog de Perda de Comunicação
  if (statePower && (now - lastCommActivity > WATCHDOG_TIMEOUT)) {
    emergencyStop("Timeout de comunicacao (celular desconectado)");
  }

  delay(4);
}

void processJsonCommand(const char* json) {
  StaticJsonDocument<256> doc;
  if (deserializeJson(doc, json)) return;
  const char* cmd = doc["cmd"];
  if (!cmd) return;
  bool val = doc["value"] | false;

  if (strcmp(cmd, "POWER") == 0) {
    statePower = val;
    stateMotor = val;
    stateAudio = val;
    stateLight = val;
    targetActive = val;
    targetSpeed = val ? MAX_SPEED : 0;
    if (val) {
      sendMp3Command(0x0D, 0); // Play
      digitalWrite(PIN_LIGHT_CTRL, HIGH);
    } else {
      sendMp3Command(0x16, 0); // Stop
      digitalWrite(PIN_LIGHT_CTRL, LOW);
    }
  } else if (strcmp(cmd, "MOTOR") == 0) {
    stateMotor = val;
    targetActive = val;
    targetSpeed = val ? MAX_SPEED : 0;
    statePower = stateMotor || stateAudio || stateLight;
  } else if (strcmp(cmd, "AUDIO") == 0) {
    stateAudio = val;
    if (val) sendMp3Command(0x0D, 0); else sendMp3Command(0x16, 0);
    statePower = stateMotor || stateAudio || stateLight;
  } else if (strcmp(cmd, "LIGHT") == 0) {
    stateLight = val;
    digitalWrite(PIN_LIGHT_CTRL, val ? HIGH : LOW);
    statePower = stateMotor || stateAudio || stateLight;
  } else if (strcmp(cmd, "GET_STATE") == 0) {
    broadcastState();
    return;
  }
  broadcastState();
}

void emergencyStop(const char* reason) {
  Serial.printf("[SEGURANCA] %s! Parando carrossel.\\n", reason);
  statePower = false;
  stateMotor = false;
  stateAudio = false;
  stateLight = false;
  targetActive = false;
  targetSpeed = 0;
  currentSpeed = 0;
  ledcWrite(0, 0);
  digitalWrite(PIN_MOTOR_IN1, LOW);
  digitalWrite(PIN_MOTOR_IN2, LOW);
  digitalWrite(PIN_LIGHT_CTRL, LOW);
  sendMp3Command(0x16, 0);
  broadcastState();
}

void broadcastState() {
  StaticJsonDocument<256> doc;
  doc["type"] = "state";
  JsonObject p = doc.createNestedObject("payload");
  p["power"] = statePower;
  p["motor"] = stateMotor;
  p["speed"] = currentSpeed;
  p["audio"] = stateAudio;
  p["light"] = stateLight;
  p["uptime"] = millis() / 1000;
  String out;
  serializeJson(doc, out);

  ws.broadcastTXT(out);
  if (bleConnected && pBleStateChar) {
    pBleStateChar->setValue((uint8_t*)out.c_str(), out.length());
    pBleStateChar->notify();
  }
}

void sendMp3Command(uint8_t cmd, uint16_t arg) {
  uint8_t f[10] = {0x7E, 0xFF, 0x06, cmd, 0x00, (uint8_t)(arg >> 8), (uint8_t)(arg & 0xFF), 0x00, 0x00, 0xEF};
  uint16_t sum = 0;
  for (int i = 1; i < 7; i++) sum += f[i];
  uint16_t cs = -sum;
  f[7] = (uint8_t)(cs >> 8);
  f[8] = (uint8_t)(cs & 0xFF);
  mp3Serial.write(f, 10);
  mp3Serial.flush();
}
`;
    codeBox.value = sketch;
  }

  btnGenerateCode.addEventListener('click', () => {
    generateEsp32Sketch();
    copyStatus.textContent = 'Código gerado com sucesso!';
    setTimeout(() => { copyStatus.textContent = ''; }, 3000);
  });

  btnCopyCode.addEventListener('click', () => {
    if (!codeBox.value) {
      generateEsp32Sketch();
    }
    navigator.clipboard.writeText(codeBox.value).then(() => {
      copyStatus.textContent = '✅ Copiado para a área de transferência!';
      setTimeout(() => { copyStatus.textContent = ''; }, 4000);
    }).catch(err => {
      copyStatus.textContent = 'Selecione e copie o texto manualmente.';
    });
  });

  // Gera código inicial automaticamente
  generateEsp32Sketch();

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

  const badgeAudio = document.getElementById('badge-audio');
  const realAudio = document.getElementById('real-audio');
  const btnToggleAudio = document.getElementById('btn-toggle-audio');

  const badgeLight = document.getElementById('badge-light');
  const realLight = document.getElementById('real-light');
  const btnToggleLight = document.getElementById('btn-toggle-light');

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
    eventLog.appendChild(entry);
    eventLog.scrollTop = eventLog.scrollHeight;
  }

  comm.onLog((msg, type) => appendLog(msg, type));
  btnClearLog.addEventListener('click', () => {
    eventLog.innerHTML = '';
    appendLog('Console de diagnóstico limpo.', 'info');
  });

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
      connFeedback.textContent = `Conectado via Wi-Fi ao ESP32 (${inputIp.value}).`;
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

  comm.onStateUpdate((state) => {
    const isMasterOn = !!state.power;
    if (isMasterOn) {
      btnMaster.className = 'master-button master-on';
      masterTitle.textContent = 'DESLIGAR';
      masterSub.textContent = 'Toque para parar tudo';
    } else {
      btnMaster.className = 'master-button master-off';
      masterTitle.textContent = 'LIGAR TUDO';
      masterSub.textContent = 'Toque para acionar';
    }

    if (state.motor) {
      badgeMotor.className = 'comp-state-badge badge-on';
      badgeMotor.textContent = 'EM ROTAÇÃO';
      realMotor.textContent = `LIGADO (PWM: ${state.motorSpeed || 255})`;
      btnToggleMotor.className = 'btn-toggle btn-toggle-on';
      btnToggleMotor.textContent = 'Parar Motor';
    } else {
      badgeMotor.className = 'comp-state-badge badge-off';
      badgeMotor.textContent = 'PARADO';
      realMotor.textContent = 'DESLIGADO (0%)';
      btnToggleMotor.className = 'btn-toggle btn-toggle-off';
      btnToggleMotor.textContent = 'Ligar Motor';
    }

    if (state.audio) {
      badgeAudio.className = 'comp-state-badge badge-on';
      badgeAudio.textContent = 'TOCANDO';
      realAudio.textContent = 'REPRODUZINDO MÚSICA';
      btnToggleAudio.className = 'btn-toggle btn-toggle-on';
      btnToggleAudio.textContent = 'Pausar Música';
    } else {
      badgeAudio.className = 'comp-state-badge badge-off';
      badgeAudio.textContent = 'MUDO';
      realAudio.textContent = 'DESLIGADO';
      btnToggleAudio.className = 'btn-toggle btn-toggle-off';
      btnToggleAudio.textContent = 'Ligar Música';
    }

    if (state.light) {
      badgeLight.className = 'comp-state-badge badge-on';
      badgeLight.textContent = 'ACESO';
      realLight.textContent = 'CIRCUITO LIGADO';
      btnToggleLight.className = 'btn-toggle btn-toggle-on';
      btnToggleLight.textContent = 'Apagar Iluminação';
    } else {
      badgeLight.className = 'comp-state-badge badge-off';
      badgeLight.textContent = 'APAGADO';
      realLight.textContent = 'DESLIGADO';
      btnToggleLight.className = 'btn-toggle btn-toggle-off';
      btnToggleLight.textContent = 'Ligar Iluminação';
    }
  });

  btnMaster.addEventListener('click', async () => {
    const willTurnOn = !comm.hardwareState.power;
    appendLog(`Acionando botão mestre -> ${willTurnOn ? 'LIGAR GERAL' : 'DESLIGAR GERAL'}`, 'info');
    await comm.sendMasterPower(willTurnOn);
  });

  btnToggleMotor.addEventListener('click', async () => {
    await comm.sendMotor(!comm.hardwareState.motor);
  });

  btnToggleAudio.addEventListener('click', async () => {
    await comm.sendAudio(!comm.hardwareState.audio);
  });

  btnToggleLight.addEventListener('click', async () => {
    await comm.sendLight(!comm.hardwareState.light);
  });

  btnConnectWifi.addEventListener('click', async () => {
    const ip = inputIp.value.trim() || '192.168.4.1';
    connFeedback.textContent = `Conectando Wi-Fi em ${ip}...`;
    await comm.connectWifi(ip);
  });

  btnConnectBle.addEventListener('click', async () => {
    connFeedback.textContent = 'Abrindo pareamento Bluetooth BLE...';
    await comm.connectBLE();
  });

  btnToggleDemo.addEventListener('click', () => {
    if (comm.isDemoMode) {
      comm.disconnectAll();
      appendLog('Modo Demonstração desativado.', 'info');
    } else {
      comm.enableDemoMode();
    }
  });

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

  voice.onCommand(async (cmdResult) => {
    const isPowerOn = !!cmdResult.value;
    voiceTranscript.textContent = `Reconhecido: "${cmdResult.raw}" -> ${isPowerOn ? 'LIGADO' : 'DESLIGADO'}`;
    appendLog(`Comando de Voz: ${isPowerOn ? 'LIGAR TUDO' : 'DESLIGAR TUDO'}`, 'success');

    // 1. Resposta visual INSTANTÂNEA na tela (Zero delay para o usuário)
    comm.hardwareState.power = isPowerOn;
    comm.hardwareState.motor = isPowerOn;
    comm.hardwareState.audio = isPowerOn;
    comm.hardwareState.light = isPowerOn;
    comm.hardwareState.motorSpeed = isPowerOn ? 255 : 0;
    comm.notifyState();

    // 2. Transmissão imediata para o ESP32 (Wi-Fi ou BLE)
    await comm.sendMasterPower(isPowerOn);
  });

  appendLog('Painel de Controle Carrossel MAKER inicializado.', 'info');
  appendLog('Segurança infantil: Saídas desligadas. Pronto para pareamento.', 'info');
});
