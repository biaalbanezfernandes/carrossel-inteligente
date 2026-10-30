#include "BLEModule.h"

BLEModule::BLEModule(StateManager &stateMgr, SafetyManager &safetyMgr)
  : stateManagerRef(stateMgr),
    safetyManagerRef(safetyMgr),
    pServer(nullptr),
    pService(nullptr),
    pCmdChar(nullptr),
    pStateChar(nullptr),
    deviceConnected(false),
    oldDeviceConnected(false) {}

void BLEModule::begin() {
  BLEDevice::init(BLE_DEVICE_NAME);

  // Cria o Servidor BLE
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(this);

  // Cria o Serviço GATT Customizado
  pService = pServer->createService(BLE_SERVICE_UUID);

  // Característica de COMANDO (Recebe escrita do celular)
  pCmdChar = pService->createCharacteristic(
    BLE_CHAR_CMD_UUID,
    BLECharacteristic::PROPERTY_WRITE |
    BLECharacteristic::PROPERTY_WRITE_NR
  );
  pCmdChar->setCallbacks(this);

  // Característica de ESTADO (Envia notificações para o celular)
  pStateChar = pService->createCharacteristic(
    BLE_CHAR_STATE_UUID,
    BLECharacteristic::PROPERTY_READ |
    BLECharacteristic::PROPERTY_NOTIFY
  );
  pStateChar->addDescriptor(new BLE2902());

  // Inicia o serviço
  pService->start();

  // Inicia o Advertising (Anúncio BLE para descoberta pelo celular)
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(BLE_SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06); // Funções para auxiliar conexão rápida no iPhone/Android
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println("[BLE] Serviço Bluetooth GATT iniciado e anunciando com sucesso!");
}

void BLEModule::loop() {
  // Trata desconexão e reinicia propaganda de anúncio automaticamente
  if (!deviceConnected && oldDeviceConnected) {
    delay(200); // Pausa para stack bluetooth reorganizar
    pServer->startAdvertising();
    Serial.println("[BLE] Reiniciando advertising após desconexão...");
    oldDeviceConnected = deviceConnected;
  }
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
  }
}

void BLEModule::onConnect(BLEServer *pServer) {
  deviceConnected = true;
  safetyManagerRef.feedWatchdog();
  Serial.println("[BLE] Celular conectado via Bluetooth GATT!");
  // Envia estado inicial imediatamente
  notifyState(stateManagerRef.getSerializedState());
}

void BLEModule::onDisconnect(BLEServer *pServer) {
  deviceConnected = false;
  Serial.println("[BLE] Celular desconectado.");
}

void BLEModule::onWrite(BLECharacteristic *pCharacteristic) {
  std::string value = pCharacteristic->getValue();
  if (value.length() > 0) {
    safetyManagerRef.feedWatchdog();
    Serial.printf("[BLE CMD] Recebido: %s\n", value.c_str());
    parseJsonCommand(value.c_str());
  }
}

void BLEModule::notifyState(const String &jsonState) {
  if (deviceConnected && pStateChar) {
    pStateChar->setValue((uint8_t *)jsonState.c_str(), jsonState.length());
    pStateChar->notify();
  }
}

void BLEModule::parseJsonCommand(const char *jsonStr) {
  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, jsonStr);
  if (err) {
    Serial.printf("[BLE CMD] Erro ao deserializar JSON: %s\n", err.c_str());
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
    notifyState(stateManagerRef.getSerializedState());
  }
}
