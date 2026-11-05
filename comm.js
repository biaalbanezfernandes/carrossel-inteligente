/**
 * ==========================================================================
 * CARROSSEL INTELIGENTE MAKER - CAMADA DE COMUNICAÇÃO UNIFICADA (comm.js)
 * ==========================================================================
 * Suporta:
 * 1. Wi-Fi: WebSocket bidirecional em tempo real + fallback HTTP REST
 * 2. Bluetooth BLE: Web Bluetooth API com GATT customizado (Command + Notify)
 *    - Fila serializada de escrita GATT (evita "GATT operation already in progress")
 *    - Payloads enxutos compatíveis com MTU BLE e ArduinoJson
 *    - Keepalive automático (evita que o Watchdog de 10s do ESP32 desligue o motor)
 * 3. Modo Demonstração transparente e explicitamente identificado
 */

// UUIDs customizados padrão para o serviço BLE do Carrossel ESP32
const BLE_CONFIG = {
  SERVICE_UUID: '4fafc201-1fb5-459e-8fcc-c5c9c331914b',
  CHAR_CMD_UUID: 'beb5483e-36e1-4688-b7f5-ea07361b26a8',    // Write / Write Without Response
  CHAR_STATE_UUID: 'beb5483e-36e1-4688-b7f5-ea07361b26a9'  // Notify / Read
};

// Configuração da nuvem (broker MQTT com WebSocket seguro) - permite controlar por 5G.
const CLOUD_CONFIG = {
  HOST: 'SEU-CLUSTER.s1.eu.hivemq.cloud',
  PORT: 8884,
  PATH: '/mqtt',
  USER: 'SEU_USUARIO_SITE',
  PASS: 'SUA_SENHA_SITE',
  TOPIC_CMD: 'carrossel/maker/cmd',
  TOPIC_STATE: 'carrossel/maker/state',
  LIB_URL: 'https://cdn.jsdelivr.net/npm/mqtt@5.10.1/dist/mqtt.min.js',
  PING_MS: 3000,
  CONFIRM_MS: 4000
};

class CarouselCommManager {
  constructor() {
    this.activeChannel = 'none'; // 'wifi' | 'ble' | 'demo' | 'none'
    this.isDemoMode = false;

    // Estado real sincronizado com o ESP32
    this.hardwareState = {
      power: false,
      motor: false,
      audio: false,
      light: false,
      motorSpeed: 0,
      uptime: 0,
      failsafe: false
    };

    // Callbacks de eventos
    this.stateListeners = [];
    this.statusListeners = [];
    this.logListeners = [];

    // Referências Wi-Fi / WebSocket
    this.ws = null;
    this.espIp = '192.168.4.1';
    this.wsPort = 81;
    this.reconnectTimer = null;
    this.keepAliveTimer = null;

    // Referências Nuvem (MQTT)
    this.mqttClient = null;
    this.cloudPingTimer = null;
    this.confirmTimer = null;

    // Referências BLE
    this.bleDevice = null;
    this.bleServer = null;
    this.cmdChar = null;
    this.stateChar = null;
    this.bleWriteChain = Promise.resolve();
  }

  onStateUpdate(callback) {
    this.stateListeners.push(callback);
  }

  onConnectivityChange(callback) {
    this.statusListeners.push(callback);
  }

  onLog(callback) {
    this.logListeners.push(callback);
  }

  log(message, type = 'info') {
    console.log(`[CarouselComm][${type.toUpperCase()}] ${message}`);
    this.logListeners.forEach(cb => cb(message, type));
  }

  notifyState() {
    this.stateListeners.forEach(cb => cb({ ...this.hardwareState }, this.activeChannel, this.isDemoMode));
  }

  notifyStatus() {
    this.statusListeners.forEach(cb => cb({
      channel: this.activeChannel,
      isDemo: this.isDemoMode,
      isConnected: this.activeChannel !== 'none'
    }));
  }

