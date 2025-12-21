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
router.post('/', async (req, res) => {
  const { Show_ID, User_ID, Tickets, Total_Price, Payment_Method } = req.body;

  try {
    const booking = await prisma.bookings.create({
      data: {
        Show_ID,
        User_ID,
        Tickets,
        Total_Price,
        Payment_Method,
        Payment_Date: new Date()
      }
    });

    res.json({ message: 'Booking successful', booking });
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
// Cancel booking (soft delete)
// --------------------
router.delete('/:id', async (req, res) => {
  try {
    await prisma.bookings.update({
      where: { Booking_ID: parseInt(req.params.id) },
      data: { IsActive: false }
    });

    res.json({ message: 'Booking cancelled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
