import express from "express";
import crypto from "node:crypto";
import { randomUUID } from "node:crypto";

const PORT = process.env.PORT ?? 3000;
const app = express();
app.use(express.json());
app.use(express.static("public"));

// Usuarios guardados
const users = [
  {
    username: "admin",
    name: "Gustavo Alfredo Marín Sáez",
    password:
      "1b6ce880ac388eb7fcb6bcaf95e20083:341dfbbe86013c940c8e898b437aa82fe575876f2946a2ad744a0c51501c7dfe6d7e5a31c58d2adc7a7dc4b87927594275ca235276accc9f628697a4c00b4e01", // certamen123
    token: null,
  },
];
// Recordatorios en memoria
const reminders = [];

//Requisitos
//Funciona
function generateToken() {
  return crypto.randomBytes(48).toString("hex");
}

function hashPassword(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, key) => {
      if (err) reject(err);
      else resolve(key.toString("hex"));
    });
  });
}

function authMiddleware(req, res, next) {
  const token = req.header("X-Authorization");
  if (!token) return res.status(401).json({ error: "Token faltante" });

  const user = users.find((u) => u.token === token);
  if (!user) return res.status(401).json({ error: "Token inválido" });

  req.user = user;
  next();
}

//Rutas
//testeo de clases
app.get("/api", (req, res) => {
  res.send("<h1>Hola Mundo!</h1>");
});
//login
//Funcionando
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ error: "Faltan credenciales" });

  if (typeof username !== "string" || typeof password !== "string") {
    return res
      .status(400)
      .json({ error: "Username y password deben ser strings" });
  }

  const user = users.find((u) => u.username === username);
  if (!user)
    return res.status(401).json({ error: "Usuario o contraseña incorrectos" });

  const [salt, key] = user.password.split(":");
  const hashed = await hashPassword(password, salt);

  if (hashed !== key)
    return res.status(401).json({ error: "Usuario o contraseña incorrectos" });

  user.token = generateToken();
  res.json({ username: user.username, name: user.name, token: user.token });
});
//listar
//Funcionando
app.get("/api/reminders", authMiddleware, (req, res) => {
  const sorted = reminders.sort((a, b) => {
    if (a.important === b.important) {
      return a.createdAt - b.createdAt;
    }
    return b.important - a.important;
  });
  res.status(200).json(sorted);
});
//Crear
//Funcionando
app.post("/api/reminders", authMiddleware, (req, res) => {
  const { content, important = false } = req.body;

  if (typeof content !== "string" || !content.trim() || content.length > 120) {
    return res
      .status(400)
      .json({ error: "El contenido es inválido, maximo de 120 caracteres" });
  }
  if (typeof important !== "boolean") {
    return res
      .status(400)
      .json({ error: "El campo importante debe ser booleano" });
  }

  const newReminder = {
    id: randomUUID(),
    content,
    createdAt: Date.now(),
    important,
  };
  reminders.push(newReminder);
  res.status(201).json(newReminder);
});
//Actualizar
//Funcionando
app.patch("/api/reminders/:id", authMiddleware, (req, res) => {
  const { id } = req.params;
  const { content, important } = req.body;

  const reminder = reminders.find((r) => r.id === id);
  if (!reminder)
    return res.status(404).json({ error: "Recordatorio no encontrado" });

  if (content !== undefined) {
    if (
      typeof content !== "string" ||
      !content.trim() ||
      content.length > 120
    ) {
      return res
        .status(400)
        .json({ error: "El contenido es inválido, maximo de 120 caracteres" });
    }
    reminder.content = content;
  }

  if (important !== undefined) {
    if (typeof important !== "boolean") {
      return res
        .status(400)
        .json({ error: "El campo importante debe ser booleano" });
    }
    reminder.important = important;
  }

  res.json(reminder);
});
//borrar
//Funcionando
app.delete("/api/reminders/:id", authMiddleware, (req, res) => {
  const { id } = req.params;
  const index = reminders.findIndex((r) => r.id === id);
  if (index === -1)
    return res.status(404).json({ error: "Recordatorio no encontrado" });

  reminders.splice(index, 1);
  res.status(204).end();
});

//Hasta aquí
app.listen(PORT, (error) => {
  if (error) {
    console.error(`No se puede ocupar el puerto ${PORT} :(`);
    return;
  }

  console.log(`Escuchando en el puerto ${PORT}`);
});
