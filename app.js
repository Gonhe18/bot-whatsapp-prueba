const { Client, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const cors = require("cors");
const ora = require("ora");
const chalk = require("chalk");
const exceljs = require("exceljs");
const moment = require("moment");
const express = require("express");

const app = express();

const SESSION_FILE_PATH = "/session.json";
let client;
let sessionData;

app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.post("/send", sendWithApi);

const sendWithApi = (req, res) => {
  // Obtengo los datos del body
  const { message, to } = req.body;
  // Genero el número válido para el bot
  const newNumber = `${to}@c.us`;
  // Envío el msj
  sendMessage(newNumber, message);
  res.send({ status: "Enviado" });
};

// Al existir el archivo de sesión cargamos las credenciales
const conSesion = () => {
  const spinner = ora(
    `Cargando ${chalk.yellow("Validando sesión con Whatsapp..")}`
  );
  // Guardamos la sesión en una variable
  sessionData = require(SESSION_FILE_PATH);
  spinner.start();
  // Instanciamos al cliente indicandole la sesión con la que debe iniciar.
  client = new Client({
    session: sessionData,
  });
  // Mensaje de confirmación de conexión
  client.on("ready", () => {
    console.log("Cliente esta listo");
    spinner.stop();
    listenMessage();
  });
  // Mensaje de error en caso de deslogueo por ej
  client.on("auth_failure", () => {
    spinner.stop();
    console.log("Error de autenticación vuelve a generar el QR Code");
  });
  // Inicializamos el cliente
  client.initialize();
};
// Genera código QR en caso de no existir la sesión
const sinSesion = () => {
  console.log("No tenemos sesión iniciada");

  client = new Client();
  // Genera un código QR
  client.on("qr", (qr) => {
    qrcode.generate(qr, { small: true });
  });
  // Guardamos las credenciales de la sesión
  client.on("authenticated", (session) => {
    sessionData = session;
    fs.writeFile(
      SESSION_FILE_PATH(JSON.stringify(session), (err) => {
        if (err) {
          console.log(err);
        }
      })
    );
  });
  // Inicializa el cliente
  client.initialize();
};
// Recibo mensajes
const listenMessage = () => {
  client.on("message", (msg) => {
    const { from, to, body } = msg;
    switch (from) {
      case "hola":
        sendMessage(from, "Hola, esta es una prueba del Bot para Whatsapp");
        break;
      case "adios":
        sendMessage(from, "Gracias por probar el Bot para Whatsapp");
        break;
      case "info":
        sendMessage(from, "Prueba para envio de imagenes");
        sendMedia(from, "img-1.png");
        break;
      case "curso":
        sendMessage(from, "Más imagenes desde el bot de whatsapp");
        sendMedia(from, "img-2.png");
        break;
    }
    saveHistorial(from, body);
    chalk.green(body);
  });
};
// Enviar mensajes multimedia
const sendMedia = (to, file) => {
  const mediaFile = MessageMedia.fromFilePath(`./media/${file}`);
  client.sendMessage(to, mediaFile);
};
// Envío mensajes
const sendMessage = (to, message) => {
  client.sendMessage(to, message);
};
// Guardamos el historial del chat
const saveHistorial = (number, message) => {
  const pathChat = `./chat/${number}.xlsx`;
  const workbook = new exceljs.Workbook();
  const today = moment().format("DD-MM-YYYY hh:mm");
  // Verificamos si existe una copia del chat sino la creamos
  if (fs.existsSync(pathChat)) {
    workbook.xlsx.readFile(pathChat).then(() => {
      // Selecciona la primera hoja del excel
      const worksheet = workbook.getWorksheet(1);
      // Se posiciona en la última fila
      const lastRow = worksheet.lastRow();
      // Obtenemos el número de la celda y le agregamos uno, para que tome la siguiente celda vacia
      let getRowInsert = worksheet.getRow(++lastRow.number);
      // Insertamos los valores en las columnas correspondientes
      getRowInsert.getCell("A").value = today;
      getRowInsert.getCell("B").value = message;
      getRowInsert.commit();
      // Creamos el archivo, en este caso se reemplazará
      workbook.xlsx
        .writeFile(pathChat)
        .then(() => {
          console.log("Se agregó el chat");
        })
        .catch(() => {
          console.log("Ocurrió un error al guardar el chat");
        });
    });
  } else {
    const worksheet = workbook.addWorksheet("Chats");
    worksheet.columns = [
      {
        header: "Fecha",
        key: "date",
      },
      {
        header: "Mensaje",
        key: "message",
      },
    ];
    worksheet.addRow([today, message]);
    workbook.xlsx
      .writeFile(pathChat)
      .then(() => {
        console.log("Historial creado");
      })
      .catch(() => console.log("Algo falló"));
  }
};

// Condición por la que verifica si existe o no la sesión
fs.existsSync(SESSION_FILE_PATH) ? conSesion() : sinSesion();
app.listen(8080, () => console.log("Conectado"));
