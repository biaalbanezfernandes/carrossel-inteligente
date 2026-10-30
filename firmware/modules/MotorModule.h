#ifndef MOTOR_MODULE_H
#define MOTOR_MODULE_H

#include <Arduino.h>
#include "Config.h"

/**
 * Módulo de Controle do Motor do Carrossel
 * Responsável pela rotação segura, partida em rampa suave (soft-start)
 * e parada com freio elétrico.
 */
class MotorModule {
public:
  MotorModule();
  void begin();
  void update(); // Chamado no loop principal para gerenciar rampa de PWM

  void start(uint8_t targetSpeed = 255);
  void stop(bool immediate = false);

  bool isRunning() const { return currentSpeed > 0; }
  uint8_t getSpeed() const { return currentSpeed; }
  bool getTargetActive() const { return targetActive; }

private:
  uint8_t currentSpeed;
  uint8_t targetSpeed;
  bool targetActive;
  unsigned long lastRampTime;

  void applyPwm(uint8_t duty);
  void setBrake();
  void setCoast();
};

#endif // MOTOR_MODULE_H
