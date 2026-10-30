#ifndef LIGHT_MODULE_H
#define LIGHT_MODULE_H

#include <Arduino.h>
#include "Config.h"

/**
 * Módulo de Controle do Pisca-Pisca de Natal Colorido
 * IMPORTANTE:
 * - Destinado ao acionamento liga/desliga de um conjunto de pisca-pisca tradicional.
 * - Preserva a controladora original de efeitos do pisca-pisca.
 * - A alimentação real do pisca-pisca permanece como REQUISITO PENDENTE até medição.
 * - O sinal deste módulo controla o gate de um driver MOSFET de nível lógico ou relé isolado.
 * - O firmware NUNCA liga carga de potência diretamente ao GPIO do ESP32.
 */
class LightModule {
public:
  LightModule();
  void begin();

  void turnOn();
  void turnOff();
  void toggle();

  bool isOn() const { return state; }

private:
  bool state;
  void applyState();
};

#endif // LIGHT_MODULE_H
