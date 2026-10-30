#ifndef WIFI_MODULE_H
#define WIFI_MODULE_H

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>
#include "Config.h"
#include "StateManager.h"
#include "SafetyManager.h"

/**
 * WiFiModule: Servidor HTTP REST e WebSocket em tempo real para o ESP32
 */
class WiFiModule {
public:
  WiFiModule(StateManager &stateMgr, SafetyManager &safetyMgr);
  void begin();
  void loop();

  void broadcastState(const String &jsonState);
  bool isClientConnected() const { return connectedClientsCount > 0; }

private:
  StateManager &stateManagerRef;
  SafetyManager &safetyManagerRef;

  WebServer httpServer;
  WebSocketsServer wsServer;
  int connectedClientsCount;

  void setupRoutes();
  void handleWsEvent(uint8_t num, WStype_t type, uint8_t *payload, size_t length);
  void parseJsonCommand(const char *jsonStr);
};

#endif // WIFI_MODULE_H
