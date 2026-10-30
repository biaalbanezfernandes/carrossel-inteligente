#include "LightModule.h"

LightModule::LightModule() : state(false) {}

void LightModule::begin() {
  pinMode(PIN_LIGHT_CONTROL, OUTPUT);
  // REGRA DE SEGURANÇA: Inicia obrigatoriamente desligado
  turnOff();
}

void LightModule::turnOn() {
  state = true;
  applyState();
}

void LightModule::turnOff() {
  state = false;
  applyState();
}

void LightModule::toggle() {
  state = !state;
  applyState();
}

void LightModule::applyState() {
  // Nível alto ativa o circuito de driver (MOSFET canal N ou Relé módulo com acionamento em HIGH)
  digitalWrite(PIN_LIGHT_CONTROL, state ? HIGH : LOW);
}
