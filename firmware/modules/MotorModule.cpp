#include "MotorModule.h"

MotorModule::MotorModule()
  : currentSpeed(0), targetSpeed(0), targetActive(false), lastRampTime(0) {}

void MotorModule::begin() {
  pinMode(PIN_MOTOR_IN1, OUTPUT);
  pinMode(PIN_MOTOR_IN2, OUTPUT);
  pinMode(PIN_MOTOR_PWM, OUTPUT);

  // Configura periférico LEDC para modulação PWM
  ledcSetup(PWM_MOTOR_CHANNEL, PWM_MOTOR_FREQ, PWM_MOTOR_RESOLUTION);
  ledcAttachPin(PIN_MOTOR_PWM, PWM_MOTOR_CHANNEL);

  // REGRA DE SEGURANÇA: Garante estado inicial 100% desligado e travado
  stop(true);
}

void MotorModule::start(uint8_t speed) {
  targetActive = true;
  targetSpeed = (speed > 0) ? speed : 255;
}

void MotorModule::stop(bool immediate) {
  targetActive = false;
  targetSpeed = 0;

  if (immediate) {
    currentSpeed = 0;
    applyPwm(0);
    setBrake();
  }
}

void MotorModule::update() {
  unsigned long now = millis();
  if (now - lastRampTime < MOTOR_RAMP_STEP_MS) {
    return;
  }
  lastRampTime = now;

  // Lógica da Rampa Suave de Aceleração / Desaceleração
  if (targetActive) {
    if (currentSpeed < targetSpeed) {
      if (currentSpeed + MOTOR_RAMP_ACCEL_STEP > targetSpeed) {
        currentSpeed = targetSpeed;
      } else {
        currentSpeed += MOTOR_RAMP_ACCEL_STEP;
      }
      // Sentido de rotação horário
      digitalWrite(PIN_MOTOR_IN1, HIGH);
      digitalWrite(PIN_MOTOR_IN2, LOW);
      applyPwm(currentSpeed);
    }
  } else {
    // Desaceleração suave até a parada completa
    if (currentSpeed > 0) {
      if (currentSpeed <= MOTOR_RAMP_ACCEL_STEP) {
        currentSpeed = 0;
        applyPwm(0);
        setBrake();
      } else {
        currentSpeed -= MOTOR_RAMP_ACCEL_STEP;
        applyPwm(currentSpeed);
      }
    } else {
      setCoast();
    }
  }
}

void MotorModule::applyPwm(uint8_t duty) {
  ledcWrite(PWM_MOTOR_CHANNEL, duty);
}

void MotorModule::setBrake() {
  // Freio ativo: ambos os terminais da ponte H em nível alto ou baixo
  digitalWrite(PIN_MOTOR_IN1, LOW);
  digitalWrite(PIN_MOTOR_IN2, LOW);
}

void MotorModule::setCoast() {
  digitalWrite(PIN_MOTOR_IN1, LOW);
  digitalWrite(PIN_MOTOR_IN2, LOW);
}
