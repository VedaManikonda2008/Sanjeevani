const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const { exec } = require("child_process");
const crypto = require("crypto");
const { promisify } = require("util");
const { generateDailyMealPlans, buildTasksForDay } = require("./diet-planner/diet-planner/utils/mealGenerator");

const app = express();
const port = process.env.PORT || 5000;
const databaseName = "sanjeevani_db";

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

function getDietUserKey(request) {
  return (request.get("x-sanjeevani-user") || "local-user").trim().toLowerCase();
}

function parseJson(value) { return typeof value === "string" ? JSON.parse(value) : value; }

async function getDietProfile(userKey) {
  const [rows] = await database.execute("SELECT profile_json FROM diet_profiles WHERE user_key = ?", [userKey]);
  return rows.length ? parseJson(rows[0].profile_json) : null;
}

async function getDietPlan(planId, userKey) {
  const [rows] = await database.execute("SELECT plan_json FROM diet_plans WHERE plan_id = ? AND user_key = ?", [planId, userKey]);
  return rows.length ? parseJson(rows[0].plan_json) : null;
}

async function saveDietPlan(plan) {
  await database.execute("INSERT INTO diet_plans (plan_id, user_key, status, plan_json) VALUES (?, ?, ?, ?)",
    [plan.planId, plan.user, plan.status || "Active", JSON.stringify(plan)]);
}

function getDietDuration(startDate, durationType) {
  const start = new Date(`${startDate}T00:00:00`);
  const totalDays = durationType === "monthly"
    ? new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()
    : 7;
  const end = new Date(start);
  end.setDate(end.getDate() + totalDays - 1);
  return { totalDays, endDate: end.toISOString().slice(0, 10) };
}

app.get("/api/diet/profile", async (request, response) => {
  try { response.json({ success: true, profile: await getDietProfile(getDietUserKey(request)) }); }
  catch (error) { console.error(error); response.status(500).json({ success: false, message: "Unable to load profile." }); }
});

app.post("/api/diet/profile", async (request, response) => {
  const { name, age, height, weight } = request.body;
  if (!name || !age || !height || !weight) {
    return response.status(400).json({ success: false, message: "Name, age, height and weight are required." });
  }

  const user = getDietUserKey(request);
  const profile = { ...request.body, user };
  try {
    await database.execute("INSERT INTO diet_profiles (user_key, profile_json) VALUES (?, ?) ON DUPLICATE KEY UPDATE profile_json = VALUES(profile_json)", [user, JSON.stringify(profile)]);
    return response.json({ success: true, profile });
  } catch (error) { console.error(error); return response.status(500).json({ success: false, message: "Unable to save profile." }); }
});

app.post("/api/diet/generate", async (request, response) => {
  const profile = await getDietProfile(getDietUserKey(request));
  const { goal, dietType, durationType, startDate } = request.body;
  if (!profile) return response.status(400).json({ success: false, message: "Please save your personal details first." });
  if (!goal || !dietType || !["weekly", "monthly"].includes(durationType) || !startDate) {
    return response.status(400).json({ success: false, message: "Please complete all plan selections." });
  }

  const { totalDays, endDate } = getDietDuration(startDate, durationType);
  const dailyMealPlans = generateDailyMealPlans(profile, goal, dietType, startDate, totalDays);
  return response.json({ success: true, preview: { goal, dietType, durationType, startDate, endDate, totalDays, personalDetailsSnapshot: profile, dailyMealPlans } });
});

app.post("/api/diet/start", async (request, response) => {
  const profile = await getDietProfile(getDietUserKey(request));
  const { goal, dietType, durationType, startDate } = request.body;
  if (!profile) return response.status(400).json({ success: false, message: "Please save your personal details first." });

  const { totalDays, endDate } = getDietDuration(startDate, durationType);
  const dailyMealPlans = generateDailyMealPlans(profile, goal, dietType, startDate, totalDays);
  const planId = crypto.randomUUID();
  const plan = { _id: planId, planId, user: getDietUserKey(request), goal, dietType, durationType, startDate, endDate, totalDays, dailyMealPlans, progress: dailyMealPlans.map(buildTasksForDay), status: "Active" };
  try { await saveDietPlan(plan); }
  catch (error) { console.error(error); return response.status(500).json({ success: false, message: "Unable to save plan." }); }
  return response.status(201).json({ success: true, planId, plan });
});

