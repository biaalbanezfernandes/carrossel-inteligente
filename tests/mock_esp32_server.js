/**
 * ============================================================================
 * SERVIDOR MOCK DO ESP32 (Node.js) PARA TESTES DO SITE
 * ============================================================================
 * Permite testar todo o site no computador ou celular simulando as respostas
 * exatas do firmware do ESP32 via WebSocket na porta 81.
 *
 * Como executar:
 *   npm install ws
 *   node mock_esp32_server.js
 */

const WebSocket = require('ws');

const WS_PORT = 81;
const wss = new WebSocket.Server({ port: WS_PORT });

let hardwareState = {
  power: false,
  motor: false,
  speed: 0,
  audio: false,
  light: false,
  uptime: 0
};

console.log(`[MOCK ESP32] Servidor simulado iniciado na porta ${WS_PORT}!`);
console.log(`[MOCK ESP32] Aguardando conexões do site em ws://localhost:${WS_PORT}/ws`);

wss.on('connection', (ws) => {
  console.log('[MOCK ESP32] Cliente conectado!');

  // Envia estado inicial
  sendState(ws);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('[MOCK ESP32] Comando recebido:', data);

      if (data.cmd === 'POWER') {
        const val = !!data.value;
        hardwareState.power = val;
        hardwareState.motor = val;
        hardwareState.speed = val ? 255 : 0;
        hardwareState.audio = val;
        hardwareState.light = val;
      } else if (data.cmd === 'MOTOR') {
        hardwareState.motor = !!data.value;
        hardwareState.speed = data.value ? 255 : 0;
        updatePowerStatus();
      } else if (data.cmd === 'AUDIO') {
        hardwareState.audio = !!data.value;
        updatePowerStatus();
      } else if (data.cmd === 'LIGHT') {
        hardwareState.light = !!data.value;
        updatePowerStatus();
      }

      broadcastState();
    } catch (e) {
      console.error('[MOCK ESP32] Erro ao processar mensagem JSON:', e.message);
    }
  });

  ws.on('close', () => {
    console.log('[MOCK ESP32] Cliente desconectado.');
  });
});

function updatePowerStatus() {
  hardwareState.power = hardwareState.motor || hardwareState.audio || hardwareState.light;
}

function sendState(ws) {
  const payload = {
    type: 'state',
    payload: { ...hardwareState }
  };
  ws.send(JSON.stringify(payload));
}

function broadcastState() {
  const payload = {
    type: 'state',
    payload: { ...hardwareState }
  };
  const str = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(str);
    }
  });
}
