require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const Stripe = require("stripe");
const stripe = Stripe(process.env.sk_test_51R7CElPns5d1SnXfEqIZknnClsDNaOHUSTUOcpePXCueKMBAI5wn4Y9EY0JIPuGiMt6pstrjSN4LaJyIKsFuCNDo00lnZ04cbe); // Ajoute ta clé secrète Stripe ici (assure-toi qu'elle soit dans .env)

const app = express();
const PORT = process.env.PORT || 5000; // Utilisation de PORT ou 5000 par défaut

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

// Nouvelle route pour le paiement avec Stripe
app.post("/pay", async (req, res) => {
  const { id, amount } = req.body; // id est le PaymentMethod ID, amount est le montant en centimes (ex: 2000 pour 20€)

  if (!id || !amount) {
    return res.status(400).json({ success: false, error: "id et amount sont requis." });
  }

  try {
    // Créer un PaymentIntent avec Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount, // Montant en centimes (ex: 2000 pour 20€)
      currency: "eur", // La devise, ici en EUR
      payment_method: id, // ID du PaymentMethod envoyé par le front-end
      confirm: true, // Confirmer le paiement immédiatement
    });

    // Vérifie le statut du paiement
    if (paymentIntent.status === 'succeeded') {
      res.json({ success: true, message: "Paiement réussi !" });
    } else {
      res.status(500).json({ success: false, error: "Échec du paiement" });
    }

  } catch (error) {
    console.error("Erreur de paiement :", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Lancer le serveur sur le port spécifié
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});

