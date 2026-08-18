const bcrypt = require("bcrypt");
const crypto = require("crypto");
const express = require("express");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function makePublicId() {
  return crypto.randomBytes(6).toString("base64url").slice(0, 8);
}

router.get("/me", (req, res) => {
  res.json({ user: req.session.user || null });
});

router.post("/signup", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.create({
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: "student",
      publicId: `u_${makePublicId()}`
    });

    req.session.user = user.toSessionUser();
    res.status(201).json({ user: req.session.user });
  } catch (err) {
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: String(email || "").toLowerCase().trim() });

    if (!user || !(await bcrypt.compare(password || "", user.passwordHash))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    req.session.regenerate((sessionErr) => {
      if (sessionErr) return next(sessionErr);
      req.session.user = user.toSessionUser();
      return res.json({ user: req.session.user });
    });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", requireAuth, (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie("campify.sid");
    return res.json({ message: "Logged out" });
  });
});

module.exports = router;