app.get("/api/diet/progress/:planId/:dayNumber", async (request, response) => {
  const plan = await getDietPlan(request.params.planId, getDietUserKey(request));
  const dayNumber = Number(request.params.dayNumber);
  if (!plan || !plan.progress[dayNumber - 1]) return response.status(404).json({ success: false, message: "Day not found." });
  const tasks = plan.progress[dayNumber - 1];
  const completedTaskCount = tasks.filter((task) => task.completed).length;
  response.json({ success: true, progress: { dayNumber, date: plan.dailyMealPlans[dayNumber - 1].date, tasks, completedTaskCount, totalTaskCount: tasks.length, completionPercentage: Math.round((completedTaskCount / tasks.length) * 100) }, totalDays: plan.totalDays });
});

app.put("/api/diet/progress/:planId/:dayNumber", async (request, response) => {
  const plan = await getDietPlan(request.params.planId, getDietUserKey(request));
  const tasks = plan?.progress[Number(request.params.dayNumber) - 1];
  const task = tasks?.find((item) => item.name === request.body.taskName);
  if (!task) return response.status(404).json({ success: false, message: "Task not found." });
  task.completed = Boolean(request.body.completed);
  try { await database.execute("UPDATE diet_plans SET plan_json = ? WHERE plan_id = ? AND user_key = ?", [JSON.stringify(plan), plan.planId, plan.user]); }
  catch (error) { console.error(error); return response.status(500).json({ success: false, message: "Unable to save progress." }); }
  const completedTaskCount = tasks.filter((item) => item.completed).length;
  response.json({ success: true, progress: { dayNumber: Number(request.params.dayNumber), date: plan.dailyMealPlans[Number(request.params.dayNumber) - 1].date, tasks, completedTaskCount, totalTaskCount: tasks.length, completionPercentage: Math.round((completedTaskCount / tasks.length) * 100) } });
});

function getPlanProgress(plan) {
  return plan.progress.map((tasks, index) => {
    const completedTaskCount = tasks.filter((task) => task.completed).length;
    return {
      day: index + 1,
      date: plan.dailyMealPlans[index].date,
      tasks,
      completedTaskCount,
      totalTaskCount: tasks.length,
      completionPercentage: Math.round((completedTaskCount / tasks.length) * 100),
    };
  });
}

app.get("/api/diet/overview/:planId", async (request, response) => {
  const plan = await getDietPlan(request.params.planId, getDietUserKey(request));
  if (!plan) return response.status(404).json({ success: false, message: "Plan not found." });

  const progress = getPlanProgress(plan);
  const weeks = [];
  for (let index = 0; index < progress.length; index += 7) {
    weeks.push({
      weekNumber: Math.floor(index / 7) + 1,
      days: progress.slice(index, index + 7).map((day) => ({
        day: day.day,
        status: day.completionPercentage === 100
          ? "completed"
          : day.completionPercentage > 0 ? "partial" : "incomplete",
      })),
    });
  }
  response.json({ success: true, weeks });
});

app.get("/api/diet/report/:planId", async (request, response) => {
  const plan = await getDietPlan(request.params.planId, getDietUserKey(request));
  if (!plan) return response.status(404).json({ success: false, message: "Plan not found." });

  const progress = getPlanProgress(plan);
  const allTasks = progress.flatMap((day) => day.tasks);
  const categoryNames = {
    meals: ["Breakfast", "Mid-morning Snack", "Lunch", "Evening Snack", "Dinner"],
    water: ["Water"],
    protein: ["Protein"],
    exercise: ["Exercise"],
  };
  const completionFor = (names) => {
    const tasks = allTasks.filter((task) => names.includes(task.name));
    return tasks.length ? Math.round((tasks.filter((task) => task.completed).length / tasks.length) * 100) : 0;
  };
  const totalTasksCompleted = allTasks.filter((task) => task.completed).length;
  const report = {
    disclaimer: "This report summarizes plan adherence and is not medical advice.",
    overallCompletionPercentage: allTasks.length ? Math.round((totalTasksCompleted / allTasks.length) * 100) : 0,
    fullyCompletedDays: progress.filter((day) => day.completionPercentage === 100).length,
    incompleteDays: progress.filter((day) => day.completionPercentage < 100).length,
    totalTasksCompleted,
    totalTasksAssigned: allTasks.length,
    categoryCompletion: Object.fromEntries(Object.entries(categoryNames).map(([name, names]) => [name, completionFor(names)])),
    frequentlyIncompleteTasks: [],
    startDate: plan.startDate,
    endDate: plan.endDate,
    totalDays: plan.totalDays,
    status: "Active",
  };
  response.json({ success: true, report });
});

