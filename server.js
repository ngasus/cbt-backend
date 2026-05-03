require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");

const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

const path = require("path");

const app = express();
const server = http.createServer(app);

/* ================= MIDDLEWARE ================= */

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json({ limit: "10mb" }));

/* ================= FRONTEND ================= */

app.use(express.static(path.join(__dirname, "public")));

/* 🔥 ROOT FIX (IMPORTANT FOR RENDER) */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* ================= MONGODB ================= */

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("MongoDB Error:", err));

/* ================= CLOUDINARY ================= */

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "cbt-papers",
    resource_type: "raw"
  }
});

const upload = multer({ storage });

/* ================= MODELS ================= */

/* 📄 PAPER MODEL */
const Paper = mongoose.model("Paper", {
  id: String,
  name: String,
  pdf: String,
  sections: Object,
  answers: Object,
  total_questions: Number
});

/* 👤 USER MODEL */
const User = mongoose.model("User", {
  username: String,
  email: String,
  createdAt: { type: Date, default: Date.now }
});

/* 📊 ATTEMPT MODEL */
const Attempt = mongoose.model("Attempt", {
  userId: String,
  paperId: String,
  score: Number,
  accuracy: Number,
  correct: Number,
  wrong: Number,
  unattempted: Number,
  responses: Object,
  createdAt: { type: Date, default: Date.now }
});

/* ================= ROUTES ================= */

/* 📤 UPLOAD PAPER */
app.post("/upload-paper", upload.single("pdf"), async (req, res) => {
  try {
    const { id, name, sections, answers, total_questions } = req.body;

    if (!req.file) return res.status(400).json({ error: "PDF missing" });

    const paper = await Paper.create({
      id,
      name,
      pdf: req.file.path,
      sections: JSON.parse(sections),
      answers: JSON.parse(answers),
      total_questions: Number(total_questions)
    });

    res.json(paper);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* 📥 GET ALL PAPERS */
app.get("/papers", async (req, res) => {
  try {
    const papers = await Paper.find({}, { answers: 0 });
    res.json(papers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* 📄 GET SINGLE PAPER */
app.get("/paper/:id", async (req, res) => {
  try {
    const paper = await Paper.findOne({ id: req.params.id });

    if (!paper) {
      return res.status(404).json({ error: "Paper not found" });
    }

    res.json(paper);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* 👤 REGISTER USER */
app.post("/register", async (req, res) => {
  try {
    const { username, email } = req.body;

    const user = await User.create({
      username,
      email
    });

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* 📊 SUBMIT TEST */
app.post("/submit", async (req, res) => {
  try {
    const { userId, paperId, responses } = req.body;

    const paper = await Paper.findOne({ id: paperId });

    let score = 0;
    let correct = 0;
    let wrong = 0;
    let unattempted = 0;

    Object.keys(paper.answers).forEach(qid => {
      const user = responses[qid];
      const ans = paper.answers[qid];

      if (user == null) {
        unattempted++;
      }
      else if (user === ans) {
        score += 4;
        correct++;
      }
      else {
        score -= 1;
        wrong++;
      }
    });

    const accuracy = (correct / paper.total_questions) * 100;

    const attempt = await Attempt.create({
      userId,
      paperId,
      score,
      accuracy,
      correct,
      wrong,
      unattempted,
      responses
    });

    res.json({
      score,
      accuracy,
      attemptId: attempt._id
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* 🏆 LEADERBOARD */
app.get("/leaderboard/:paperId", async (req, res) => {
  try {
    const data = await Attempt.find({ paperId: req.params.paperId })
      .sort({ score: -1 })
      .limit(100);

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* 📊 USER HISTORY */
app.get("/attempts/:userId", async (req, res) => {
  try {
    const attempts = await Attempt.find({ userId: req.params.userId })
      .sort({ createdAt: -1 });

    res.json(attempts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= HEALTH CHECK ================= */

app.get("/health", (req, res) => {
  res.json({ status: "CBT Server Running 🚀" });
});

/* ================= SERVER ================= */

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`CBT Server running on port ${PORT}`);
});