// Variables globales
let client;
let isConnected = false;
let temperatureData = [];
let temperatureChart;

// Elementos DOM
const statusIndicator = document.getElementById("status-indicator");
const statusText = document.getElementById("status-text");
const connectBtn = document.getElementById("connect-btn");
const disconnectBtn = document.getElementById("disconnect-btn");
const temperatureEl = document.getElementById("temperature");
const humidityEl = document.getElementById("humidity");
const messageLog = document.getElementById("message-log");

// Inicializar gráfico
function initChart() {
  const ctx = document.getElementById("temperature-chart").getContext("2d");
  temperatureChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Temperatura °C",
          data: temperatureData,
          borderColor: "#2563eb",
          tension: 0.1,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: false,
        },
      },
    },
  });
}

// Conectar al broker MQTT
function connectToBroker() {
  const host = document.getElementById("broker-host").value;
  const port = parseInt(document.getElementById("broker-port").value);
  const clientId = Math.floor(Math.random() * 1000);

  console.log(
    "Connecting to broker at " +
      host +
      ":" +
      port +
      " with Client ID: " +
      clientId
  );

  client = new Paho.Client(host, port, "clientId");

  client.onConnectionLost = onConnectionLost;
  client.onMessageArrived = onMessageArrived;

  const options = {
    timeout: 3,
    onSuccess: onConnect,
    onFailure: onFailure,
    useSSL: true,
  };

  client.connect(options);
}

// Callback de conexión exitosa
function onConnect() {
  isConnected = true;
  updateConnectionStatus(true);
  addMessageToLog("Conectado al broker MQTT");

  // Suscribirse a los temas
  client.subscribe("smarthome/web/temp");
  client.subscribe("smarthome/web/hum");
  client.subscribe("smarthome/web/luz1");
  client.subscribe("smarthome/web/luz2");
  client.subscribe("smarthome/web/caloventor");
  client.subscribe("smarthome/web/ventilador");
  client.subscribe("smarthome/web/alarma");
  addMessageToLog(
    "Suscrito a temas: smarthome/web/temp, smarthome/web/hum, smarthome/web/luz1, smarthome/web/luz2, smarthome/web/caloventor, smarthome/web/ventilador, smarthome/web/alarma"
  );
}

// Callback de fallo de conexión
function onFailure() {
  addMessageToLog("Error al conectar con el broker");
  updateConnectionStatus(false);
}

// Callback de pérdida de conexión
function onConnectionLost(responseObject) {
  if (responseObject.errorCode !== 0) {
    addMessageToLog("Conexión perdida: " + responseObject.errorMessage);
    updateConnectionStatus(false);
  }
}

// Callback de mensaje recibido
function onMessageArrived(message) {
  /* addMessageToLog(
    "Mensaje recibido: [" +
      message.destinationName +
      "] " +
      message.payloadString
  ); */

  // Procesar según el topic
  switch (message.destinationName) {
    case "smarthome/web/temp":
      const temp = parseFloat(message.payloadString);
      temperatureEl.textContent = temp.toFixed(1);

      // Actualizar gráfico
      temperatureData.push(temp);
      if (temperatureData.length > 15) temperatureData.shift();

      temperatureChart.data.labels = Array.from(
        { length: temperatureData.length },
        (_, i) => i + 1
      );
      temperatureChart.data.datasets[0].data = temperatureData;
      temperatureChart.update();
      break;

    case "smarthome/web/hum":
      humidityEl.textContent = parseFloat(message.payloadString).toFixed(1);
      break;

    case "smarthome/web/luz1":
      if (message.payloadString === "ON") {
        addMessageToLog("Estado de luz 1 => encendida");
      } else if (message.payloadString === "OFF") {
        addMessageToLog("Estado de luz 1 => apagada");
      } else {
        addMessageToLog("Estado de luz 1 => desconocido");
      }
      break;
    case "smarthome/web/luz2":
      if (message.payloadString === "ON") {
        addMessageToLog("Estado de luz 2 => encendida");
      } else if (message.payloadString === "OFF") {
        addMessageToLog("Estado de luz 2 => apagada");
      } else {
        addMessageToLog("Estado de luz 2 => desconocido");
      }
      break;
    case "smarthome/web/caloventor":
      if (message.payloadString === "ON") {
        addMessageToLog("Estado de caloventor => encendido");
      } else if (message.payloadString === "OFF") {
        addMessageToLog("Estado de caloventor => apagado");
      } else {
        addMessageToLog("Estado de caloventor => desconocido");
      }
      break;
    case "smarthome/web/alarma":
      if (message.payloadString === "ON") {
        addMessageToLog("Estado de alarma => activada");
      } else if (message.payloadString === "OFF") {
        addMessageToLog("Estado de alarma => desactivada");
      } else {
        addMessageToLog("Estado de alarma => desconocido");
      }
      break;
  }
}

