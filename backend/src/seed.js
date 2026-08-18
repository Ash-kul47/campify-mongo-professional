require("dotenv").config();

const bcrypt = require("bcrypt");
const crypto = require("crypto");
const connectDatabase = require("./config/db");
const User = require("./models/User");

function makePublicId() {
  return crypto.randomBytes(6).toString("base64url").slice(0, 8);
}

async function seed() {
  await connectDatabase();

  const email = process.env.ADMIN_EMAIL || "admin@campify.local";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const existing = await User.findOne({ email });

  if (existing) {
    console.log(`Admin already exists: ${email}`);
    process.exit(0);
  }

  await User.create({
    name: "Admin",
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role: "admin",
    publicId: `u_${makePublicId()}`
  });

  console.log(`Admin created: ${email} / ${password}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
