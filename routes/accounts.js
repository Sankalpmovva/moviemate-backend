const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('../generated/prisma');

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';

// --------------------
// Registration (email/password)
// --------------------
router.post('/register', async (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const existing = await prisma.accounts.findUnique({ where: { Email: email } });
    if (existing) return res.status(400).json({ error: 'Email already in use' });

    const account = await prisma.accounts.create({
      data: { First_Name: firstName, Last_Name: lastName, Email: email }
    });

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    await prisma.auth_providers.create({
      data: {
        User_ID: account.Account_ID,
        Provider_Name: 'password',
        Password_Hash: hashedPassword,
        Is_Active: true
      }
    });

    res.json({ message: 'Account created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------
// Login (email/password)
// --------------------
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const account = await prisma.accounts.findUnique({ where: { Email: email } });
    if (!account || !account.IsActive) return res.status(400).json({ error: 'Invalid email or password' });

    const auth = await prisma.auth_providers.findFirst({
      where: { User_ID: account.Account_ID, Provider_Name: 'password', Is_Active: true }
    });
    if (!auth || !auth.Password_Hash) return res.status(400).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, auth.Password_Hash);
    if (!valid) return res.status(400).json({ error: 'Invalid email or password' });

    const token = jwt.sign(
      { accountId: account.Account_ID, email: account.Email, isAdmin: account.IsAdmin },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: account.Account_ID,
        firstName: account.First_Name,
        lastName: account.Last_Name,
        email: account.Email,
        balance: account.Account_Balance,
        isAdmin: account.IsAdmin
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------
// Google OAuth login
// --------------------
router.post('/oauth/google', async (req, res) => {
  try {
    const { credential } = req.body;
    
    if (!credential) {
      return res.status(400).json({ error: 'Missing Google credential' });
    }

    // Verify the Google ID token
    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    const googleUserId = payload.sub;
    const email = payload.email;
    const firstName = payload.given_name || '';
    const lastName = payload.family_name || '';
    
    console.log('Google OAuth payload:', { googleUserId, email, firstName, lastName });

    // Check if user exists
    let account = await prisma.accounts.findUnique({ 
      where: { Email: email } 
    });
    
    // Create new account if doesn't exist
    if (!account) {
      account = await prisma.accounts.create({ 
        data: { 
          First_Name: firstName, 
          Last_Name: lastName, 
          Email: email,
          Account_Balance: 0.00,
          IsActive: true,
          IsAdmin: false
        } 
      });
      console.log('Created new account:', account.Account_ID);
    }

    // Create or update auth provider
    await prisma.auth_providers.upsert({
      where: { 
        Provider_User_ID: googleUserId 
      },
      update: { 
        Is_Active: true,
        Updated_At: new Date()
      },
      create: {
        User_ID: account.Account_ID,
        Provider_Name: 'google',
        Provider_User_ID: googleUserId,
        Is_Active: true
      }
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        accountId: account.Account_ID, 
        email: account.Email, 
        isAdmin: account.IsAdmin || false 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return success response
    res.json({
      message: 'Google login successful',
      token,
      user: {
        id: account.Account_ID,
        firstName: account.First_Name,
        lastName: account.Last_Name,
        email: account.Email,
        balance: account.Account_Balance || 0,
        isAdmin: account.IsAdmin || false
      }
    });
    
  } catch (err) {
    console.error('Google OAuth error:', err);
    
    // Handle specific Google verification errors
    if (err.message.includes('Token used too late')) {
      return res.status(400).json({ error: 'Google token expired. Please try again.' });
    }
    
    res.status(500).json({ error: 'Google authentication failed. Please try again.' });
  }
});

// --------------------
// Get account by ID
// --------------------
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const account = await prisma.accounts.findUnique({
      where: { Account_ID: parseInt(id) },
      select: {
        Account_ID: true,
        First_Name: true,
        Last_Name: true,
        Email: true,
        Account_Balance: true
      }
    });
    if (!account) return res.status(404).json({ error: 'Account not found' });
    res.json(account);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------
// Update account details
// --------------------
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName } = req.body;
  try {
    const account = await prisma.accounts.update({
      where: { Account_ID: parseInt(id) },
      data: { First_Name: firstName, Last_Name: lastName }
    });
    res.json({ success: true, account });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------
// Add balance (dummy)
// --------------------
router.put('/:id/add-balance', async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

  try {
    const account = await prisma.accounts.findUnique({ where: { Account_ID: parseInt(id) } });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const updatedAccount = await prisma.accounts.update({
      where: { Account_ID: parseInt(id) },
      data: { Account_Balance: parseFloat(account.Account_Balance) + parseFloat(amount) }
    });

    res.json({ success: true, newBalance: parseFloat(updatedAccount.Account_Balance) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
