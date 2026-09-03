const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const { exec } = require("child_process");
const crypto = require("crypto");
const { promisify } = require("util");

const app = express();
const port = process.env.PORT || 5000;
const databaseName = "sanjeevani_db";

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const mysqlConfig = {
  host: process.env.MYSQL_HOST || "localhost",
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "Veda@123"
};

let database;
const scrypt = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function verifyPassword(password, storedPassword) {
  const [salt, storedKey] = storedPassword.split(":");
  if (!salt || !storedKey) return false;

  const derivedKey = await scrypt(password, salt, 64);
  return crypto.timingSafeEqual(
    Buffer.from(storedKey, "hex"),
    derivedKey
  );
}

function openBrowser(url) {
  const command = process.platform === "win32"
    ? `start "" "${url}"`
    : process.platform === "darwin"
      ? `open "${url}"`
      : `xdg-open "${url}"`;

  exec(command);
}

async function connectDatabase() {
  const connection = await mysql.createConnection(mysqlConfig);
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``);
  await connection.end();

  database = await mysql.createPool({
    ...mysqlConfig,
    database: databaseName,
    waitForConnections: true,
    connectionLimit: 10
  });

  await database.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      phone VARCHAR(10) NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

app.post("/api/register", async (request, response) => {
  const { fullName, email, phone, password } = request.body;

  if (!fullName || !email || !/^\d{10}$/.test(phone || "") || !password) {
    return response.status(400).json({ message: "Please provide valid registration details." });
  }

  if (!database) {
    return response.status(503).json({ message: "Database is unavailable. Start MySQL and configure its credentials." });
  }

  try {
    const hashedPassword = await hashPassword(password);
    await database.execute(
      "INSERT INTO users (full_name, email, phone, password) VALUES (?, ?, ?, ?)",
      [fullName.trim(), email.trim().toLowerCase(), phone, hashedPassword]
    );
    return response.status(201).json({ message: "Registration successful." });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return response.status(409).json({ message: "An account with this email already exists." });
    }
    console.error(error);
    return response.status(500).json({ message: "Database error." });
  }
});

app.post("/api/login", async (request, response) => {
  const { email, password } = request.body;

  if (!database) {
    return response.status(503).json({ message: "Database is unavailable. Start MySQL and configure its credentials." });
  }

  try {
    const [users] = await database.execute(
      "SELECT id, full_name, email, phone, password FROM users WHERE email = ?",
      [email.trim().toLowerCase()]
    );

    if (users.length === 0 || !(await verifyPassword(password, users[0].password))) {
      return response.status(401).json({ message: "Incorrect email or password." });
    }

    return response.json({ message: `Welcome back, ${users[0].full_name}!` });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ message: "Database error." });
  }
});

connectDatabase()
  .then(() => {
    app.listen(port, () => {
      const url = `http://localhost:${port}`;
      console.log(`Sanjeevani server running at ${url}`);
      openBrowser(url);
    });
  })
  .catch((error) => {
    console.error("Could not connect to MySQL:", error.message);
    app.listen(port, () => {
      const url = `http://localhost:${port}`;
      console.log(`Sanjeevani server running at ${url} (database unavailable)`);
      openBrowser(url);
    });
  });
