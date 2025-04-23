require('dotenv').config();  // Charger les variables d'environnement depuis le fichier .env
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const logger = require("./logger");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Configuration du pool de connexion à PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes("localhost")
    ? false
    : { rejectUnauthorized: false }
});

// Route de test pour vérifier que le serveur fonctionne
app.get("/", (req, res) => {
  res.send("Serveur opérationnel !");
});

// Route POST : Enregistrer un feedback
app.post("/api/feedback", async (req, res, next) => {
  const { feedback } = req.body;
  if (!feedback) {
    return res.status(400).json({ success: false, error: "Le champ 'feedback' est requis." });
  }

  try {
    await pool.query("INSERT INTO feedbacks (message, date) VALUES ($1, NOW())", [feedback]);
    res.json({ success: true, message: "Feedback enregistré." });
  } catch (error) {
    logger.error("Erreur d'enregistrement : %o", error);
    next(error);
  }
});

// Route GET : Récupérer les feedbacks
app.get("/api/feedback", async (req, res, next) => {
  try {
    const result = await pool.query("SELECT * FROM feedbacks ORDER BY date DESC");
    res.json({ success: true, feedbacks: result.rows });
  } catch (error) {
    logger.error("Erreur de récupération : %o", error);
    next(error);
  }
});

// Middleware global de gestion des erreurs
app.use((err, req, res, next) => {
  logger.error("Erreur non gérée : %o", err);
  res.status(500).json({ success: false, error: "Une erreur interne est survenue." });
});

// Lancer le serveur sur le port spécifié
app.listen(PORT, () => {
  logger.info(`Serveur démarré sur le port ${PORT}`);
});
