const express = require('express');
const router = express.Router();
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

// --------------------
// Get all bookings (admin) or filter by user
// --------------------
router.get('/', async (req, res) => {
  const { userId } = req.query;

  try {
    const bookings = await prisma.bookings.findMany({
      where: userId ? { User_ID: parseInt(userId) } : {},
      include: {
        showtimes: {
          include: {
            movies: true,
            theaters: true,
            formats: true,
            languages_showtimes_Language_IDTolanguages: true,
            languages_showtimes_Captions_IDTolanguages: true
          }
        },
        accounts: true
      }
    });

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------
// Create booking
// --------------------
// --------------------
// Create booking with balance check
// --------------------
router.post('/create', async (req, res) => {
  const { Show_ID, User_ID, Tickets, Total_Price } = req.body;

  if (!Show_ID || !User_ID || !Tickets || !Total_Price) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Check user balance
    const account = await prisma.accounts.findUnique({
      where: { Account_ID: parseInt(User_ID) }
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const currentBalance = parseFloat(account.Account_Balance);
    const price = parseFloat(Total_Price);

    if (currentBalance < price) {
      return res.status(400).json({ 
        error: 'Insufficient balance',
        required: price,
        current: currentBalance
      });
    }

    // Create booking
    const booking = await prisma.bookings.create({
      data: {
        Show_ID: parseInt(Show_ID),
        User_ID: parseInt(User_ID),
        Tickets: parseInt(Tickets),
        Total_Price: price,
        Payment_Method: 'wallet',
        Payment_Date: new Date()
      }
    });

    // Deduct from balance
    await prisma.accounts.update({
      where: { Account_ID: parseInt(User_ID) },
      data: {
        Account_Balance: currentBalance - price
      }
    });

    res.json({ 
      message: 'Booking successful', 
      booking,
      newBalance: currentBalance - price
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// --------------------
// Get booking by ID
// --------------------
router.get('/:id', async (req, res) => {
  try {
    const booking = await prisma.bookings.findUnique({
      where: { Booking_ID: parseInt(req.params.id) },
      include: {
        showtimes: {
          include: {
            movies: true,
            theaters: true,
            formats: true,
            languages_showtimes_Language_IDTolanguages: true,
            languages_showtimes_Captions_IDTolanguages: true
          }
        },
        accounts: true
      }
    });

    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------
// Cancel booking 
// --------------------
router.delete('/:id', async (req, res) => {
  try {
    const booking = await prisma.bookings.findUnique({
      where: { Booking_ID: parseInt(req.params.id) }
    });
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    if (!booking.IsActive) {
      return res.status(400).json({ error: 'Booking already cancelled' });
    }
    
    // Deactivate booking
    await prisma.bookings.update({
      where: { Booking_ID: parseInt(req.params.id) },
      data: { IsActive: false }
    });
    
    // Refund to account balance
    const account = await prisma.accounts.findUnique({
      where: { Account_ID: booking.User_ID }
    });
    
    await prisma.accounts.update({
      where: { Account_ID: booking.User_ID },
      data: {
        Account_Balance: parseFloat(account.Account_Balance) + parseFloat(booking.Total_Price)
      }
    });

    res.json({ 
      message: 'Booking cancelled and amount refunded',
      refundedAmount: parseFloat(booking.Total_Price)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