  isCloudConfigured() {
    return CLOUD_CONFIG.HOST && !CLOUD_CONFIG.HOST.startsWith('SEU-');
  }

  // ========================================================================
  // COMANDOS DE ALTO NÍVEL (Unificados e enxutos para BLE/WS)
  // ========================================================================

  async sendMasterPower(powerOn) {
    const payload = {
      cmd: 'POWER',
      value: !!powerOn
    };
    return this.dispatchCommand(payload, `Comando Mestre: ${powerOn ? 'LIGAR TUDO' : 'DESLIGAR TUDO'}`);
  }

  async sendMotor(on, speed = 220) {
    const payload = {
      cmd: 'MOTOR',
      value: !!on,
      speed: on ? speed : 0
    };
    return this.dispatchCommand(payload, `Motor: ${on ? 'LIGAR' : 'PARAR'} (PWM: ${on ? speed : 0})`);
  }

  async sendAudio(on) {
    const payload = {
      cmd: 'AUDIO',
      value: !!on
    };
    return this.dispatchCommand(payload, `Áudio: ${on ? 'LIGAR' : 'MUDO'}`);
  }

  async sendLight(on) {
    const payload = {
      cmd: 'LIGHT',
      value: !!on
    };
    return this.dispatchCommand(payload, `Pisca-Pisca: ${on ? 'ACENDER' : 'APAGAR'}`);
  }

  async requestStateSync(silent = false) {
    return this.dispatchCommand(
      { cmd: 'GET_STATE' },
      silent ? null : 'Solicitando telemetria do ESP32'
    );
  }

  // ========================================================================
  // FILA SERIALIZADA DE ESCRITA BLE E DESPACHO DE COMANDOS
  // ========================================================================

  enqueueBleWrite(jsonString) {
    const runWrite = async () => {
      if (!this.cmdChar || this.activeChannel !== 'ble') return false;
      const encoder = new TextEncoder();
      const data = encoder.encode(jsonString);

      // Tenta writeValueWithResponse primeiro (negocia pacotes maiores com segurança)
      // e faz fallback para writeValueWithoutResponse / writeValue
      if (typeof this.cmdChar.writeValueWithResponse === 'function') {
        try {
          await this.cmdChar.writeValueWithResponse(data);
          return true;
        } catch (e) {
          if (typeof this.cmdChar.writeValueWithoutResponse === 'function') {
            await this.cmdChar.writeValueWithoutResponse(data);
            return true;
          }
          throw e;
        }
      } else if (typeof this.cmdChar.writeValueWithoutResponse === 'function') {
        await this.cmdChar.writeValueWithoutResponse(data);
        return true;
      } else {
        await this.cmdChar.writeValue(data);
        return true;
      }
    };

    const nextPromise = this.bleWriteChain.then(runWrite, runWrite);
    this.bleWriteChain = nextPromise.catch(() => {});
    return nextPromise;
  }

