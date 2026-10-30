# 🎠 CARROSSEL INTELIGENTE COM ESP32 (CARROSSEL MAKER)

Sistema completo de automação e controle para um **Carrossel Infantil Inteligente**, integrando interface responsiva para smartphone (Wi-Fi e Bluetooth BLE), reconhecimento de voz nativo em português brasileiro (pt-BR), firmware modular em C++ para ESP32 convencional, planejamento elétrico rigoroso, manual de montagem e plano de homologação com foco prioritário em **segurança infantil**.

---

## 📁 Estrutura do Repositório

```text
/Carrossel MAKER
│
├── /site/                         # Interface de Controle Responsiva (Mobile First)
│   ├── index.html                 # Estrutura HTML, indicadores e botões
│   ├── styles.css                 # Design System moderno, dark-mode & glassmorphism
│   ├── comm.js                    # Camada de comunicação unificada (Wi-Fi, BLE e Demo)
│   ├── voice.js                   # Reconhecimento de voz Web Speech API (pt-BR)
│   └── app.js                     # Orquestrador de eventos, telemetria e diagnósticos
│
├── /firmware/                     # Código C++ para ESP32 Convencional
│   ├── platformio.ini             # Configuração para compilação com PlatformIO
│   ├── main.cpp                   # Ponto de entrada PlatformIO
│   ├── firmware.ino               # Sketch para compilação na Arduino IDE
│   └── /modules/                  # Arquitetura Modular
│       ├── Config.h               # Definição de pinos (GPIOs) e parâmetros de segurança
│       ├── MotorModule.h/.cpp     # Driver Ponte H, rampa suave (PWM) e frenagem ativa
│       ├── AudioModule.h/.cpp     # Comunicação UART com DFPlayer Mini (som infantil)
│       ├── LightModule.h/.cpp     # Chaveamento isolado do pisca-pisca de Natal
│       ├── StateManager.h/.cpp    # Centralizador de estado e serialização JSON
│       ├── SafetyManager.h/.cpp   # Watchdog de comunicação e parada de emergência
│       ├── WiFiModule.h/.cpp      # Servidor HTTP REST e WebSocket em tempo real
│       └── BLEModule.h/.cpp       # Serviço Bluetooth Low Energy (GATT customizado)
│
├── /hardware/                     # Engenharia e Planejamento Elétrico
│   ├── PLANEJAMENTO_ELETRICO.md   # Metodologia de medição e dimensionamento
│   ├── LISTA_DE_MATERIAIS_BOM.md  # Lista de materiais com status de confirmação
│   ├── /pinout/
│   │   └── ESP32_PINOUT.md        # Tabela completa de pinagem e restrições elétricas
│   └── /diagrams/
│       └── ESQUEMA_ELETRICO.md    # Diagramas em blocos, esquemático e isolamento
│
├── /documentation/                # Manuais Técnicos e Guias
│   ├── MANUAL_DE_MONTAGEM.md      # Montagem passo a passo mecânica e elétrica
│   ├── PROTOCOLO_DE_COMUNICACAO.md# Especificação de mensagens JSON (WebSocket e BLE)
│   ├── SEGURANCA_INFANTIL.md      # Diretrizes de segurança baseadas na NBR IEC 62115
│   └── COMPILACAO_E_INSTALACAO.md # Instruções de compilação, gravação e uso no celular
│
└── /tests/                        # Testes e Validação
    ├── PLANO_DE_TESTES.md         # Casos de teste e matriz de homologação
    └── mock_esp32_server.js       # Servidor simulador Node.js para testes do site
```

---

## ⚡ Especificações Físicas: Status de Confirmação

Em estrito cumprimento aos requisitos de engenharia, **nenhum valor desconhecido foi inventado**:

| Componente | Parâmetro | Situação | Ação Obrigatória Antes da Ligação Final |
| :--- | :--- | :--- | :--- |
| **Pisca-Pisca Colorido** | Alimentação e Circuito | **PENDENTE** | Inspecionar cordão de Natal adquirido para verificar se é 5V USB, 12V DC, Pilhas ou 127/220V AC. Não ligar diretamente ao ESP32. Preservar a caixinha controladora original. |
| **Motor de Rotação** | Tensão e Corrente | **PENDENTE** | Medir corrente sob carga mecânica ($I_{carga}$) e rotor travado ($I_{stall}$) na velocidade ideal de rotação do carrossel. |
| **Fonte Principal** | Tensão e Potência | **PENDENTE** | Dimensionar após definição da tensão do motor ($I_{fonte} \ge \Sigma I_{max} \times 1.3$). |
| **Módulo de Áudio** | DFPlayer Mini (5V) | **CONFIRMADO** | Utilizar resistor de 1kΩ na linha RX para compatibilidade lógica. |
| **Microcontrolador** | ESP32 Convencional | **CONFIRMADO** | ESP32-WROOM-32 com saídas travadas em LOW no boot. |

---

## 🚀 Como Executar Imediatamente

### 1. Testar o Site no Navegador (Modo Demonstração)
Abra o arquivo [`site/index.html`](site/index.html) no navegador (Google Chrome ou Edge). Clique em **Modo Demo** ou utilize o microfone para dizer *"Ligar"* ou *"Desligar"*.

### 2. Gravar o Firmware no ESP32
- **PlatformIO:** Abra a pasta [`firmware`](firmware) e execute `pio run -t upload`.
- **Arduino IDE:** Abra [`firmware/firmware.ino`](firmware/firmware.ino), selecione a placa *ESP32 Dev Module* e envie.

### 3. Conectar pelo Celular
Conecte o smartphone à rede Wi-Fi `Carrossel_Maker_ESP32` (senha `carrossel123`) ou toque em **Conectar BLE** no site.

---

*Projeto desenvolvido com rigor técnico para o ecossistema Carrossel MAKER.*