// Publicar mensaje
function publishMessage(topic, message) {
  if (!isConnected) {
    addMessageToLog("Error: No conectado al broker");
    return;
  }

  const mqttMessage = new Paho.Message(message);
  mqttMessage.destinationName = topic;
  client.send(mqttMessage);
  addMessageToLog("Mensaje enviado: [" + topic + "] " + message);
}

// Actualizar estado de conexión en UI
function updateConnectionStatus(connected) {
  isConnected = connected;

  if (connected) {
    statusIndicator.classList.remove("disconnected");
    statusIndicator.classList.add("connected");
    statusText.textContent = "Conectado";
  } else {
    statusIndicator.classList.remove("connected");
    statusIndicator.classList.add("disconnected");
    statusText.textContent = "Desconectado";
  }
}

// Añadir mensaje al log
function addMessageToLog(message) {
  const now = new Date(); //Esto se deberuia cambiar por la hora del RTC del esp32
  const timeString = now.toLocaleTimeString();
  const messageElement = document.createElement("p");
  messageElement.textContent = `[${timeString}] ${message}`;
  messageLog.appendChild(messageElement);
  messageLog.scrollTop = messageLog.scrollHeight;
}

// Event Listeners
connectBtn.addEventListener("click", function () {
  addMessageToLog("Conectando al broker...");
  connectToBroker();
});

disconnectBtn.addEventListener("click", function () {
  if (client && isConnected) {
    client.disconnect();
    updateConnectionStatus(false);
    addMessageToLog("Desconectado del broker");
  }
});

/*
  Envio de mensajes para que el ESP32 controle los dispositivos
*/
const deviceStates = {
  luz1: false,
  luz2: false,
  caloventor: false,
  ventilador: false,
  alarma: false,
};

function cambioEstado(event, topic) {
  const boton = event.currentTarget;

  if (!isConnected) return;

  // Cambiar el estado global

  const state = deviceStates[topic];

  if (state) {
    boton.classList.remove("btn-danger");
    boton.classList.add("btn-success");
    boton.textContent =
      boton.textContent.split(" ").slice(0, -1).join(" ") + " encendida";
    publishMessage(`smarthome/esp32/${topic}`, "ON");
  } else {
    boton.classList.remove("btn-success");
    boton.classList.add("btn-danger");
    boton.textContent =
      boton.textContent.split(" ").slice(0, -1).join(" ") + " apagada";
    publishMessage(`smarthome/esp32/${topic}`, "OFF");
  }
  deviceStates[topic] = !deviceStates[topic];
}

document
  .getElementById("luz1")
  .addEventListener("click", (e) => cambioEstado(e, "luz1"));
document
  .getElementById("luz2")
  .addEventListener("click", (e) => cambioEstado(e, "luz2"));
document
  .getElementById("calo")
  .addEventListener("click", (e) => cambioEstado(e, "caloventor"));
document
  .getElementById("venti")
  .addEventListener("click", (e) => cambioEstado(e, "ventilador"));
document
  .getElementById("alarma")
  .addEventListener("click", (e) => cambioEstado(e, "alarma"));
//Falta ver como imlpementamos la configuracion de la alarma

// Inicializar la aplicación
window.onload = function () {
  initChart();
  updateConnectionStatus(false);
};
