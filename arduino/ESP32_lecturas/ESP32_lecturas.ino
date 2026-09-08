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

#define PIN_BUZZER 8

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

bool enviarLectura(int sensorId, float valor, bool* alerta) {
  if (WiFi.status() != WL_CONNECTED) {
    return false;
  }
  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");
  String body = "{\"sensor_id\":" + String(sensorId) + ",\"valor\":" + String(valor, 2) + "}";
  int codigo = http.POST(body);
  if (codigo > 0) {
    String respuesta = http.getString();
    *alerta = respuesta.indexOf("\"alerta\":true") != -1;
    Serial.printf("sensor %d = %.2f -> HTTP %d %s\n", sensorId, valor, codigo, *alerta ? "(FUERA DE RANGO)" : "");
  } else {
    *alerta = false;
    Serial.printf("sensor %d = %.2f -> HTTP %d\n", sensorId, valor, codigo);
  }
  http.end();
  return codigo == 201;
}

void sonarAlarma() {
  Serial.println("ALARMA: lectura fuera de rango");
  for (int i = 0; i < 5; i++) {
    tone(PIN_BUZZER, 2200);
    delay(200);
    noTone(PIN_BUZZER);
    delay(200);
  }
}

void beepInicio() {
  for (int i = 0; i < 3; i++) {
    tone(PIN_BUZZER, 1500);
    delay(150);
    noTone(PIN_BUZZER);
    delay(100);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);
  beepInicio();
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
    bool alertaTemp = false;
    bool alertaHum = false;
    enviarLectura(SENSOR_ID_TEMP, temp, &alertaTemp);
    enviarLectura(SENSOR_ID_HUM, hum, &alertaHum);
    if (alertaTemp || alertaHum) {
      sonarAlarma();
    }
  }
}
