require("dotenv").config();

const MongoStore = require("connect-mongo");
const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const path = require("path");
const rateLimit = require("express-rate-limit");
const session = require("express-session");
const adminRoutes = require("./routes/admin");
const authRoutes = require("./routes/auth");
const studentRoutes = require("./routes/student");
const { errorHandler, notFound } = require("./middleware/errorHandler");

const app = express();
const isProduction = process.env.NODE_ENV === "production";
const frontendDist = path.join(__dirname, "..", "..", "..", "frontend", "dist");

app.set("trust proxy", 1);
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  credentials: true
}));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false
}));

app.use(session({
  name: "campify.sid",
  secret: process.env.SESSION_SECRET || "change-this-secret-before-deploying",
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
    maxAge: 1000 * 60 * 60 * 24 * 7
  },
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: "sessions",
    ttl: 60 * 60 * 24 * 7
  })
}));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "campify-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/admin", adminRoutes);



app.use(errorHandler);

module.exports = app;
