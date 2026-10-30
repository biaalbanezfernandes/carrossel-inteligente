#include "WiFiModule.h"

WiFiModule::WiFiModule(StateManager &stateMgr, SafetyManager &safetyMgr)
  : stateManagerRef(stateMgr),
    safetyManagerRef(safetyMgr),
    httpServer(HTTP_SERVER_PORT),
    wsServer(WEBSOCKET_PORT),
    connectedClientsCount(0) {}

void WiFiModule::begin() {
  // Inicializa o ESP32 como Ponto de Acesso (AP) seguro para o celular
  WiFi.mode(WIFI_AP);
  WiFi.softAP(WIFI_AP_SSID, WIFI_AP_PASSWORD);

  Serial.println("\n[Wi-Fi] Ponto de Acesso ativado com sucesso!");
  Serial.print("[Wi-Fi] Rede SSID: ");
  Serial.println(WIFI_AP_SSID);
  Serial.print("[Wi-Fi] IP do ESP32: ");
  Serial.println(WiFi.softAPIP());

  // Configuração das rotas HTTP REST
  setupRoutes();
  httpServer.begin();

  // Configuração do Servidor WebSocket
  wsServer.begin();
  wsServer.onEvent([this](uint8_t num, WStype_t type, uint8_t *payload, size_t length) {
    this->handleWsEvent(num, type, payload, length);
  });
  Serial.printf("[Wi-Fi] WebSocket ativo na porta %d\n", WEBSOCKET_PORT);
}

void WiFiModule::loop() {
  httpServer.handleClient();
  wsServer.loop();
}

void WiFiModule::broadcastState(const String &jsonState) {
  wsServer.broadcastTXT(jsonState);
}

void WiFiModule::setupRoutes() {
  // CORS Headers para permitir requisições do site rodando local ou remotamente
  httpServer.enableCORS(true);

  // Ping de conectividade
  httpServer.on("/api/ping", HTTP_GET, [this]() {
    safetyManagerRef.feedWatchdog();
    httpServer.send(200, "application/json", "{\"status\":\"ok\",\"msg\":\"pong\"}");
  });

  // Consulta de status completo
  httpServer.on("/api/status", HTTP_GET, [this]() {
    safetyManagerRef.feedWatchdog();
    httpServer.send(200, "application/json", stateManagerRef.getSerializedState());
  });

  // Controle Mestre Geral
  httpServer.on("/api/power", HTTP_POST, [this]() {
    safetyManagerRef.feedWatchdog();
    if (httpServer.hasArg("plain")) {
      parseJsonCommand(httpServer.arg("plain").c_str());
    }
    httpServer.send(200, "application/json", stateManagerRef.getSerializedState());
  });

  // Controle Individual Motor
  httpServer.on("/api/motor", HTTP_POST, [this]() {
    safetyManagerRef.feedWatchdog();
    if (httpServer.hasArg("plain")) {
      parseJsonCommand(httpServer.arg("plain").c_str());
    }
    httpServer.send(200, "application/json", stateManagerRef.getSerializedState());
  });

  // Controle Individual Áudio
  httpServer.on("/api/audio", HTTP_POST, [this]() {
    safetyManagerRef.feedWatchdog();
    if (httpServer.hasArg("plain")) {
      parseJsonCommand(httpServer.arg("plain").c_str());
    }
    httpServer.send(200, "application/json", stateManagerRef.getSerializedState());
  });

  // Controle Individual Pisca-Pisca
  httpServer.on("/api/light", HTTP_POST, [this]() {
    safetyManagerRef.feedWatchdog();
    if (httpServer.hasArg("plain")) {
      parseJsonCommand(httpServer.arg("plain").c_str());
    }
    httpServer.send(200, "application/json", stateManagerRef.getSerializedState());
  });
}

void WiFiModule::handleWsEvent(uint8_t num, WStype_t type, uint8_t *payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED:
      connectedClientsCount++;
      Serial.printf("[WebSocket] Cliente #%u conectado.\n", num);
      safetyManagerRef.feedWatchdog();
      // Envia imediatamente o estado atualizado para o cliente conectado
      wsServer.sendTXT(num, stateManagerRef.getSerializedState());
      break;

    case WStype_DISCONNECTED:
      if (connectedClientsCount > 0) connectedClientsCount--;
      Serial.printf("[WebSocket] Cliente #%u desconectado.\n", num);
      break;

    case WStype_TEXT: {
      safetyManagerRef.feedWatchdog();
      String msg = String((char *)payload);
      parseJsonCommand(msg.c_str());
      break;
    }

    default:
      break;
  }
}

void WiFiModule::parseJsonCommand(const char *jsonStr) {
  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, jsonStr);
  if (err) {
    Serial.printf("[Wi-Fi CMD] Erro ao deserializar JSON: %s\n", err.c_str());
    return;
  }

  const char *cmd = doc["cmd"];
  if (!cmd) return;

  bool value = doc["value"] | false;

  if (strcmp(cmd, "POWER") == 0) {
    stateManagerRef.setMasterPower(value);
  } else if (strcmp(cmd, "MOTOR") == 0) {
    uint8_t speed = doc["speed"] | (value ? 255 : 0);
    stateManagerRef.setMotor(value, speed);
  } else if (strcmp(cmd, "AUDIO") == 0) {
    stateManagerRef.setAudio(value);
  } else if (strcmp(cmd, "LIGHT") == 0) {
    stateManagerRef.setLight(value);
  } else if (strcmp(cmd, "GET_STATE") == 0) {
    // Apenas solicitando estado atual
    broadcastState(stateManagerRef.getSerializedState());
  }
}
