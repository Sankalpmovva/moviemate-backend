const express = require('express');
const router = express.Router();
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
const bcrypt = require('bcrypt');
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

// --------------------
// Registration
// --------------------
router.post('/register', async (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  try {
    // Check if email already exists
    const existing = await prisma.accounts.findUnique({ where: { Email: email } });
    if (existing) return res.status(400).json({ error: 'Email already in use' });

    // Create account
    const account = await prisma.accounts.create({
      data: { First_Name: firstName, Last_Name: lastName, Email: email },
    });

    // Hash password and store in Auth_Providers
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    await prisma.auth_providers.create({
      data: {
        User_ID: account.Account_ID,
        Provider_Name: 'password',
        Password_Hash: hashedPassword,
        Is_Active: true
      }
    });

    res.json({ message: 'Account created', accountId: account.Account_ID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------
// Login
// --------------------
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const account = await prisma.accounts.findUnique({ where: { Email: email } });
    if (!account) return res.status(400).json({ error: 'Invalid email or password' });

    const auth = await prisma.auth_providers.findFirst({
      where: { User_ID: account.Account_ID, Provider_Name: 'password', Is_Active: true }
    });
    if (!auth) return res.status(400).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, auth.Password_Hash);
    if (!valid) return res.status(400).json({ error: 'Invalid email or password' });

    res.json({ message: 'Login successful', accountId: account.Account_ID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------
// Google OAuth 
// --------------------
router.post('/oauth/google', async (req, res) => {
  const { googleUserId, email, firstName, lastName } = req.body;
  try {
    let account = await prisma.accounts.findUnique({ where: { Email: email } });

    if (!account) {
      account = await prisma.accounts.create({
        data: { First_Name: firstName, Last_Name: lastName, Email: email }
      });
    }

    await prisma.auth_providers.upsert({
      where: { Provider_User_ID: googleUserId },
      update: { Is_Active: true },
      create: {
        User_ID: account.Account_ID,
        Provider_Name: 'google',
        Provider_User_ID: googleUserId,
        Is_Active: true
      }
    });

    res.json({ message: 'OAuth login successful', accountId: account.Account_ID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
