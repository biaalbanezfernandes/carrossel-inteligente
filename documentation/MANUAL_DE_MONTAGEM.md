# MANUAL DE MONTAGEM PASSO A PASSO
## PROJETO: CARROSSEL INFANTIL INTELIGENTE COM ESP32

Este guia orienta a montagem mecânica e elétrica do carrossel, priorizando a segurança estrutural e a confiabilidade de longo prazo para um brinquedo infantil.

---

## ETAPA 1: Preparação e Segurança da Bancada
1. Desembale os componentes sobre superfície isolante (manta antiestática ou bancada de madeira limpa).
2. Tenha em mãos: ferro de solda com temperatura controlada, estanho de boa qualidade, tubos termo-retráteis de diversos calibres, decapador de fios, multímetro digital e chaves de fenda philips.
3. **REGRA DE OURO:** Jamais realize conexões com a fonte de alimentação conectada à tomada.

---

## ETAPA 2: Montagem Mecânica do Carrossel
1. **Fixação da Base Giratória:**
   - Instale o rolamento central ou mancal axial da base do carrossel.
   - Verifique manualmente se o disco gira livremente sem atrito excessivo nem folgas axiais que possam causar tombamento.
2. **Acoplamento do Motor:**
   - Fixe o motorredutor DC no suporte rígido da base inferior.
   - Utilize acoplador flexível ou polia com correia dentada para ligar o eixo do motor ao eixo central do carrossel.
   - O uso de acoplador com pequeno deslizamento mecânico é recomendado para evitar que dedos de crianças fiquem presos caso tentem segurar o carrossel em movimento.
3. **Passagem do Cordão do Pisca-Pisca de Natal:**
   - Distribua as luzes de Natal ao redor da cúpula superior e das hastes dos cavalinhos.
   - Fixe os cabos do pisca-pisca com mini abraçadeiras plásticas (enforca-gato) de modo que nenhum fio fique pendente ou em contato com o eixo em rotação.
   - Conduza os fios de alimentação do pisca-pisca até a base inferior através de um anel coletor giratório (slip ring) se a cúpula girar, ou mantenha a iluminação na parte estática caso o teto seja fixo.

---

## ETAPA 3: Montagem Elétrica e Soldagem

### 3.1 Circuito de Potência do Motor
1. Solde o capacitor de 100nF diretamente entre os dois bornes do motor DC.
2. Conecte dois fios de bitola 0.50mm² dos bornes do motor até as saídas `OUT1` e `OUT2` do módulo de ponte H (TB6612 ou L298N).
3. Conecte os sinais de comando do ESP32 ao driver de motor:
   - GPIO 25 -> Pino `IN1`
   - GPIO 26 -> Pino `IN2`
   - GPIO 27 -> Pino `PWM / ENA`
4. Ligue o GND do driver ao barramento comum de terra.

### 3.2 Circuito do Módulo de Áudio (DFPlayer Mini)
1. Conecte o pino `VCC` do DFPlayer na linha de **5.0V** e o pino `GND` ao terra comum.
2. Conecte o pino `TX` do ESP32 (GPIO 17) a um **resistor de 1kΩ**. A outra perna do resistor vai ao pino `RX` do DFPlayer.
3. Conecte o pino `RX` do ESP32 (GPIO 16) diretamente ao pino `TX` do DFPlayer.
4. Conecte os terminais do alto-falante infantil nos pinos `SPK_1` e `SPK_2` do DFPlayer.
5. Insira o cartão MicroSD formatado em FAT32 contendo a pasta `/mp3` com as músicas no formato `0001.mp3`, `0002.mp3`.

### 3.3 Circuito de Chaveamento do Pisca-Pisca
1. Conecte o pino de controle do ESP32 (GPIO 33) à entrada de controle do módulo chaveador (MOSFET ou Módulo Relé).
2. Intercale o circuito chaveado na linha de alimentação da caixinha controladora do pisca-pisca.
3. Fixe a caixinha controladora original com fita dupla-face no interior do gabinete, selecionando previamente o modo de efeito de luz favorito.

### 3.4 Alimentação e Proteções
1. Instale o porta-fusível de 2A na linha positiva da fonte de alimentação.
2. Conecte a saída regulada de 5V ao pino `VIN` (ou 5V) do módulo ESP32 Dev.
3. Interligue todos os pontos de terra (GND) no barramento único de terra.

---

## ETAPA 4: Alojamento no Gabinete Anti-Acesso Infantil
1. Aloje a eletrônica, fontes e conectores dentro de caixa plástica de ABS.
2. Faça a saída dos cabos por prensa-cabos emborrachados.
3. Feche a caixa utilizando parafusos.
4. Cole etiquetas de advertência visual na tampa traseira do gabinete.
