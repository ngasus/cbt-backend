require("dotenv").config();

const mongoose = require("mongoose");
const fs = require("fs");

/* ================= CONNECT DB ================= */

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected for Seeding"))
  .catch(err => console.log(err));

/* ================= PAPER MODEL ================= */

const Paper = mongoose.model("Paper", {
  id: String,
  name: String,
  pdf: String,
  sections: Object,
  answers: Object,
  total_questions: Number
});

/* ================= LOAD JSON ================= */

const papers = JSON.parse(
  fs.readFileSync("./papers.json", "utf-8")
);

/* ================= SEED FUNCTION ================= */

async function seedDB() {
  try {

    await Paper.deleteMany({}); // optional reset

    await Paper.insertMany(papers);

    console.log("🔥 Papers imported successfully!");

    mongoose.connection.close();

  } catch (err) {
    console.log("Seed error:", err);
  }
}

seedDB();