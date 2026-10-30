# TABELA DE PINAGEM - ESP32 CONVENCIONAL (ESP32-WROOM-32 / 38 PINOS)

Este documento especifica a alocação de GPIOs do ESP32 para o projeto do **Carrossel Inteligente**.

> ⚠️ **AVISO CRÍTICO DE ENGENHARIA ELÉTRICA:**
> - Os pinos do ESP32 operam exclusivamente com nível lógico de **3.3V** e suportam corrente máxima de **12 mA a 20 mA** por pino.
> - **NENHUMA CARGA DE POTÊNCIA** (motor, pisca-pisca, lâmpadas ou alto-falante) pode ser conectada diretamente a um pino do ESP32.
> - Todos os acionamentos utilizam drivers intermediários (Ponte H, Módulos MOSFET com acoplador óptico ou relés).

---

## 1. Mapeamento de Pinos do Projeto

| GPIO | Função no Projeto | Direção | Nível Lógico | Tipo de Sinal | Componente Associado | Cuidados & Observações |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **GPIO 25** | `IN1` (Sentido Motor) | Saída | 3.3V | Digital (HIGH/LOW) | Driver Ponte H (L298N/TB6612) | Pino seguro de saída. Inicia em LOW. |
| **GPIO 26** | `IN2` (Sentido Motor) | Saída | 3.3V | Digital (HIGH/LOW) | Driver Ponte H (L298N/TB6612) | Pino seguro de saída. Inicia em LOW. |
| **GPIO 27** | `ENA` (Velocidade Motor) | Saída | 3.3V | PWM (LEDC Canal 0, 20kHz) | Habilitação do Driver do Motor | Controla a rampa de partida suave e freio. |
| **GPIO 17** | `TX2` (Transmissão Áudio) | Saída | 3.3V | Serial UART (9600 bps) | RX do Módulo MP3 (DFPlayer Mini) | **Recomenda-se resistor de 1kΩ em série** caso o DFPlayer opere em 5V. |
| **GPIO 16** | `RX2` (Recepção Áudio) | Entrada | 3.3V | Serial UART (9600 bps) | TX do Módulo MP3 (DFPlayer Mini) | Recebe telemetria de fim de faixa do áudio. |
| **GPIO 33** | `LIGHT_CTRL` (Pisca-Pisca) | Saída | 3.3V | Digital (HIGH/LOW) | Gate de MOSFET / Módulo Relé Isolado | Inicia em LOW (desligado). Aciona alimentação do pisca-pisca. |
| **GPIO 14** | `BTN_EMERGENCY` (Botão Local) | Entrada | 3.3V | Digital com Pull-Up interno | Botão Físico Push-Button | Acionamento ao GND para parada de emergência imediata. |
| **GPIO 2** | LED Onboard (Opcional) | Saída | 3.3V | Digital | Indicador de Status do ESP32 | Strapping pin. Manter livre ou usar apenas como indicador de boot. |
| **3V3** | Alimentação Lógica | Saída | 3.3V | Alimentação DC | Sensores e lógica interna | Não usar para alimentar motores ou alto-falantes! |
| **GND** | Terra Comum do Sistema | - | 0V | Referência Elétrica | **Unificado com GND da fonte de potência** | **OBRIGATÓRIO:** O GND do ESP32 deve ser interligado ao GND da fonte do motor e do áudio. |
| **VIN / 5V** | Entrada de Alimentação ESP32 | Entrada | 5.0V DC | Alimentação do Regulador AMS1117 | Fonte regulada 5V externa | Alimentação limpa e desacoplada com capacitor de 100uF. |

---

## 2. Pinos Críticos e Strapping Pins Evitados

Para garantir que o ESP32 inicialize perfeitamente sem falhas de gravação ou travamentos:
- **GPIO 0:** Não utilizado para cargas (controla modo de boot/flash).
- **GPIO 12 (MTDI):** Não utilizado (afeta tensão da memória Flash SPI interna).
- **GPIO 15:** Mantido neutro durante o boot.
- **GPIO 6 a 11:** Conectados internamente à memória Flash SPI do chip (proibido o uso externo).
- **GPIO 34, 35, 36 (VP), 39 (VN):** São apenas entradas (INPUT ONLY) e não possuem pull-up/pull-down interno. Não foram usados para controle de saídas.

---

## 3. Matriz de Estados de Inicialização

| Componente | Estado no Boot | Nível no GPIO | Condição do Hardware |
| :--- | :--- | :--- | :--- |
| **Motor** | DESLIGADO | GPIO 25 = 0, GPIO 26 = 0, GPIO 27 = 0 | Ponte H cortada, motor travado/freiado |
| **Áudio** | MUDO / PARADO | GPIO 17 = Idle High (UART) | Sem envio de dados; comando STOP enviado no setup |
| **Pisca-Pisca** | APAGADO | GPIO 33 = 0 | Circuito de chaveamento desenergizado |
| **Watchdog** | ATIVO | - | Monitora timeout de 8 segundos |