  async dispatchCommand(payload, description) {
    if (description) {
      this.log(`Enviando -> ${description}`, 'info');
    }

    if (this.isDemoMode) {
      this.simulateDemoCommand(payload);
      return true;
    }

    if (this.activeChannel === 'wifi' && this.mqttClient) {
      if (!this.mqttClient.connected) {
        this.log('Sem conexão com a nuvem. Comando NÃO enviado.', 'error');
        return false;
      }
      this.mqttClient.publish(CLOUD_CONFIG.TOPIC_CMD, JSON.stringify(payload), { qos: 0 });
      if (payload.cmd === 'MOTOR' || payload.cmd === 'POWER') this.waitForConfirm();
      return true;
    }

    if (this.activeChannel === 'wifi' && this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(payload));
        return true;
      } catch (err) {
        this.log(`Erro ao transmitir via WebSocket: ${err.message}`, 'error');
        return false;
      }
    }

    if (this.activeChannel === 'ble' && this.cmdChar) {
      try {
        const jsonStr = JSON.stringify(payload);
        return await this.enqueueBleWrite(jsonStr);
      } catch (err) {
        if (description) {
          this.log(`Erro ao transmitir via BLE: ${err.message}`, 'error');
        }
        return false;
      }
    }

    if (description) {
      this.log('ESP32 não conectado. Conecte via Bluetooth BLE, Wi-Fi ou ative o Modo Demo.', 'error');
    }
    return false;
  }

  // ========================================================================
  // KEEPALIVE (Batimento cardíaco para BLE e Wi-Fi WebSocket)
  // Alimenta o Watchdog de 10s do ESP32 para não desligar o motor sozinho
  // ========================================================================

  startKeepAlive() {
    this.stopKeepAlive();
    this.keepAliveTimer = setInterval(() => {
      if (this.activeChannel === 'ble' && this.cmdChar) {
        this.requestStateSync(true);
      } else if (this.activeChannel === 'wifi' && this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.requestStateSync(true);
      }
    }, 3500);
  }

  stopKeepAlive() {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }

  // ========================================================================
  // IMPLEMENTAÇÃO WI-FI / WEBSOCKET
  // ========================================================================

  async connectWifi(ipAddress) {
    if (ipAddress) this.espIp = ipAddress.trim();
    this.disconnectAll();

    const wsUrl = `ws://${this.espIp}:${this.wsPort}/`;
    this.log(`Tentando conectar ao ESP32 via WebSocket em: ${wsUrl}...`, 'info');

    return new Promise((resolve) => {
      try {
        this.ws = new WebSocket(wsUrl);

        const connectionTimeout = setTimeout(() => {
          if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
            this.log(`Tempo limite esgotado ao conectar ao IP ${this.espIp}. Verifique se está na rede Wi-Fi "Carrossel_Maker_ESP32".`, 'error');
            this.ws.close();
            resolve(false);
          }
        }, 5000);

        this.ws.onopen = () => {
          clearTimeout(connectionTimeout);
          this.activeChannel = 'wifi';
          this.isDemoMode = false;
          this.log(`Conexão Wi-Fi WebSocket estabelecida com sucesso no ESP32 (${this.espIp})!`, 'success');
          this.notifyStatus();
          this.startKeepAlive();
          this.requestStateSync();
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          this.handleIncomingPayload(event.data);
        };

        this.ws.onerror = () => {
          this.log(`Erro na conexão WebSocket Wi-Fi (${this.espIp}). Em HTTPS (Vercel/GitHub), use a conexão Bluetooth BLE.`, 'error');
          resolve(false);
        };

        this.ws.onclose = () => {
          if (this.activeChannel === 'wifi' && !this.mqttClient) {
            this.log('Conexão Wi-Fi perdida ou fechada com o ESP32.', 'warn');
            this.stopKeepAlive();
            this.activeChannel = 'none';
            this.notifyStatus();
          }
        };
      } catch (err) {
        this.log(`Exceção ao criar WebSocket: ${err.message}`, 'error');
        resolve(false);
      }
    });
  }

  // ========================================================================
  // IMPLEMENTAÇÃO NUVEM (MQTT sobre WebSocket seguro)
  // ========================================================================

  loadMqttLib() {
    if (window.mqtt) return Promise.resolve(true);
    return new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = CLOUD_CONFIG.LIB_URL;
      s.onload = () => resolve(!!window.mqtt);
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    });
  }

  async connectCloud() {
    if (!this.isCloudConfigured()) {
      this.log('Nuvem MQTT não configurada. Use "Conectar BLE" para conexão direta via Bluetooth!', 'warn');
      return false;
    }
    this.disconnectAll();
    this.log('Conectando à nuvem (MQTT)...', 'info');

    if (!(await this.loadMqttLib())) {
      this.log('Não foi possível carregar a biblioteca MQTT. Verifique a internet.', 'error');
      return false;
    }

    return new Promise((resolve) => {
      const url = `wss://${CLOUD_CONFIG.HOST}:${CLOUD_CONFIG.PORT}${CLOUD_CONFIG.PATH}`;
      const client = window.mqtt.connect(url, {
        username: CLOUD_CONFIG.USER,
        password: CLOUD_CONFIG.PASS,
        clientId: 'site_' + Math.random().toString(16).slice(2, 10),
        clean: true,
        reconnectPeriod: 3000,
        connectTimeout: 8000
      });
      this.mqttClient = client;
      let settled = false;

      client.on('connect', () => {
        client.subscribe(CLOUD_CONFIG.TOPIC_STATE, { qos: 0 });
        this.activeChannel = 'wifi';
        this.isDemoMode = false;
        this.log('Conectado à nuvem. Aguardando resposta do ESP32...', 'success');
        this.notifyStatus();
        this.startCloudPing();
        this.requestStateSync();
        if (!settled) { settled = true; resolve(true); }
      });

      client.on('message', (topic, message) => {
        this.handleIncomingPayload(message.toString());
      });

      client.on('close', () => {
        if (this.mqttClient === client && this.activeChannel === 'wifi') {
          this.log('Conexão com a nuvem perdida. Tentando reconectar...', 'warn');
          this.activeChannel = 'none';
          this.stopCloudPing();
          this.notifyStatus();
        }
      });

      client.on('error', (err) => {
        this.log(`Erro MQTT: ${err.message}`, 'error');
        if (/not authorized|bad user/i.test(err.message)) client.end(true);
        if (!settled) { settled = true; resolve(false); }
      });
    });
  }

  startCloudPing() {
    this.stopCloudPing();
    this.cloudPingTimer = setInterval(() => {
      if (this.mqttClient && this.mqttClient.connected) {
        this.mqttClient.publish(CLOUD_CONFIG.TOPIC_CMD, JSON.stringify({ cmd: 'PING' }), { qos: 0 });
      }
    }, CLOUD_CONFIG.PING_MS);
  }

  stopCloudPing() {
    if (this.cloudPingTimer) { clearInterval(this.cloudPingTimer); this.cloudPingTimer = null; }
  }

  waitForConfirm() {
    if (this.confirmTimer) clearTimeout(this.confirmTimer);
    this.confirmTimer = setTimeout(() => {
      this.confirmTimer = null;
      this.log('O ESP32 não confirmou o comando. Verifique se ele está ligado e online.', 'error');
    }, CLOUD_CONFIG.CONFIRM_MS);
  }

  // ========================================================================
  // IMPLEMENTAÇÃO BLUETOOTH BLE
  // ========================================================================

  async connectBLE() {
    if (!navigator.bluetooth) {
      this.log('Web Bluetooth não é suportado por este navegador. No iOS utilize Bluefy ou Chrome no Android/PC.', 'error');
      alert('Seu navegador não suporta Web Bluetooth (BLE). Utilize o Google Chrome ou Edge no Android/PC, ou Bluefy no iPhone.');
      return false;
    }

    this.disconnectAll();
    this.log('Abrindo seletor de dispositivos Bluetooth...', 'info');

    try {
      this.bleDevice = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'Carrossel' },
          { services: [BLE_CONFIG.SERVICE_UUID] }
        ],
        optionalServices: [BLE_CONFIG.SERVICE_UUID]
      });

      this.bleDevice.addEventListener('gattserverdisconnected', () => {
        this.log('Dispositivo BLE desconectado pelo hardware ou por perda de sinal.', 'warn');
        this.stopKeepAlive();
        this.activeChannel = 'none';
        this.cmdChar = null;
        this.stateChar = null;
        this.notifyStatus();
      });

      this.log(`Conectando ao GATT Server de "${this.bleDevice.name || 'ESP32'}"...`, 'info');
      this.bleServer = await this.bleDevice.gatt.connect();

      this.log('Obtendo Serviço de Controle do Carrossel...', 'info');
      const service = await this.bleServer.getPrimaryService(BLE_CONFIG.SERVICE_UUID);

      this.log('Configurando características de Comando e Notificação de Estado...', 'info');
      this.cmdChar = await service.getCharacteristic(BLE_CONFIG.CHAR_CMD_UUID);
      this.stateChar = await service.getCharacteristic(BLE_CONFIG.CHAR_STATE_UUID);

      try {
        await this.stateChar.startNotifications();
        this.stateChar.addEventListener('characteristicvaluechanged', (event) => {
          const decoder = new TextDecoder('utf-8');
          const text = decoder.decode(event.target.value);
          this.handleIncomingPayload(text);
        });
      } catch (notifyErr) {
        this.log(`Aviso: notificações BLE opcionais indisponíveis (${notifyErr.message}). Comandos continuam ativos.`, 'warn');
      }

      this.activeChannel = 'ble';
      this.isDemoMode = false;
      this.bleWriteChain = Promise.resolve();
      this.log('Conexão Bluetooth BLE estabelecida e sincronizada com sucesso!', 'success');
      this.notifyStatus();

      // Inicia o batimento cardíaco para manter o Watchdog do ESP32 ativo
      this.startKeepAlive();
      await this.requestStateSync();
      return true;
    } catch (err) {
      this.log(`Falha na conexão BLE: ${err.message}`, 'error');
      this.activeChannel = 'none';
      this.notifyStatus();
      return false;
    }
  }

  // ========================================================================
  // PROCESSAMENTO DE DADOS RECEBIDOS DO HARDWARE REAL
  // ========================================================================

  handleIncomingPayload(rawString) {
    if (!rawString || typeof rawString !== 'string') return;
    const trimmed = rawString.trim();
    if (!trimmed) return;

    try {
      const data = JSON.parse(trimmed);
      if (data.type === 'state' || data.motor !== undefined || data.m !== undefined) {
        const payload = data.payload || data;

        if (this.confirmTimer) { clearTimeout(this.confirmTimer); this.confirmTimer = null; }
        if (payload.online === false) {
          this.log('ESP32 está OFFLINE (sem conexão com a nuvem).', 'warn');
        }

        const prevMotor = this.hardwareState.motor;
        const prevSpeed = this.hardwareState.motorSpeed;

        const isMotorOn = payload.motor !== undefined ? !!payload.motor : !!payload.m;
        const isPowerOn = payload.power !== undefined ? !!payload.power : isMotorOn;
        const rawSpeed = payload.speed !== undefined ? payload.speed : payload.s;

        this.hardwareState.power = isPowerOn;
        this.hardwareState.motor = isMotorOn;
        this.hardwareState.audio = !!payload.audio;
        this.hardwareState.light = !!payload.light;

        if (isMotorOn) {
          // Se o ESP32 acabou de ligar e mandou speed=0 antes da rampa subir, preserva a velocidade alvo na UI
          this.hardwareState.motorSpeed = (rawSpeed && rawSpeed > 0) ? rawSpeed : (this.hardwareState.motorSpeed || 220);
        } else {
          this.hardwareState.motorSpeed = 0;
        }

        this.hardwareState.uptime = payload.uptime || payload.u || 0;
        this.hardwareState.failsafe = !!payload.failsafe;

        if (prevMotor !== this.hardwareState.motor || prevSpeed !== this.hardwareState.motorSpeed) {
          this.log(
            `Telemetria ESP32: [Motor: ${this.hardwareState.motor ? 'LIGADO' : 'PARADO'} | PWM: ${this.hardwareState.motorSpeed}]`,
            'info'
          );
        }
        this.notifyState();
      } else if (data.type === 'ack') {
        this.log(`ESP32 confirmou comando: ${data.msg || 'OK'}`, 'info');
      } else if (data.type === 'error') {
        this.log(`Alerta reportado pelo ESP32: ${data.msg}`, 'warn');
      }
    } catch (e) {
      // Se o pacote BLE de notificação veio truncado (MTU 20 bytes no sketch antigo), extrai o estado sem erro!
      if (trimmed.includes('"motor":true') || trimmed.includes('"power":true')) {
        this.hardwareState.power = true;
        this.hardwareState.motor = true;
        if (!this.hardwareState.motorSpeed) this.hardwareState.motorSpeed = 220;
        this.notifyState();
      } else if (trimmed.includes('"motor":false') || trimmed.includes('"power":false')) {
        this.hardwareState.power = false;
        this.hardwareState.motor = false;
        this.hardwareState.motorSpeed = 0;
        this.notifyState();
      }
    }
  }

  // ========================================================================
  // MODO DEMONSTRAÇÃO (Fiel e Explicitamente Identificado)
  // ========================================================================

  enableDemoMode() {
    this.disconnectAll();
    this.isDemoMode = true;
    this.activeChannel = 'demo';
    this.log('Modo Demonstração ativado. Hardware não conectado: simulação de rampa e comandos ativada.', 'warn');
    this.notifyStatus();
    this.notifyState();
  }

  simulateDemoCommand(payload) {
    if (payload.cmd === 'POWER') {
      const target = !!payload.value;
      this.hardwareState.power = target;
      this.hardwareState.motor = target;
      this.hardwareState.audio = target;
      this.hardwareState.light = target;
      this.hardwareState.motorSpeed = target ? 255 : 0;
      this.log(`[DEMO] Sequência Mestre executada: Todos os componentes definidos para ${target ? 'LIGADO' : 'DESLIGADO'}.`, 'success');
    } else if (payload.cmd === 'MOTOR') {
      this.hardwareState.motor = !!payload.value;
      this.hardwareState.motorSpeed = payload.value ? (payload.speed || 220) : 0;
      this.updateDemoPowerState();
      this.log(`[DEMO] Motor definido para ${payload.value ? 'LIGADO' : 'PARADO'}.`, 'info');
    } else if (payload.cmd === 'AUDIO') {
      this.hardwareState.audio = !!payload.value;
      this.updateDemoPowerState();
      this.log(`[DEMO] Áudio definido para ${payload.value ? 'LIGADO' : 'MUDO'}.`, 'info');
    } else if (payload.cmd === 'LIGHT') {
      this.hardwareState.light = !!payload.value;
      this.updateDemoPowerState();
      this.log(`[DEMO] Pisca-pisca definido para ${payload.value ? 'ACESO' : 'APAGADO'}.`, 'info');
    }
    this.notifyState();
  }

  updateDemoPowerState() {
    const anyOn = this.hardwareState.motor || this.hardwareState.audio || this.hardwareState.light;
    this.hardwareState.power = anyOn;
  }

  // ========================================================================
  // DESCONEXÃO E LIMPEZA
  // ========================================================================

  disconnectAll() {
    this.stopKeepAlive();
    this.stopCloudPing();
    if (this.confirmTimer) { clearTimeout(this.confirmTimer); this.confirmTimer = null; }
    if (this.mqttClient) {
      const old = this.mqttClient;
      this.mqttClient = null;
      try { old.end(true); } catch (e) {}
    }
    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
      this.ws = null;
    }
    if (this.bleDevice && this.bleDevice.gatt && this.bleDevice.gatt.connected) {
      try { this.bleDevice.gatt.disconnect(); } catch (e) {}
    }
    this.bleDevice = null;
    this.bleServer = null;
    this.cmdChar = null;
    this.stateChar = null;
    this.bleWriteChain = Promise.resolve();
    this.activeChannel = 'none';
    this.isDemoMode = false;
    this.notifyStatus();
  }
}

// Instância singleton global da camada de comunicação
window.carouselComm = new CarouselCommManager();
