// api.js
const express = require("express");
const axios = require("axios");
const app = express();
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");

const usersFilePath = path.join(__dirname, "users.json");
const workTimesFilePath = path.join(__dirname, "workTimes.json");
const blacklistedTokensPath = path.join(__dirname, "blacklistedTokens.json");

const SECRET_KEY = "your_secret_key";
app.use(cors());
app.use(express.json()); // To parse JSON bodies

// Ensure necessary files exist
if (!fs.existsSync(workTimesFilePath)) {
  fs.writeFileSync(workTimesFilePath, JSON.stringify({}, null, 2));
}
if (!fs.existsSync(blacklistedTokensPath)) {
  fs.writeFileSync(blacklistedTokensPath, JSON.stringify([], null, 2));
}

// Load blacklisted tokens
function loadBlacklistedTokens() {
  return JSON.parse(fs.readFileSync(blacklistedTokensPath, "utf-8"));
}

// Save blacklisted tokens
function saveBlacklistedTokens(tokens) {
  fs.writeFileSync(blacklistedTokensPath, JSON.stringify(tokens, null, 2));
}

// Middleware to authenticate requests using JWT
function authenticateToken(req, res, next) {
  if (process.env.NODE_ENV === 'test') {
    const token = req.headers['authorization']?.split(' ')[1];
    if (token === 'mock.jwt.token') {
      req.user = { username: 'testuser', isAdmin: false };
      return next();
    }
    if (token === 'mock.admin.jwt.token') {
      req.user = { username: 'adminuser', isAdmin: true };
      return next();
    }
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Access token missing" });

  const blacklistedTokens = loadBlacklistedTokens();
  if (blacklistedTokens.includes(token)) {
    return res.status(403).json({ error: "Token is blacklisted" });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    req.user = user;
    next();
  });
}

/**
 * @swagger
 * /time/germany:
 *   get:
 *     summary: Fetch the current time in Germany
 *     responses:
 *       200:
 *         description: Returns the current time in Germany
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 datetime:
 *                   type: string
 *                   description: The current datetime in Germany
 *       500:
 *         description: Error fetching the time from WorldTimeAPI
 */
app.get("/time/germany", async (req, res) => {
  const MAX_RETRIES = 500; // Maximum number of retries
  const RETRY_DELAY = 1; // Delay between retries in milliseconds

  const fetchTimeWithRetry = async (retries) => {
    try {
      const response = await axios.get(
        "https://worldtimeapi.org/api/timezone/Europe/Berlin"
      );
      return response.data.datetime; // Return the datetime if successful
    } catch (error) {
      if (retries > 0) {
        console.warn(`Retrying... (${MAX_RETRIES - retries + 1})`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY)); // Wait before retrying
        return fetchTimeWithRetry(retries - 1); // Recursive retry
      } else {
        throw new Error("Failed to fetch time after maximum retries");
      }
    }
  };

  try {
    const datetime = await fetchTimeWithRetry(MAX_RETRIES);
    res.send({ datetime });
  } catch (error) {
    console.error("Error fetching time:", error);
    res.status(500).send("Failed to fetch time after retries");
  }
});

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Authenticate a user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 */
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const users = JSON.parse(fs.readFileSync(usersFilePath, "utf-8"));

  // Find the user in the database
  const user = users.find(
    (u) => u.username === username && u.password === password
  );
  if (user) {
    // Determine if the user is an admin
    const isAdmin = username === "admin@mail.com";

    // Generate a JWT token with isAdmin included in the payload
    const token = jwt.sign({ username, isAdmin }, SECRET_KEY, {
      expiresIn: "1h",
    });

    // Respond with the token and isAdmin status
    res.status(200).json({ message: "Login successful", token, isAdmin });
  } else {
    // Respond with 401 if credentials are invalid
    res.status(401).json({ error: "Invalid credentials" });
  }
});

/**
 * @swagger
 * /logout:
 *   post:
 *     summary: Logout a user by invalidating their token
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       403:
 *         description: Token is blacklisted
 *       401:
 *         description: Access token missing
 */
app.post("/logout", authenticateToken, (req, res) => {
  const token = req.headers["authorization"].split(" ")[1];
  const blacklistedTokens = loadBlacklistedTokens();
  blacklistedTokens.push(token);
  saveBlacklistedTokens(blacklistedTokens);

  res.status(200).json({ message: "Logout successful" });
});

/**
 * @swagger
 * /work-time/start:
 *   post:
 *     summary: Set the start time for the current user to the current time in Germany
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Start time set successfully
 *       500:
 *         description: Failed to fetch current time in Germany
 */
