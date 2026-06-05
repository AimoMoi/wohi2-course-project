const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const SECRET = process.env.JWT_SECRET;
const crypto = require("crypto");
const { ValidationError, ConflictError, UnauthorizedError } = require("../lib/errors");
const { sendVerificationEmail } = require("../services/email.cjs");

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    throw new ValidationError("email, password and name are required");
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email },});

  if (existingUser) {
    throw new ConflictError("Email already registered");
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create a verification token for email verification
  const verificationToken = crypto.randomBytes(32).toString("hex");

  // Create the user
  const user = await prisma.user.create({
    data: { email, password: hashedPassword, name, 
      emailVerified: false, verificationToken }
  });

  await sendVerificationEmail(email, verificationToken);

  // Generate a token
  const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: "1h" });

  res.status(201).json({
    message: "User registered successfully",
    token,
  });
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ValidationError("email and password are required");
  }

  // Find the user
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new UnauthorizedError("Invalid credentials");
  }

  // Verify the password
  const isValid = await bcrypt.compare(password, user.password);

  if (!isValid) {
    throw new UnauthorizedError("Invalid credentials");
  }

  // Check if email is verified
  if (!user.emailVerified) {
    throw new UnauthorizedError("Email not verified");
  }

  // Generate a token
  const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: "1h" });

  res.json({ token });
});

// POST /api/auth/resend-verification
router.post("/resend-verification", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ValidationError("email is required");
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  // Security: do not reveal whether the email exists
  if (!user) {
    return res.json({
      message: "If the account exists, a verification email has been sent.",
    });
  }

  if (user.emailVerified) {
    return res.json({
      message: "Email is already verified.",
    });
  }

  const verificationToken =
    crypto.randomBytes(32).toString("hex");

  await prisma.user.update({
    where: { id: user.id },
    data: { verificationToken },
  });

  await sendVerificationEmail(email, verificationToken);

  res.json({
    message: "Verification email sent.",
  });
});

router.get("/verify-email", async (req, res) => {
  const { token } = req.query;

  const user = await prisma.user.findUnique({
    where: { verificationToken: token },
  });

  if (!user) {
    throw new UnauthorizedError("Invalid verification token");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verificationToken: null },
  });

  res.json({ message: "Email verified" });
});

module.exports = router;