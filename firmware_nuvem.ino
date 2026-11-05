/*
  Carrossel Maker - ESP32 + L298N controlado pelo site via nuvem (MQTT)
  Placa: ESP32 Dev Module
  Biblioteca: "PubSubClient" (Nick O'Leary) - Ferramentas > Gerenciar Bibliotecas

  Ligações L298N: IN1 = GPIO 26, IN2 = GPIO 27
  ENA: deixe o jumper (motor em velocidade total controlada pelo PWM no IN1)
*/

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>

// ---- PREENCHA ----
const char* WIFI_SSID = "SEU_WIFI";
const char* WIFI_PASS = "SUA_SENHA_WIFI";
const char* MQTT_HOST = "SEU-CLUSTER.s1.eu.hivemq.cloud";
const int   MQTT_PORT = 8883;
const char* MQTT_USER = "SEU_USUARIO_ESP32";
const char* MQTT_PASS = "SUA_SENHA_ESP32";
// ------------------

const char* TOPIC_CMD   = "carrossel/maker/cmd";
const char* TOPIC_STATE = "carrossel/maker/state";

#define PIN_IN1 26
#define PIN_IN2 27
#define PWM_FREQ 20000
#define PWM_BITS 8

const unsigned long FAILSAFE_MS = 10000;  // sem batimento do site por 10s = para o motor
const unsigned long RAMP_MS = 15;

WiFiClientSecure net;
PubSubClient mqtt(net);

bool motorOn = false;
uint8_t currentSpeed = 0;
uint8_t targetSpeed = 0;
unsigned long lastRamp = 0;
unsigned long lastPing = 0;
unsigned long lastMqttTry = 0;

void pwmWrite(uint8_t v) {
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  ledcWrite(PIN_IN1, v);
#else
  ledcWrite(0, v);
#endif
}

void publishState(bool online = true) {
  char buf[160];
  snprintf(buf, sizeof(buf),
    "{\"type\":\"state\",\"payload\":{\"power\":%s,\"motor\":%s,\"speed\":%u,\"uptime\":%lu,\"online\":%s}}",
    motorOn ? "true" : "false", motorOn ? "true" : "false",
    (unsigned)targetSpeed, millis() / 1000, online ? "true" : "false");
  mqtt.publish(TOPIC_STATE, buf, true);  // retida: o site vê o último estado ao abrir
}

void setMotor(bool on, uint8_t speed, bool immediate) {
  motorOn = on;
  targetSpeed = on ? speed : 0;
  digitalWrite(PIN_IN2, LOW);
  if (!on && immediate) {
    currentSpeed = 0;
    pwmWrite(0);
  }
  if (mqtt.connected()) publishState();
}

// Leitura simples do JSON enviado pelo site: {"cmd":"MOTOR","value":true,"speed":217,...}
bool hasCmd(const String& s, const char* name) {
  return s.indexOf(String("\"cmd\":\"") + name + "\"") >= 0;
}
bool valueIsTrue(const String& s) {
  return s.indexOf("\"value\":true") >= 0;
}
uint8_t readSpeed(const String& s) {
  int i = s.indexOf("\"speed\":");
  if (i < 0) return 220;
  int v = s.substring(i + 8).toInt();
  return (uint8_t)constrain(v, 0, 255);
}

void onMessage(char* topic, byte* payload, unsigned int len) {
  String msg;
  msg.reserve(len);
  for (unsigned int i = 0; i < len; i++) msg += (char)payload[i];
  lastPing = millis();  // qualquer mensagem do site conta como batimento

  if (hasCmd(msg, "PING")) return;
  if (hasCmd(msg, "POWER") || hasCmd(msg, "MOTOR")) {
    bool on = valueIsTrue(msg);
    uint8_t spd = readSpeed(msg);
    if (on && spd < 60) spd = 60;  // abaixo disso o motor não gira
    setMotor(on, spd, false);
    Serial.printf("[CMD] motor %s (pwm %u)\n", on ? "LIGADO" : "DESLIGADO", spd);
  } else if (hasCmd(msg, "GET_STATE")) {
    publishState();
  }
}

void connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  static unsigned long lastTry = 0;
  if (millis() - lastTry < 5000 && lastTry != 0) return;
  lastTry = millis();
  Serial.println("[WiFi] conectando...");
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASS);
}

void connectMqtt() {
  if (WiFi.status() != WL_CONNECTED || mqtt.connected()) return;
  if (millis() - lastMqttTry < 5000 && lastMqttTry != 0) return;
  lastMqttTry = millis();

  const char* willMsg =
    "{\"type\":\"state\",\"payload\":{\"power\":false,\"motor\":false,\"speed\":0,\"online\":false}}";
  String id = "esp32-carrossel-" + String((uint32_t)ESP.getEfuseMac(), HEX);
  Serial.println("[MQTT] conectando...");
  if (mqtt.connect(id.c_str(), MQTT_USER, MQTT_PASS, TOPIC_STATE, 0, true, willMsg)) {
    mqtt.subscribe(TOPIC_CMD);
    lastPing = millis();
    publishState();
    Serial.println("[MQTT] conectado");
  } else {
    Serial.printf("[MQTT] falhou, rc=%d\n", mqtt.state());
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_IN2, OUTPUT);
  digitalWrite(PIN_IN2, LOW);
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  ledcAttach(PIN_IN1, PWM_FREQ, PWM_BITS);
#else
  ledcSetup(0, PWM_FREQ, PWM_BITS);
  ledcAttachPin(PIN_IN1, 0);
#endif
  pwmWrite(0);  // motor sempre começa desligado

  WiFi.mode(WIFI_STA);
  net.setInsecure();  // não valida o certificado (suficiente para o projeto escolar)
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMessage);
  mqtt.setBufferSize(512);
  mqtt.setSocketTimeout(5);
  connectWifi();
}

void loop() {
  connectWifi();

  // Perdeu a nuvem: para o motor na hora, antes de tentar reconectar
  if (!mqtt.connected()) {
    if (motorOn) {
      Serial.println("[SEGURANCA] sem nuvem, motor parado");
      setMotor(false, 0, true);
    }
    connectMqtt();
  } else {
    mqtt.loop();
  }

  // Failsafe: site parou de enviar batimento (celular sem sinal, aba fechada)
  if (motorOn && millis() - lastPing > FAILSAFE_MS) {
    Serial.println("[SEGURANCA] sem batimento do site, motor parado");
    setMotor(false, 0, true);
  }

  // Rampa suave: sobe de 5 em 5, desce de 15 em 15
  unsigned long now = millis();
  if (now - lastRamp >= RAMP_MS) {
    lastRamp = now;
    if (currentSpeed < targetSpeed) {
      currentSpeed = (currentSpeed + 5 >= targetSpeed) ? targetSpeed : currentSpeed + 5;
      pwmWrite(currentSpeed);
    } else if (currentSpeed > targetSpeed) {
      currentSpeed = (currentSpeed <= targetSpeed + 15) ? targetSpeed : currentSpeed - 15;
      pwmWrite(currentSpeed);
    }
  }
}
