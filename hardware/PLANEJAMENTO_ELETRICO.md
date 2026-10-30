# PLANEJAMENTO ELÉTRICO E ROTEIRO DE VERIFICAÇÃO

## 1. Roteiro Metodológico Obrigatório de Engenharia

Para que a montagem física do Carrossel Inteligente ocorra sem riscos de queima de componentes ou perigo de acidentes, o projeto segue rigorosamente os 9 passos abaixo:

```text
[1. Medição do Motor]  --> [2. Análise do Áudio]  --> [3. Identificação do Pisca]
         |                         |                            |
         +-------------------------+----------------------------+
                                   |
                                   v
             [4. Dimensionamento de Fontes, Drivers e Cabos]
                                   |
                                   v
             [5. Validação Elétrica dos GPIOs do ESP32]
                                   |
                                   v
             [6. Diagrama Esquemático Definitivo]
                                   |
                                   v
             [7. Tabela de Pinagem Consolidada]
                                   |
                                   v
             [8. Lista de Materiais Fechada (BOM)]
                                   |
                                   v
             [9. Montagem Física e Testes de Homologação]
```

---

## 2. Passo a Passo de Identificação dos Itens Pendentes

### Item 1: Identificação do Motor de Rotação
* **O que medir:**
  1. Conectar o motor a uma fonte de bancada ajustável.
  2. Registrar a tensão nominal onde o carrossel gira na velocidade ideal (habitualmente entre 5V e 12V).
  3. Medir a **corrente sem carga** ($I_{vazio}$).
  4. Medir a **corrente sob carga mecânica** com os bonecos montados ($I_{carga}$).
  5. Medir a **corrente de rotor travado** ($I_{stall}$): o driver de motor escolhido (TB6612 ou L298N) deve suportar com folga térmica essa corrente de pico de stall.

---

### Item 2: Identificação do Módulo de Áudio
* **Especificações confirmadas:**
  - DFPlayer Mini opera tipicamente com **5.0V DC** no pino VCC.
  - Consumo de pico no momento de batidas graves: até **400 mA** com alto-falante de 3W.
  - Como o sinal TX do ESP32 é 3.3V e o DFPlayer aceita 3.3V na maioria das revisões, um resistor de 1kΩ em série na linha RX do DFPlayer protege contra sobretensão e ruídos.

---

### Item 3: Identificação do Pisca-Pisca de Natal Colorido
* **Verificações OBRIGATÓRIAS antes da ligação:**
  1. Inspecionar o rótulo do fabricante do cordão de luzes.
  2. Verificar a fonte de energia:
     - **Opção USB (5V DC):** Pode compartilhar a alimentação do ESP32 se a fonte geral fornecer amperagem suficiente.
     - **Opção Caixa de Pilhas (3V a 4.5V DC):** Pode ser alimentado por conversor Step-Down chaveado por MOSFET.
     - **Opção Plugue de Tomada (127V ou 220V AC):** Exige montagem por módulo relé de isolação galvânica e blindagem física completa.
  3. **Preservação da Controladora Original:**
     - O pisca-pisca tem um botãozinho selector de modos de flash (pisca rápido, fade, estático).
     - **NÃO** desmontar essa caixinha. O ESP32 corta e energiza a alimentação *antes* da caixinha. Ao ser energizada, a caixinha inicia no seu efeito memorizado ou padrão.

---

### Item 4: Dimensionamento da Fonte de Alimentação Principal

A corrente total da fonte ($I_{fonte}$) é calculada pela soma das demandas máximas simultâneas com 30% de margem de segurança ($FS = 1.3$):

$$I_{fonte} \ge \left( I_{ESP32} + I_{Motor} + I_{Audio} + I_{Pisca} \right) \times 1.3$$

* Estimativas preliminares de consumo:
  - ESP32 com Wi-Fi + BLE transmitindo: ~250 mA (picos de 400 mA).
  - DFPlayer Mini + Alto-falante: ~350 mA.
  - Motor DC (estimado com carga): ~600 mA a 1000 mA.
  - Pisca-Pisca (LEDs baixa tensão): ~200 mA a 500 mA.
* **Corrente total estimada:** ~2.0A a 2.5A.
* **Recomendação de Engenharia:** Fonte chaveada bivolt de **12V / 3A** (se o motor for 12V) combinada com módulo Step-Down LM2596 regulado para **5.0V / 2A** para o ESP32 e áudio. Se o motor for 5V, usar fonte única de **5V / 3A a 4A**.

---

### Item 5: Bitola dos Condutores (Fiação)
* **Linhas de Potência (Alimentação da Fonte, Motor e Pisca-pisca):** Cabos flexíveis de bitola mínima **0.50 mm² a 0.75 mm²** (20 AWG a 18 AWG).
* **Linhas de Controle Lógico (GPIOs, UART, PWM):** Fios flexíveis jumper ou cabinho **0.14 mm² a 0.25 mm²** (26 AWG a 24 AWG).
