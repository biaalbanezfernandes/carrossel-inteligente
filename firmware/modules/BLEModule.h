#ifndef BLE_MODULE_H
#define BLE_MODULE_H

#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <ArduinoJson.h>
#include "Config.h"
#include "StateManager.h"
#include "SafetyManager.h"

/**
 * BLEModule: Comunicação Bluetooth Low Energy nativa do ESP32
 */
class BLEModule : public BLEServerCallbacks, public BLECharacteristicCallbacks {
public:
  BLEModule(StateManager &stateMgr, SafetyManager &safetyMgr);
  void begin();
  void loop();

  void notifyState(const String &jsonState);
  bool isConnected() const { return deviceConnected; }

  // Callbacks BLE
  void onConnect(BLEServer *pServer) override;
  void onDisconnect(BLEServer *pServer) override;
  void onWrite(BLECharacteristic *pCharacteristic) override;

private:
  StateManager &stateManagerRef;
  SafetyManager &safetyManagerRef;

  BLEServer *pServer;
  BLEService *pService;
  BLECharacteristic *pCmdChar;
  BLECharacteristic *pStateChar;

  bool deviceConnected;
  bool oldDeviceConnected;

  void parseJsonCommand(const char *jsonStr);
};

#endif // BLE_MODULE_H
