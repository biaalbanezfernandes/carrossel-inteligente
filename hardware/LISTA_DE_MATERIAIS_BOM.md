# LISTA DE MATERIAIS (BILL OF MATERIALS - BOM)
## PROJETO: CARROSSEL INFANTIL INTELIGENTE COM ESP32

Esta lista de materiais cataloga todos os itens necessários para a construção do protótipo e da versão final, divididos entre **Componentes Confirmados**, **Equipamentos de Segurança** e **Itens com Especificação Pendente**.

---

## 1. Núcleo de Processamento e Controle

| Item | Descrição / Modelo | Especificação Técnica | Quantidade | Status |
| :--- | :--- | :--- | :--- | :--- |
| **1.1** | Microcontrolador ESP32 Convencional | Módulo ESP32-WROOM-32 (38 pinos), Wi-Fi 2.4GHz + BLE 4.2 | 1 un. | **CONFIRMADO** |
| **1.2** | Cabo de Programação e Alimentação | Cabo Micro-USB blindado com suporte a dados | 1 un. | **CONFIRMADO** |
| **1.3** | Botão de Parada de Emergência Local | Push-button tipo cogumelo ou botão táctil 12x12mm | 1 un. | **CONFIRMADO** |

---

## 2. Movimentação e Rotação

| Item | Descrição / Modelo | Especificação Técnica | Quantidade | Status |
| :--- | :--- | :--- | :--- | :--- |
| **2.1** | Motor Elétrico com Caixa de Redução | Motor DC de torque com caixa de redução (ex: Motor Amarelinho DC 3-6V ou Motor TT 12V 60 RPM) | 1 un. | **PENDENTE DE MEDIÇÃO** (Verificar tensão nominal e corrente de partida/bloqueio) |
| **2.2** | Driver de Potência para Motor | Módulo Ponte H Dupla TB6612FNG (Recomendado) ou L298N com dissipador | 1 un. | **CONFIRMADO** |
| **2.3** | Capacitor de Desacoplamento EMI | Cerâmico multicamada 100nF / 50V (soldado nos bornes do motor) | 1 un. | **CONFIRMADO** |

---

## 3. Sistema de Som e Trilha Sonora

| Item | Descrição / Modelo | Especificação Técnica | Quantidade | Status |
| :--- | :--- | :--- | :--- | :--- |
| **3.1** | Módulo de Áudio Serial | DFPlayer Mini (Chip YX5200-24SS ou compatível), slot MicroSD | 1 un. | **CONFIRMADO** |
| **3.2** | Cartão de Memória | MicroSD Card 4GB a 16GB formatado em FAT32 | 1 un. | **CONFIRMADO** |
| **3.3** | Alto-Falante Infantil | Mini alto-falante 4Ω ou 8Ω, potência de 2W a 3W, cone plástico ou papel | 1 un. | **CONFIRMADO** |
| **3.4** | Resistor de Proteção de Linha RX | Resistor de filme de carbono 1kΩ / 1/4W (em série no pino RX) | 1 un. | **CONFIRMADO** |

---

## 4. Sistema de Iluminação

| Item | Descrição / Modelo | Especificação Técnica | Quantidade | Status |
| :--- | :--- | :--- | :--- | :--- |
| **4.1** | Pisca-Pisca de Natal Colorido | Cordão de lâmpadas com sua própria caixinha controladora de modos e efeitos | 1 un. | **PENDENTE DE MEDIÇÃO** (Identificar se a alimentação é 5V USB, 12V DC, Pilhas ou 127/220V AC) |
| **4.2** | Módulo de Chaveamento para Pisca-Pisca | **Se DC:** Módulo Transistor MOSFET Logic-Level (ex: IRLZ44N com optoacoplador).<br>**Se AC:** Módulo Relé Optoisolado 5V / 10A com supressor Snubber. | 1 un. | **CONDICIONADO AO ITEM 4.1** |

---

## 5. Fonte de Alimentação e Distribuição

| Item | Descrição / Modelo | Especificação Técnica | Quantidade | Status |
| :--- | :--- | :--- | :--- | :--- |
| **5.1** | Fonte de Alimentação Principal | Fonte Chaveada Bivolt (Tensão definida após confirmação do motor: 5V ou 12V, corrente mínima 2A a 3A) | 1 un. | **PENDENTE DE DIMENSIONAMENTO FINAL** |
| **5.2** | Regulador de Tensão Auxiliar | Módulo Conversor DC-DC Step-Down Buck (LM2596 ou Mini MP1584EN) ajustado em 5.0V | 1 un. | **CONDICIONADO À TENSÃO DA FONTE** |
| **5.3** | Porta-Fusível e Fusível de Proteção | Fusível de vidro de ação rápida (Fast-Blow) 2A / 250V em linha | 1 un. | **CONFIRMADO** |

---

## 6. Materiais de Fixação, Cablagem e Segurança Infantil

| Item | Descrição / Modelo | Especificação Técnica | Quantidade | Status |
| :--- | :--- | :--- | :--- | :--- |
| **6.1** | Gabinete de Proteção Geral | Caixa plástica em ABS antichamas (grau IP54 ou superior) com tampa parafusada | 1 un. | **CONFIRMADO (Segurança Infantil)** |
| **6.2** | Tubo Termo-Retrátil | Diâmetros variados (2mm, 4mm, 6mm) para isolamento total dos terminais | 1 kit | **CONFIRMADO** |
| **6.3** | Abraçadeiras Plásticas (Enforca-gato) | Nylon 100mm para organização e alívio de tensão mecânica dos cabos | 20 un. | **CONFIRMADO** |
| **6.4** | Bornes e Conectores Rápidos | Conectores tipo Sindal ou Conectores Alavanca Wago 221 para emendas seguras | 6 un. | **CONFIRMADO** |
| **6.5** | Placa de Montagem / Perfurada | Placa padrão ilhada de fibra de vidro (ou protoboard 400 furos para testes de bancada) | 1 un. | **CONFIRMADO** |