app.get("/api/diet/plan/:planId", async (request, response) => {
  try {
    const plan = await getDietPlan(request.params.planId, getDietUserKey(request));
    if (!plan) return response.status(404).json({ success: false, message: "Plan not found." });
    return response.json({ success: true, plan });
  } catch (error) { console.error(error); return response.status(500).json({ success: false, message: "Unable to load plan." }); }
});

app.get("/api/diet/previous", async (request, response) => {
  try {
    const [rows] = await database.execute("SELECT plan_json FROM diet_plans WHERE user_key = ? ORDER BY created_at DESC", [getDietUserKey(request)]);
    const plans = rows.map((row) => {
      const plan = parseJson(row.plan_json);
      const daysCompleted = plan.progress.filter((tasks) => tasks.every((task) => task.completed)).length;
      return { ...plan, daysCompleted };
    });
    return response.json({ success: true, plans });
  } catch (error) { console.error(error); return response.status(500).json({ success: false, message: "Unable to load saved plans." }); }
});

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

  await database.query(`
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL UNIQUE,
      image VARCHAR(255) NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      original_price DECIMAL(10, 2) NOT NULL,
      category VARCHAR(50) NOT NULL DEFAULT 'general',
      uses TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await database.query(`CREATE TABLE IF NOT EXISTS diet_profiles (
    user_key VARCHAR(255) PRIMARY KEY,
    profile_json JSON NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`);
  await database.query(`CREATE TABLE IF NOT EXISTS diet_plans (
    plan_id CHAR(36) PRIMARY KEY,
    user_key VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Active',
    plan_json JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_diet_plans_user_created (user_key, created_at)
  )`);

  const [productColumns] = await database.query("SHOW COLUMNS FROM products");
  if (!productColumns.some((column) => column.Field === "original_price")) {
    await database.query(
      "ALTER TABLE products ADD COLUMN original_price DECIMAL(10, 2) NOT NULL DEFAULT 0 AFTER price"
    );
  }
  await database.query("UPDATE products SET original_price = price WHERE original_price = 0");

  const products = [
    ["Triphala", "Triphala.jpg", 200, 200, "general", "Supports healthy digestion and gentle cleansing."],
    ["Ashwagandha", "Ashwaghandha.webp", 150, 150, "general", "Traditionally used for stress management, energy, and restful sleep."],
    ["Athimadhuram", "Athimadhuram.jfif", 200, 200, "general", "Traditionally used to soothe the throat and support digestion."],
    ["Manjista", "Manjistha.webp", 250, 250, "face", "Traditionally used to support healthy-looking skin."],
    ["Jaiphal / Nutmeg", "Jaiphal.png", 700, 700, "general", "Traditionally used for comfortable digestion and relaxation."],
    ["Inknut", "karakkaya.jpg", 200, 200, "general", "Traditionally used to support healthy digestion."],
    ["Turmeric", "Turmeric.webp", 280, 280, "face", "Provides antioxidant support and is used in wellness drinks."],
    ["Tinospora", "Tinospora.webp", 260, 260, "general", "Traditionally used to support immune wellness and vitality."],
    ["Neem", "neem.webp", 150, 150, "general", "Traditionally used in personal care to support healthy skin."],
    ["Saffron", "saffron.jpg", 300000, 300000, "pregnancy", "Adds natural flavor and color and is traditionally used for relaxation."],
    ["Kasturi And Gorojan", "kasturi and gorojanam.jfif", 40, 40, "pregnancy", "Used in aromatic wellness preparations and personal care blends."],
    ["Ajwan", "vamu.jfif", 200, 200, "pregnancy", "Traditionally used to support digestion."],
    ["Vacha", "vacha.webp", 800, 800, "pregnancy", "Traditionally used for throat and voice wellness."],
    ["Pippallu", "pippallu.jfif", 2300, 2300, "pregnancy", "Traditionally used to support respiratory wellness."],
    ["Modi", "modi.png", 200, 200, "pregnancy", "Used in traditional herbal preparations."],
    ["Shunti", "shunti.webp", 200, 200, "pregnancy", "Traditionally used to support digestion and provide warming comfort."],
    ["Pepper", "pepper.jfif", 1000, 1000, "pregnancy", "Supports comfortable digestion and adds natural warmth."],
    ["Hing", "hing.jfif", 40, 40, "pregnancy", "Traditionally used to support digestion and add savory flavor."],
    ["Karunalu/Halim Seeds", "adiyalu.jpeg", 1000, 1000, "pains", "Traditionally used in nourishing recipes and everyday wellness preparations."],
    ["Badam Goondh", "badam goondh.png", 1000, 1000, "sugar", "Traditionally used in nourishing preparations and drinks."],
    ["Chia", "chia.jpg", 1000, 1000, "general", "Can be added to drinks and breakfast recipes."],
    ["Dhoomraasmi/Thai Ginger", "dumparastram.jpg", 1000, 1000, "general", "Provides warming comfort and supports comfortable digestion."],
    ["Flex Seeds", "flexseeds.jpg", 1000, 1000, "cancer", "Can be added to breakfast recipes and provides plant-based fiber."],
    ["Rosary pea,Gulaganji", "guriginja.jpg", 1000, 1000, "pains", "Used in traditional preparations; store and handle with care."],
    ["Kadwa Badam", "kadwa badam.jpg", 1000, 1000, "sugar", "Used in traditional herbal preparations."],
    ["Kadwa Jau", "kadwa jau.png", 1000, 1000, "sugar", "Used in traditional grain preparations and nourishing recipes."],
    ["Kalonji", "kalonji.jpg", 1000, 1000, "general", "Adds a peppery flavor to recipes and wellness preparations."],
    ["Kasturi Turmeric Kombu", "kasthuri.webp", 1000, 1000, "face", "Traditionally used in personal care and herbal preparations."],
    ["Fenugreek", "menthi.webp", 1000, 1000, "general", "Traditionally used to support digestion and in nourishing preparations."],
    ["Black Cumin Seeds/Kari Jeerige", "nalla jeera.webp", 1000, 1000, "sugar", "Adds a warm, earthy flavor and is used in wellness preparations."],
    ["Pacha Karpura", "pacha karpuram.jpg", 1000, 1000, "pains", "Used in aromatic preparations and traditional personal care."],
    ["Himlayna Pink Salt", "pink salt.webp", 1000, 1000, "general", "Adds natural flavor to meals and wellness recipes."],
    ["Menthol", "pudina puvu.jfif", 1000, 1000, "pains", "Provides a cooling aroma and freshness to aromatic blends."],
    ["Sabja Seeds", "sabja.avif", 1000, 1000, "general", "Can be soaked for drinks and provides plant-based fiber."],
    ["Ajwain Flower/Oma Hoovu", "vamu puvvu.jpg", 1000, 1000, "pains", "Adds a warm herbal aroma to traditional recipes."],
    ["Dry Amla", "Dry amla.jfif", 1000, 1000, "general", "Traditionally used to support digestion and herbal drinks."]
  ];

  await database.query(
    "INSERT IGNORE INTO products (name, image, price, original_price, category, uses) VALUES ?",
    [products]
  );
}

app.get("/api/products", async (request, response) => {
  if (!database) {
    return response.status(503).json({ message: "Database is unavailable." });
  }

  try {
    const [products] = await database.query(
      "SELECT id, name, image, price, original_price AS originalPrice, category, uses FROM products ORDER BY category, name"
    );
    return response.json({ products });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ message: "Unable to load product catalog." });
  }
});

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

    return response.json({
      message: `Welcome back, ${users[0].full_name}!`,
      user: {
        fullName: users[0].full_name,
        email: users[0].email
      }
    });
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
