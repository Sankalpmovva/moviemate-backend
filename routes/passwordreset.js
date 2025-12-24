const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { PrismaClient } = require('../generated/prisma');
const { sendEmail } = require('../config/email');
const prisma = new PrismaClient();

// Generate random 6-digit code
const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// POST /password-reset/request - Request password reset
router.post('/request', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if account exists
    const account = await prisma.accounts.findUnique({
      where: { Email: email }
    });

    if (!account) {
      
      return res.json({ message: 'If that email exists, a reset code has been sent.' });
    }

    // Generate 6-digit code
    const code = generateCode();
    
    // Set expiration to 15 minutes from now
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    // Delete any existing codes for this user and purpose
    await prisma.verification_codes.deleteMany({
      where: {
        User_ID: account.Account_ID,
        Purpose: 'password_reset'
      }
    });

    // Create new verification code
    await prisma.verification_codes.create({
      data: {
        User_ID: account.Account_ID,
        Purpose: 'password_reset',
        Code: code,
        Expires_At: expiresAt
      }
    });

    // Send email
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ff6b00;">MovieMate Password Reset</h2>
        <p>Hi ${account.First_Name || 'there'},</p>
        <p>You requested to reset your password. Use the code below:</p>
        <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #ff6b00; letter-spacing: 5px; margin: 0;">${code}</h1>
        </div>
        <p>This code will expire in 15 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">MovieMate - Your Cinema Booking Platform</p>
      </div>
    `;

    await sendEmail(email, 'MovieMate - Password Reset Code', emailHtml);

    res.json({ message: 'If that email exists, a reset code has been sent.' });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// POST /password-reset/verify - Verify code and reset password
router.post('/verify', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, code, and new password are required' });
    }

    // Find account
    const account = await prisma.accounts.findUnique({
      where: { Email: email }
    });

    if (!account) {
      return res.status(400).json({ error: 'Invalid reset code' });
    }

    // Find verification code
    const verificationCode = await prisma.verification_codes.findFirst({
      where: {
        User_ID: account.Account_ID,
        Purpose: 'password_reset',
        Code: code
      },
      orderBy: {
        Sent_At: 'desc'
      }
    });

    if (!verificationCode) {
      return res.status(400).json({ error: 'Invalid reset code' });
    }

    // Check if code is expired
    if (new Date() > new Date(verificationCode.Expires_At)) {
      return res.status(400).json({ error: 'Reset code has expired' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in auth_providers
    await prisma.auth_providers.updateMany({
      where: {
        User_ID: account.Account_ID,
        Provider_Name: 'password'
      },
      data: {
        Password_Hash: hashedPassword,
        Updated_At: new Date()
      }
    });

    // Delete used verification code
    await prisma.verification_codes.delete({
      where: {
        Code_ID: verificationCode.Code_ID
      }
    });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Password reset verify error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;