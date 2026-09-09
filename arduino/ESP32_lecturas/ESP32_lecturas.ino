#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <driver/gpio.h>

const char* WIFI_SSID = "MovistarFibra-E059F0";
const char* WIFI_PASS = "eTQ7HF284AAe27fs86Fo";
// IMPORTANTE: cuando el sistema esté desplegado en Render (o cualquier servidor
// público), cambiá API_URL por la URL pública del servidor, por ejemplo:
//   const char* API_URL = "https://invernaderos-app.onrender.com/api/lecturas";
const char* API_URL = "http://192.168.1.42:3000/api/lecturas";

const int SENSOR_ID_TEMP = 1;
const int SENSOR_ID_HUM = 3;

#define PIN_DHT 4
#define PIN_BUZZER 6
#define DHTTYPE DHT11
DHT dht(PIN_DHT, DHTTYPE);

void beep(int veces, int duracion) {
  int freq = 2200;
  ledcAttach(PIN_BUZZER, freq, 8);
  for (int i = 0; i < veces; i++) {
    ledcWrite(PIN_BUZZER, 180);
    delay(duracion);
    ledcWrite(PIN_BUZZER, 0);
    delay(duracion / 2);
  }
  ledcDetach(PIN_BUZZER);
  digitalWrite(PIN_BUZZER, LOW);
}

const float TEMP_MAX = 10.0;
const unsigned long INTERVALO_MS = 5000UL;
unsigned long ultimaLectura = 0;

bool conectarWiFi() {
  if (WiFi.status() == WL_CONNECTED) return true;
  WiFi.disconnect();
  delay(200);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Conectando a WiFi");
  unsigned long inicio = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - inicio < 15000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("Conectado! IP: " + WiFi.localIP().toString());
    return true;
  }
  Serial.printf("Fallo. WiFi status: %d\n", WiFi.status());
  WiFi.disconnect();
  return false;
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_BUZZER, OUTPUT);
  gpio_set_drive_capability((gpio_num_t)PIN_BUZZER, GPIO_DRIVE_CAP_3);
  digitalWrite(PIN_BUZZER, LOW);
  delay(2000);
  Serial.println("=== Placa arrancada ===");

  beep(2, 150);

  int n = WiFi.scanNetworks();
  Serial.printf("Redes encontradas: %d\n", n);
  for (int i = 0; i < n; i++) {
    Serial.printf("  %d: %s (%d dBm) %s\n", i + 1, WiFi.SSID(i).c_str(), WiFi.RSSI(i), WiFi.encryptionType(i) == WIFI_AUTH_OPEN ? "[ABIERTA]" : "");
  }

  conectarWiFi();

  dht.begin();
  ultimaLectura = millis();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    static unsigned long ultimoIntento = 0;
    if (millis() - ultimoIntento > 30000) {
      ultimoIntento = millis();
      conectarWiFi();
    }
    delay(1000);
    return;
  }

  if (millis() - ultimaLectura >= INTERVALO_MS) {
    ultimaLectura = millis();
    float temp = dht.readTemperature();
    float hum = dht.readHumidity();
    if (isnan(temp) || isnan(hum)) {
      Serial.println("Error leyendo el DHT11");
      return;
    }

    if (temp > TEMP_MAX) {
      beep(3, 120);
      digitalWrite(PIN_BUZZER, LOW);
      Serial.printf("ALERTA: %.2f°C > %.1f°C\n", temp, TEMP_MAX);
    } else {
      digitalWrite(PIN_BUZZER, LOW);
    }

    HTTPClient http;
    http.begin(API_URL);
    http.addHeader("Content-Type", "application/json");
    String body = "{\"sensor_id\":" + String(SENSOR_ID_TEMP) + ",\"valor\":" + String(temp, 2) + "}";
    int cod = http.POST(body);
    Serial.printf("sensor %d = %.2f -> HTTP %d\n", SENSOR_ID_TEMP, temp, cod);
    http.end();

    http.begin(API_URL);
    http.addHeader("Content-Type", "application/json");
    body = "{\"sensor_id\":" + String(SENSOR_ID_HUM) + ",\"valor\":" + String(hum, 2) + "}";
    cod = http.POST(body);
    Serial.printf("sensor %d = %.2f -> HTTP %d\n", SENSOR_ID_HUM, hum, cod);
    http.end();
  }
}
