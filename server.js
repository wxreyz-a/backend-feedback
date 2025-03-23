require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Configuration du pool de connexion à PostgreSQL
// Si DATABASE_URL contient "localhost", SSL est désactivé (pour le développement local)
// Sinon, pour Render, SSL est activé avec { rejectUnauthorized: false }
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
app.post("/api/feedback", async (req, res) => {
  const { feedback } = req.body;
  if (!feedback) {
    return res.status(400).json({ success: false, error: "Le champ 'feedback' est requis." });
  }

  try {
    await pool.query("INSERT INTO feedbacks (message, date) VALUES ($1, NOW())", [feedback]);
    res.json({ success: true, message: "Feedback enregistré." });
  } catch (error) {
    console.error("Erreur d'enregistrement :", error);
    res.status(500).json({ success: false, error: "Erreur d'enregistrement." });
  }
});

// Route GET : Récupérer les feedbacks
app.get("/api/feedback", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM feedbacks ORDER BY date DESC");
    res.json({ success: true, feedbacks: result.rows });
  } catch (error) {
    console.error("Erreur de récupération :", error);
    res.status(500).json({ success: false, error: "Erreur de récupération des feedbacks." });
  }
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});

