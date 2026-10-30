/**
 * ==========================================================================
 * CARROSSEL INTELIGENTE MAKER - CAMADA DE COMUNICAÇÃO UNIFICADA (comm.js)
 * ==========================================================================
 * Suporta:
 * 1. Wi-Fi: WebSocket bidirecional em tempo real + fallback HTTP REST
 * 2. Bluetooth BLE: Web Bluetooth API com GATT customizado (Command + Notify)
 * 3. Modo Demonstração transparente e explicitamente identificado
 *
 * Não finge conexão real: se não houver handshake confirmado com o ESP32,
 * o status permanecerá desconectado até que o usuário ative o modo demo.
 */

// UUIDs customizados padrão para o serviço BLE do Carrossel ESP32
const BLE_CONFIG = {
  SERVICE_UUID: '4fafc201-1fb5-459e-8fcc-c5c9c331914b',
  CHAR_CMD_UUID: 'beb5483e-36e1-4688-b7f5-ea07361b26a8',    // Write
  CHAR_STATE_UUID: 'beb5483e-36e1-4688-b7f5-ea07361b26a9'  // Notify / Read
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
    this.pingInterval = null;

    // Referências BLE
    this.bleDevice = null;
    this.bleServer = null;
    this.cmdChar = null;
    this.stateChar = null;
  }

  // Registra ouvinte de atualização do estado real do hardware
  onStateUpdate(callback) {
    this.stateListeners.push(callback);
  }

  // Registra ouvinte de alteração de conectividade
  onConnectivityChange(callback) {
    this.statusListeners.push(callback);
  }

  // Registra ouvinte de log do sistema
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

  // ========================================================================
  // COMANDOS DE ALTO NÍVEL (Unificados)
  // ========================================================================

  async sendMasterPower(powerOn) {
    const payload = {
      cmd: 'POWER',
      value: !!powerOn,
      ts: Date.now()
    };
    return this.dispatchCommand(payload, `Comando Mestre: ${powerOn ? 'LIGAR TUDO' : 'DESLIGAR TUDO'}`);
  }

  async sendMotor(on) {
    const payload = {
      cmd: 'MOTOR',
      value: !!on,
      speed: on ? 255 : 0,
      ts: Date.now()
    };
    return this.dispatchCommand(payload, `Motor: ${on ? 'LIGAR' : 'PARAR'}`);
  }

  async sendAudio(on) {
    const payload = {
      cmd: 'AUDIO',
      value: !!on,
      ts: Date.now()
    };
    return this.dispatchCommand(payload, `Áudio: ${on ? 'LIGAR' : 'MUDO'}`);
  }

  async sendLight(on) {
    const payload = {
      cmd: 'LIGHT',
      value: !!on,
      ts: Date.now()
    };
    return this.dispatchCommand(payload, `Pisca-Pisca: ${on ? 'ACENDER' : 'APAGAR'}`);
  }

  async requestStateSync() {
    return this.dispatchCommand({ cmd: 'GET_STATE', ts: Date.now() }, 'Solicitando telemetria do ESP32');
  }

  // ========================================================================
  // DESPACHO CONFORME CANAL ATIVO
  // ========================================================================

  async dispatchCommand(payload, description) {
    this.log(`Enviando -> ${description}`, 'info');

    if (this.isDemoMode) {
      this.simulateDemoCommand(payload);
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
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(payload));
        await this.cmdChar.writeValue(data);
        return true;
      } catch (err) {
        this.log(`Erro ao transmitir via BLE: ${err.message}`, 'error');
        return false;
      }
    }

    this.log('Falha: Nenhum canal de comunicação ativo (nem Wi-Fi, nem BLE). Conecte-se ou ative o Modo Demonstração.', 'warn');
    return false;
  }

  // ========================================================================
  // IMPLEMENTAÇÃO WI-FI / WEBSOCKET
  // ========================================================================

  async connectWifi(ipAddress) {
    if (ipAddress) this.espIp = ipAddress.trim();
    this.disconnectAll();

    const wsUrl = `ws://${this.espIp}:${this.wsPort}/ws`;
    this.log(`Tentando conectar ao ESP32 via WebSocket em: ${wsUrl}...`, 'info');

    return new Promise((resolve) => {
      try {
        this.ws = new WebSocket(wsUrl);

        const connectionTimeout = setTimeout(() => {
          if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
            this.log(`Tempo limite esgotado ao tentar conectar ao IP ${this.espIp}. Verifique se o celular está na mesma rede do ESP32.`, 'error');
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
          this.requestStateSync();
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          this.handleIncomingPayload(event.data);
        };

        this.ws.onerror = (err) => {
          this.log(`Erro na conexão WebSocket Wi-Fi. Certifique-se de que o IP está correto.`, 'error');
          resolve(false);
        };

        this.ws.onclose = () => {
          if (this.activeChannel === 'wifi') {
            this.log('Conexão Wi-Fi perdida ou fechada com o ESP32.', 'warn');
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
  // IMPLEMENTAÇÃO BLUETOOTH BLE
  // ========================================================================

  async connectBLE() {
    if (!navigator.bluetooth) {
      this.log('Web Bluetooth não é suportado por este navegador. No iOS utilize Bluefy ou Chrome no Android.', 'error');
      alert('Seu navegador não suporta Web Bluetooth (BLE). Utilize o Google Chrome no Android ou navegador compatível.');
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

      // Inicia notificações automáticas do estado do hardware
      await this.stateChar.startNotifications();
      this.stateChar.addEventListener('characteristicvaluechanged', (event) => {
        const decoder = new TextDecoder('utf-8');
        const text = decoder.decode(event.target.value);
        this.handleIncomingPayload(text);
      });

      this.activeChannel = 'ble';
      this.isDemoMode = false;
      this.log('Conexão Bluetooth BLE estabelecida e sincronizada com sucesso!', 'success');
      this.notifyStatus();
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
    try {
      const data = JSON.parse(rawString);
      if (data.type === 'state' || data.motor !== undefined) {
        const payload = data.payload || data;

        this.hardwareState.power = !!payload.power;
        this.hardwareState.motor = !!payload.motor;
        this.hardwareState.audio = !!payload.audio;
        this.hardwareState.light = !!payload.light;
        this.hardwareState.motorSpeed = payload.speed !== undefined ? payload.speed : (payload.motor ? 255 : 0);
        this.hardwareState.uptime = payload.uptime || 0;
        this.hardwareState.failsafe = !!payload.failsafe;

        this.log(`Telemetria real recebida do ESP32: [Motor:${this.hardwareState.motor ? 'ON' : 'OFF'} | Audio:${this.hardwareState.audio ? 'ON' : 'OFF'} | Luz:${this.hardwareState.light ? 'ON' : 'OFF'}]`, 'info');
        this.notifyState();
      } else if (data.type === 'ack') {
        this.log(`ESP32 confirmou comando: ${data.msg || 'OK'}`, 'info');
      } else if (data.type === 'error') {
        this.log(`Alerta reportado pelo ESP32: ${data.msg}`, 'warn');
      }
    } catch (e) {
      this.log(`Dado não-JSON recebido do ESP32: ${rawString}`, 'warn');
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
      this.hardwareState.motorSpeed = payload.value ? 255 : 0;
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
    // Se todos estiverem ligados, power = true; se todos desligados, power = false
    const anyOn = this.hardwareState.motor || this.hardwareState.audio || this.hardwareState.light;
    this.hardwareState.power = anyOn;
  }

  // ========================================================================
  // DESCONEXÃO E LIMPEZA
  // ========================================================================

  disconnectAll() {
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
    this.activeChannel = 'none';
    this.isDemoMode = false;
    this.notifyStatus();
  }
}

// Instância singleton global da camada de comunicação
window.carouselComm = new CarouselCommManager();
