require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Connexion à PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
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
    console.error(error);
    res.status(500).json({ success: false, error: "Erreur d'enregistrement." });
  }
});

// Route GET : Récupérer les feedbacks
app.get("/api/feedback", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM feedbacks ORDER BY date DESC");
    res.json({ success: true, feedbacks: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Erreur de récupération des feedbacks." });
  }
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});

