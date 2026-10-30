# INSTRUÇÕES DE COMPILAÇÃO E INSTALAÇÃO
## PROJETO: CARROSSEL INTELIGENTE COM ESP32

Este guia orienta a gravação do firmware no ESP32 convencional e a execução da interface web no celular.

---

## 1. Gravação do Firmware no ESP32

Você pode utilizar o **PlatformIO** (Recomendado) ou a **Arduino IDE tradicional**.

### Opção A: Utilizando PlatformIO (VS Code)
1. Abra a pasta do projeto no VS Code (`Carrossel MAKER/firmware`).
2. O PlatformIO detectará automaticamente o arquivo `platformio.ini`.
3. Conecte a placa ESP32 ao computador via cabo USB.
4. Clique no ícone do PlatformIO na barra inferior e selecione:
   - **Build** (ou execute no terminal: `pio run -e esp32dev`)
   - **Upload** (ou execute no terminal: `pio run -t upload`)
   - **Monitor Serial** (taxa de 115200 bps para acompanhar o boot).

---

### Opção B: Utilizando a Arduino IDE (v2.x)
1. Abra o arquivo `firmware/firmware.ino`.
2. Em **Ferramentas -> Placa -> ESP32 Arduino**, selecione **ESP32 Dev Module**.
3. Em **Ferramentas -> Gerenciador de Bibliotecas**, instale:
   - `ArduinoJson` (por Benoit Blanchon - versão 6.x)
   - `WebSockets` (por Markus Sattler - versão 2.4.x)
4. Deixe as opções padrão de compilação:
   - Flash Frequency: 80MHz
   - Upload Speed: 921600 ou 115200
5. Conecte o ESP32 na porta COM e clique no botão **Carregar (Seta para a direita)**.
6. Abra o Monitor Serial em **115200 baud** para conferir a mensagem de inicialização.

---

## 2. Como Usar o Site no Celular

O site é 100% responsivo e opera diretamente no navegador do smartphone (Android ou iPhone).

### Método 1: Conexão Direta por Wi-Fi (Ponto de Acesso do ESP32)
1. No celular, vá em Configurações de Wi-Fi e conecte-se à rede:
   - **Rede (SSID):** `Carrossel_Maker_ESP32`
   - **Senha:** `carrossel123`
2. No computador onde o projeto está salvo, inicie um servidor HTTP leve na pasta `/site`:
   ```powershell
   cd site
   npx http-server -p 8080
   # ou usando Python:
   # python -m http.server 8080
   ```
3. No navegador do celular, acesse o endereço fornecido (ex: `http://192.168.4.2:8080` ou o IP da rede local).
4. No campo **IP do ESP32**, digite `192.168.4.1` e toque em **Conectar Wi-Fi**.

---

### Método 2: Conexão Direta por Bluetooth BLE (Sem precisar de roteador)
1. Abra o arquivo `site/index.html` em um navegador compatível com Web Bluetooth:
   - **Android:** Google Chrome ou Edge.
   - **iPhone / iOS:** Navegador Bluefy ou WebBLE.
2. Certifique-se de que o Bluetooth do celular está ligado.
3. No site, toque no botão **Conectar BLE**.
4. O navegador abrirá a lista de dispositivos próximos: selecione **Carrossel_Maker_BLE**.
5. O pareamento será feito e a telemetria do ESP32 aparecerá imediatamente na tela.

---

### Método 3: Modo Demonstração (Sem hardware físico)
1. Abra o arquivo `site/index.html` em qualquer computador ou celular.
2. Toque no botão **Modo Demo**.
3. O banner amarelo indicará explicitamente que as respostas são simuladas.
4. Teste os comandos de voz em português brasileiro ("Ligar" e "Desligar") e os botões individuais.
