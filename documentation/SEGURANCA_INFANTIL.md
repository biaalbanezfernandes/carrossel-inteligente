# DIRETRIZES DE SEGURANÇA PARA BRINQUEDO INFANTIL
## NORMA DE REFERÊNCIA: NBR IEC 62115 (Segurança de Brinquedos Elétricos)

O projeto do Carrossel Inteligente foi concebido sob rigorosos princípios de segurança e confiabilidade para ambientes com crianças.

---

## 1. Matriz de Riscos e Medidas Mitigatórias

| Perigo Potencial | Risco | Mitigação Implementada no Projeto |
| :--- | :--- | :--- |
| **Acesso a Partes Elétricas** | Choque / Queimadura | Todo o circuito eletrônico, ESP32, drivers e fontes ficam encerrados em **gabinete plástico fechado com parafusos**, fora do alcance de abertura sem ferramentas. |
| **Sobrecarga ou Curto-Circuito** | Superaquecimento / Fogo | Inclusão obrigatória de **fusível de vidro de ação rápida (2A)** na entrada da fonte de alimentação e desligamento automático por software. |
| **Prendimento de Dedos no Motor** | Lesão por Esmagamento | **Rampa suave de aceleração (soft-start)** no motor por PWM + acoplamento mecânico com torque limitado. O motor não desenvolve força destrutiva em caso de travamento manual. |
| **Perda de Sinal do Celular** | Brinquedo rodando sem supervisão | **Watchdog de Comunicação:** após 8 segundos sem receber ping ou comando do celular via Wi-Fi/BLE, o ESP32 corta imediatamente o motor e apaga as luzes. |
| **Falha de Reinicialização (Boot)** | Partida brusca e inesperada | **Saídas travadas em LOW no firmware:** Durante a inicialização do ESP32 ou em resets acidentais, nenhuma carga liga sem que haja comando explícito enviado pelo usuário. |
| **Fiação Solta / Puxões** | Rompimento / Curto | Uso de **abraçadeiras plásticas** para alívio de tração mecânica em todas as entradas e saídas de cabos do gabinete. |
| **Isolamento de Terminais** | Contato Acidental | Todas as soldas, emendas e terminais de componentes recebem **tubo termo-retrátil** com isolamento elétrico testado até 600V. |

---

## 2. Recomendações Específicas de Tensão

1. **Baixa Tensão de Segurança (SELV):**
   - É terminantemente recomendado que **TODO** o carrossel (incluindo o pisca-pisca) opere com tensões de até **12V DC**.
   - Fontes externas certificadas (com selo INMETRO e isolamento Classe II) convertem a rede da tomada residencial para 12V ou 5V antes de entrar no brinquedo.
2. **Caso o Pisca-Pisca use Tomada (127V/220V):**
   - A linha de alta tensão não deve entrar na base giratória do carrossel.
   - O relé de chaveamento deve estar localizado dentro de um compartimento selado com barreira física interna e proteção IP54.

---

## 3. Lista de Checagem Pré-Uso com Crianças

Antes de entregar o carrossel para uma criança brincar, o adulto responsável deve verificar:
- [ ] O gabinete está firmemente parafusado?
- [ ] O botão de parada de emergência está visível e funcional?
- [ ] O carrossel para quando você segura a cúpula com a mão sem forçar o motor?
- [ ] O cabo da fonte não apresenta dobras, cortes ou mordeduras?
- [ ] Ao desconectar o Wi-Fi do celular, o carrossel desliga sozinho em no máximo 8 segundos?
