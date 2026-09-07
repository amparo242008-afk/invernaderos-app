#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>

const char* WIFI_SSID = "TU_RED_WIFI";
const char* WIFI_PASS = "TU_PASSWORD_WIFI";
const char* API_URL = "http://192.168.1.50:3000/api/lecturas";

const int SENSOR_ID_TEMP = 1;
const int SENSOR_ID_HUM = 2;

#define PIN_DHT 4
#define DHTTYPE DHT11
DHT dht(PIN_DHT, DHTTYPE);

const unsigned long INTERVALO_MS = 30000UL;
unsigned long ultimaLectura = 0;

void conectarWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Conectando a WiFi");
  unsigned long inicio = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - inicio < 20000) {
    delay(500);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("");
    Serial.print("Conectado, IP local: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("");
    Serial.println("No se pudo conectar, se reintenta en el proximo ciclo.");
  }
}

bool enviarLectura(int sensorId, float valor) {
  if (WiFi.status() != WL_CONNECTED) {
    return false;
  }
  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");
  String body = "{\"sensor_id\":" + String(sensorId) + ",\"valor\":" + String(valor, 2) + "}";
  int codigo = http.POST(body);
  Serial.printf("sensor %d = %.2f -> HTTP %d\n", sensorId, valor, codigo);
  http.end();
  return codigo == 201;
}

void setup() {
  Serial.begin(115200);
  dht.begin();
  conectarWiFi();
}

void loop() {
  if (millis() - ultimaLectura >= INTERVALO_MS) {
    ultimaLectura = millis();
    float temp = dht.readTemperature();
    float hum = dht.readHumidity();
    if (isnan(temp) || isnan(hum)) {
      Serial.println("Error leyendo el DHT11");
      return;
    }
    enviarLectura(SENSOR_ID_TEMP, temp);
    enviarLectura(SENSOR_ID_HUM, hum);
  }
}
