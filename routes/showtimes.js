const express = require('express');
const router = express.Router();
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

// --------------------
// Get all showtimes (public) - with optional movieId filter
// --------------------
router.get('/', async (req, res) => {
  const { movieId } = req.query;
  
  try {
    const whereClause = { IsActive: true };
    
    // Add movieId filter if provided
    if (movieId) {
      whereClause.Movie_ID = parseInt(movieId);
    }
    
    const showtimes = await prisma.showtimes.findMany({
      where: whereClause,
      include: {
        movies: true,
        theaters: true,
        formats: true,
        languages_showtimes_Language_IDTolanguages: true,   // spoken language
        languages_showtimes_Captions_IDTolanguages: true   // captions language
      },
      orderBy: {
        Show_Date: 'asc'
      }
    });
    res.json(showtimes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// --------------------
// Get showtime by ID
// --------------------
router.get('/:id', async (req, res) => {
  try {
    const showtime = await prisma.showtimes.findUnique({
      where: { Show_ID: parseInt(req.params.id) },
      include: {
        movies: true,
        theaters: true,
        formats: true,
        languages_showtimes_Language_IDTolanguages: true,
        languages_showtimes_Captions_IDTolanguages: true
      }
    });

    if (!showtime) {
      return res.status(404).json({ error: 'Showtime not found' });
    }

    res.json(showtime);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------
// Add new showtime (admin)
// --------------------
router.post('/', async (req, res) => {
  const {
    Movie_ID,
    Theater_ID,
    Show_Date,
    Start_Time,
    End_Time,
    Price,
    Format_ID,
    Language_ID,
    Captions_ID
  } = req.body;

  try {
    const newShowtime = await prisma.showtimes.create({
      data: {
        Movie_ID,
        Theater_ID,
        Show_Date,
        Start_Time,
        End_Time,
        Price,
        Format_ID,
        Language_ID,
        Captions_ID
      }
    });

    res.json({ message: 'Showtime added', newShowtime });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------
// Update showtime (admin)
// --------------------
router.put('/:id', async (req, res) => {
  const {
    Movie_ID,
    Theater_ID,
    Show_Date,
    Start_Time,
    End_Time,
    Price,
    Format_ID,
    Language_ID,
    Captions_ID,
    IsActive
  } = req.body;

  try {
    const updatedShowtime = await prisma.showtimes.update({
      where: { Show_ID: parseInt(req.params.id) },
      data: {
        Movie_ID,
        Theater_ID,
        Show_Date,
        Start_Time,
        End_Time,
        Price,
        Format_ID,
        Language_ID,
        Captions_ID,
        IsActive
      }
    });

    res.json({ message: 'Showtime updated', updatedShowtime });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------
// Delete showtime (soft delete)
// --------------------
router.delete('/:id', async (req, res) => {
  try {
    await prisma.showtimes.update({
      where: { Show_ID: parseInt(req.params.id) },
      data: { IsActive: false }
    });

    res.json({ message: 'Showtime deactivated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
