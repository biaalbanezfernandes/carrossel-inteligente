# PLANO DE TESTES E HOMOLOGAÇÃO
## PROJETO: CARROSSEL INTELIGENTE COM ESP32

Este documento estabelece a metodologia de testes para validar cada camada do sistema antes de colocá-lo em uso por crianças.

---

## 1. Matriz de Casos de Teste

| ID | Subsistema | Objetivo do Teste | Procedimento de Teste | Critério de Sucesso Esperado |
| :--- | :--- | :--- | :--- | :--- |
| **TC-01** | **Segurança no Boot** | Validar estado inicial pós-energização | Ligar o ESP32 sem nenhum cliente conectado. Medir com multímetro a tensão nos pinos GPIO 25, 26, 27 e 33. | Todos os pinos devem apresentar rigorosamente **0V (Nível LOW)**. Motor e luzes permanecem desligados. |
| **TC-02** | **Comando de Voz: LIGAR** | Testar reconhecimento em pt-BR | No site, clicar no botão de microfone e pronunciar *"Ligar"*. | O navegador reconhece a fala, exibe a transcrição, e o ESP32 aciona o motor com rampa suave, inicia a música e acende as luzes. |
| **TC-03** | **Comando de Voz: DESLIGAR** | Testar parada segura por voz | Com o carrossel em movimento, acionar o microfone e pronunciar *"Desligar"*. | O motor desacelera até o freio completo, a música para imediatamente e o pisca-pisca apaga. |
| **TC-04** | **Controles Individuais** | Testar isolamento dos atuadores | Acionar somente o botão *"Ligar Motor"* no site. Em seguida, acionar *"Ligar Música"*. | O motor deve girar sem que as luzes acendam. Ao acionar música, o áudio toca sem alterar o estado do pisca-pisca. |
| **TC-05** | **Rampa Suave de Aceleração** | Evitar trancos mecânicos no brinquedo | Com o motor parado, enviar comando de velocidade máxima. Observar a aceleração física do disco. | A rotação deve atingir a velocidade nominal de forma progressiva e gradual ao longo de ~1 a 2 segundos. |
| **TC-06** | **Watchdog de Perda de Sinal** | Evitar funcionamento desatendido | Com o carrossel ligado, colocar o celular em modo avião ou desligar o Wi-Fi do smartphone. | Ao atingir **8 segundos** sem comunicação, o ESP32 desliga automaticamente o motor e as luzes por segurança. |
| **TC-07** | **Botão Físico de Emergência** | Parada local prioritária | Com o carrossel girando, pressionar o botão físico conectado ao GPIO 14. | O carrossel deve parar imediatamente com freio ativo, independente de comandos do celular. |
| **TC-08** | **Preservação de Efeito do Pisca** | Validar que a controladora original não perde configuração | Ligar o pisca-pisca pelo site, selecionar um efeito de fade na caixinha, desligar pelo site e religar após 10 segundos. | O pisca-pisca deve acender preservando o efeito previamente ajustado pelo usuário. |
| **TC-09** | **Reconexão Bluetooth BLE** | Validar estabilidade da reconexão | Conectar via BLE no Chrome, afastar o celular até perder o sinal e retornar ao alcance. | O site deve alertar a desconexão e permitir reconexão limpa com um toque em *"Conectar BLE"*. |
| **TC-10** | **Modo Demonstração** | Validação sem hardware físico | Ativar o *"Modo Demo"* no site com ESP32 desligado. | Todos os botões e comandos de voz devem responder na tela, simulando os estados sem travar a interface. |

---

## 2. Formulário de Registro de Homologação

- **Data do Teste:** _____/_____/2026
- **Responsável Técnico:** __________________________________
- **Número de Série do ESP32:** _____________________________
- **Modelo Identificado do Motor:** __________________________
- **Alimentação Medida no Pisca-Pisca:** [ ] 5V USB  [ ] 12V DC  [ ] Pilhas  [ ] 127/220V AC
- **Resultado Geral:** [ ] APROVADO PARA USO INFANTIL  [ ] REPROVADO (Pendências registradas)
