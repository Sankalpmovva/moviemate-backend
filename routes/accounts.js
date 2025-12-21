const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

// --------------------
// Registration
// --------------------
router.post('/register', async (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  try {
    // Check if email already exists
    const existing = await prisma.accounts.findUnique({
      where: { Email: email }
    });
    if (existing) return res.status(400).json({ error: 'Email already in use' });

    // Create account
    const account = await prisma.accounts.create({
      data: {
        First_Name: firstName,
        Last_Name: lastName,
        Email: email,
      },
    });

    // Hash password and store in Auth_Providers
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.auth_Providers.create({
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
    // Find account
    const account = await prisma.accounts.findUnique({ where: { Email: email } });
    if (!account) return res.status(400).json({ error: 'Invalid email or password' });

    // Get active password provider
    const auth = await prisma.auth_Providers.findFirst({
      where: { User_ID: account.Account_ID, Provider_Name: 'password', Is_Active: true }
    });
    if (!auth) return res.status(400).json({ error: 'Invalid email or password' });

    // Verify password
    const valid = await bcrypt.compare(password, auth.Password_Hash);
    if (!valid) return res.status(400).json({ error: 'Invalid email or password' });

    res.json({ message: 'Login successful', accountId: account.Account_ID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------
// Google OAuth placeholder
// --------------------
router.post('/oauth/google', async (req, res) => {
  const { googleUserId, email, firstName, lastName } = req.body;
  try {
    // Check if account exists
    let account = await prisma.accounts.findUnique({ where: { Email: email } });
    if (!account) {
      // Create account if not exists
      account = await prisma.accounts.create({
        data: { First_Name: firstName, Last_Name: lastName, Email: email }
      });
    }

    // Create or update OAuth provider
    await prisma.auth_Providers.upsert({
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
