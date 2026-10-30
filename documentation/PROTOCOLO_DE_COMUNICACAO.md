# PROTOCOLO DE COMUNICAÇÃO - CARROSSEL INTELIGENTE ESP32

Este documento padroniza a troca de dados entre o **Site de Controle (Navegador/Celular)** e o **Firmware do ESP32**, garantindo compatibilidade uniforme tanto via **Wi-Fi (WebSocket/HTTP)** quanto via **Bluetooth BLE**.

---

## 1. Princípio da Camada Unificada

A mesma estrutura de carga útil (JSON UTF-8) é trafegada em qualquer meio:
- **No Wi-Fi:** Trafegado em quadros de texto WebSocket na rota `ws://<IP_ESP32>:81/ws` ou via requisição POST nos endpoints REST `/api/*`.
- **No Bluetooth BLE:** Trafegado em strings UTF-8 na característica GATT `beb5483e-36e1-4688-b7f5-ea07361b26a8` (Write) e recebido via Notificação na característica `beb5483e-36e1-4688-b7f5-ea07361b26a9` (Notify).

---

## 2. Comandos do Site para o ESP32 (Celular -> ESP32)

### 2.1 Comando Mestre Geral (LIGAR / DESLIGAR TUDO)
Aciona a sequência coordenada de inicialização ou parada segura.

```json
{
  "cmd": "POWER",
  "value": true,
  "ts": 1730240000000
}
```

* **Campos:**
  - `cmd`: `"POWER"` (String fixa)
  - `value`: `true` (Ligar motor com rampa, áudio e iluminação) ou `false` (Freio do motor, mudo e apagar luzes)
  - `ts`: Timestamp Unix em milissegundos

---

### 2.2 Controle Individual do Motor
```json
{
  "cmd": "MOTOR",
  "value": true,
  "speed": 255,
  "ts": 1730240000000
}
```
* **Campos:**
  - `cmd`: `"MOTOR"`
  - `value`: `true` para rotação, `false` para frenagem
  - `speed`: Valor PWM de 0 a 255 (Opcional, padrão = 255)

---

### 2.3 Controle Individual do Módulo de Áudio
```json
{
  "cmd": "AUDIO",
  "value": true,
  "ts": 1730240000000
}
```
* **Campos:**
  - `cmd`: `"AUDIO"`
  - `value`: `true` para tocar música, `false` para mudo/stop

---

### 2.4 Controle Individual do Pisca-Pisca Colorido
```json
{
  "cmd": "LIGHT",
  "value": true,
  "ts": 1730240000000
}
```
* **Campos:**
  - `cmd`: `"LIGHT"`
  - `value`: `true` para acender o circuito, `false` para apagar

---

### 2.5 Solicitação de Sincronização de Estado
Utilizado ao abrir o site ou ao restabelecer a conexão.
```json
{
  "cmd": "GET_STATE",
  "ts": 1730240000000
}
```

---

## 3. Mensagens de Telemetria e Estado Real (ESP32 -> Celular)

Emitidas automaticamente pelo ESP32 via Broadcast WebSocket e Notificação BLE sempre que qualquer atuador mudar de estado:

```json
{
  "type": "state",
  "payload": {
    "power": true,
    "motor": true,
    "speed": 255,
    "audio": true,
    "light": true,
    "uptime": 142
  }
}
```

### Detalhamento dos Campos de Telemetria:
| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `type` | String | Sempre `"state"` para quadros de telemetria |
| `payload.power` | Booleano | `true` se o carrossel estiver em ciclo ativo |
| `payload.motor` | Booleano | `true` se a ponte H estiver acionada |
| `payload.speed` | Inteiro (0-255) | Ciclo de trabalho PWM atual da rampa |
| `payload.audio` | Booleano | `true` se o DFPlayer estiver reproduzindo |
| `payload.light` | Booleano | `true` se o chaveamento das luzes estiver conduzindo |
| `payload.uptime` | Inteiro | Segundos decorridos desde a inicialização do ESP32 |

---

## 4. Watchdog de Comunicação e Resposta a Falhas

1. O site envia um ping periódico ou comando a cada poucos segundos.
2. Cada comando recebido com sucesso alimenta a contagem do watchdog no ESP32 (`feedWatchdog`).
3. Se o celular sair do alcance do Wi-Fi/BLE por mais de **8 segundos** com o carrossel ligado:
   - O ESP32 desliga o motor e as luzes automaticamente.
   - O site identifica a desconexão no WebSocket/BLE e alerta o usuário no log.
