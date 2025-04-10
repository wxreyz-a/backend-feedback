require('dotenv').config();  // Charger les variables d'environnement depuis le fichier .env
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY); // Ajouter ta clé secrète Stripe ici
const admin = require("firebase-admin"); // Importer Firebase Admin SDK

// Charger la clé Firebase depuis la variable d'environnement
const firebaseServiceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY); // Lire la clé depuis la variable d'environnement

// Initialiser Firebase Admin SDK avec la clé de service
admin.initializeApp({
  credential: admin.credential.cert(firebaseServiceAccount)
});

const db = admin.firestore(); // Accéder à Firestore

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
  const { userId, paymentMethodId } = req.body;
  if (!userId || !paymentMethodId) {
    return res.status(400).json({ success: false, error: "userId et paymentMethodId sont requis." });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 1999,
      currency: "eur",
      payment_method: paymentMethodId,
      confirm: true,
    });

    if (paymentIntent.status === 'succeeded') {
      await db.collection("users").doc(userId).set({
        paid: true,
        paymentDate: new Date(),
      }, { merge: true });

      return res.json({ success: true, message: "Paiement réussi !" });
    } else if (paymentIntent.status === 'requires_action') {
      // En cas de besoin d'action supplémentaire (ex. 3D Secure)
      return res.json({ success: false, error: "Authentification supplémentaire requise." });
    } else {
      return res.status(500).json({ success: false, error: "Échec du paiement." });
    }

  } catch (error) {
    console.error("Erreur de paiement :", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});


// Route GET : Vérifier si l'utilisateur a payé
app.get("/check-payment/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const userDoc = await db.collection("users").doc(userId).get();

    if (userDoc.exists) {
      const userData = userDoc.data();
      if (userData.paid) {
        return res.json({ success: true, message: "Utilisateur ayant payé." });
      } else {
        return res.json({ success: false, message: "Utilisateur non payé." });
      }
    } else {
      return res.status(404).json({ success: false, message: "Utilisateur non trouvé." });
    }

  } catch (error) {
    console.error("Erreur de vérification de paiement :", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Lancer le serveur sur le port spécifié
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