app.post("/work-time/start", authenticateToken, async (req, res) => {
  const username = req.user.username;

  const MAX_RETRIES = 500; // Increased number of retries
  const RETRY_DELAY = 1; // Reduced delay between retries (100ms)

  const fetchTimeWithRetry = async (retries) => {
    try {
      const response = await axios.get(
        "https://worldtimeapi.org/api/timezone/Europe/Berlin"
      );
      return response.data.datetime; // Return the datetime if successful
    } catch (error) {
      if (retries > 0) {
        console.warn(`Retrying... (${MAX_RETRIES - retries + 1})`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY)); // Wait before retrying
        return fetchTimeWithRetry(retries - 1); // Recursive retry
      } else {
        throw new Error("Failed to fetch time after maximum retries");
      }
    }
  };

  try {
    const currentTime = await fetchTimeWithRetry(MAX_RETRIES);

    // Format currentTime to include only date, hour, and minute
    const date = new Date(currentTime);
    const formattedTime = date.toISOString().slice(0, 16).replace("T", " "); // "YYYY-MM-DD HH:mm"

    const workTimes = JSON.parse(fs.readFileSync(workTimesFilePath, "utf-8"));
    if (!workTimes[username]) {
      workTimes[username] = {};
    }
    workTimes[username].startTime = formattedTime;
    fs.writeFileSync(workTimesFilePath, JSON.stringify(workTimes, null, 2));

    res.status(200).json({
      message: "Start time set successfully",
      data: { username, startTime: formattedTime },
    });
  } catch (error) {
    console.error("Error fetching time:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch current time in Germany after retries" });
  }
});

/**
 * @swagger
 * /work-time/end:
 *   post:
 *     summary: Set the end time for the current user to the current time in Germany
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: End time set successfully
 *       500:
 *         description: Failed to fetch current time in Germany
 */
app.post("/work-time/end", authenticateToken, async (req, res) => {
  const username = req.user.username;

  const MAX_RETRIES = 500; // Increased number of retries
  const RETRY_DELAY = 1; // Reduced delay between retries (100ms)

  const fetchTimeWithRetry = async (retries) => {
    try {
      const response = await axios.get(
        "https://worldtimeapi.org/api/timezone/Europe/Berlin"
      );
      return response.data.datetime; // Return the datetime if successful
    } catch (error) {
      if (retries > 0) {
        console.warn(`Retrying... (${MAX_RETRIES - retries + 1})`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY)); // Wait before retrying
        return fetchTimeWithRetry(retries - 1); // Recursive retry
      } else {
        throw new Error("Failed to fetch time after maximum retries");
      }
    }
  };

  try {
    const currentTime = await fetchTimeWithRetry(MAX_RETRIES);

    // Format currentTime to include only date, hour, and minute
    const date = new Date(currentTime);
    const formattedTime = date.toISOString().slice(0, 16).replace("T", " "); // "YYYY-MM-DD HH:mm"

    const workTimes = JSON.parse(fs.readFileSync(workTimesFilePath, "utf-8"));
    if (!workTimes[username]) {
      workTimes[username] = {};
    }
    workTimes[username].endTime = formattedTime; // Save the formatted time
    fs.writeFileSync(workTimesFilePath, JSON.stringify(workTimes, null, 2));

    res.status(200).json({
      message: "End time set successfully",
      data: { username, endTime: formattedTime },
    });
  } catch (error) {
    console.error("Error fetching time:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch current time in Germany after retries" });
  }
});

/**
 * @swagger
 * /work-time/all:
 *   get:
 *     summary: Get work times for all users (Admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users and their work times
 *       403:
 *         description: Forbidden
 */
app.get("/work-time/all", authenticateToken, (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "Forbidden: Admin access only" });
  }

  const workTimes = JSON.parse(fs.readFileSync(workTimesFilePath, "utf-8"));
  res
    .status(200)
    .json({ message: "Work times fetched successfully", data: workTimes });
});

/**
 * @swagger
 * /work-time/edit/{username}:
 *   put:
 *     summary: Edit work times for a specific user (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startTime:
 *                 type: string
 *               endTime:
 *                 type: string
 *     responses:
 *       200:
 *         description: Work time updated successfully
 *       400:
 *         description: Missing or invalid data
 *       403:
 *         description: Forbidden
 */
app.put("/work-time/edit/:username", authenticateToken, (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "Forbidden: Admin access only" });
  }

  const { username } = req.params;
  const { startTime, endTime } = req.body;

  if (!startTime || !endTime) {
    return res
      .status(400)
      .json({ error: "Missing required fields: startTime, endTime" });
  }

  const workTimes = JSON.parse(fs.readFileSync(workTimesFilePath, "utf-8"));

  if (!workTimes[username]) {
    return res.status(404).json({ error: "User not found" });
  }

  workTimes[username] = { startTime, endTime };
  fs.writeFileSync(workTimesFilePath, JSON.stringify(workTimes, null, 2));

  res
    .status(200)
    .json({
      message: "Work time updated successfully",
      data: { username, startTime, endTime },
    });
});

app.get("/work-time/:username", authenticateToken, (req, res) => {
  const { username } = req.params;

  const workTimes = JSON.parse(fs.readFileSync(workTimesFilePath, "utf-8"));

  if (workTimes[username]) {
    res.status(200).json({
      message: "Work times fetched successfully",
      data: workTimes[username],
    });
  } else {
    res.status(404).json({ error: "No work times found for this user" });
  }
});

module.exports = app;
