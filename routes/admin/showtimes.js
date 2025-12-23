const express = require('express');
const router = express.Router();
const { PrismaClient } = require('../../generated/prisma');
const { adminMiddleware } = require('../../middleware/auth');
const prisma = new PrismaClient();

// Apply admin middleware to all routes
router.use(adminMiddleware);

// GET all showtimes for a movie (for dropdown)
router.get('/movie/:movieId', async (req, res) => {
  try {
    const movieId = parseInt(req.params.movieId);
    
    const showtimes = await prisma.showtimes.findMany({
      where: { Movie_ID: movieId },
      include: {
        theaters: true,
        formats: true,
        movies: true
      },
      orderBy: [
        { Show_Date: 'asc' },
        { Start_Time: 'asc' }
      ]
    });
    
    res.json(showtimes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all showtimes (for admin table)
router.get('/', async (req, res) => {
  try {
    const showtimes = await prisma.showtimes.findMany({
      include: {
        theaters: true,
        formats: true,
        movies: true,
        languages_showtimes_Language_IDTolanguages: true
      },
      orderBy: [
        { Show_Date: 'desc' },
        { Start_Time: 'asc' }
      ],
      take: 100 // Limit to 100 showtimes
    });
    
    res.json(showtimes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET dropdown data (movies, theatres, formats, languages)
router.get('/dropdowns', async (req, res) => {
  try {
    const [movies, theatres, formats, languages] = await Promise.all([
      prisma.movies.findMany({ where: { IsActive: true } }),
      prisma.theaters.findMany(),
      prisma.formats.findMany(),
      prisma.languages.findMany()
    ]);
    
    res.json({ movies, theatres, formats, languages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE new showtime (simple version)
router.post('/', async (req, res) => {
  try {
    const {
      Movie_ID,
      Theater_ID,
      Show_Date,
      Start_Time,
      Price,
      Format_ID,
      Language_ID
    } = req.body;

    // Calculate end time based on movie runtime
    const movie = await prisma.movies.findUnique({
      where: { Movie_ID: parseInt(Movie_ID) },
      select: { Runtime: true }
    });

    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    // Calculate end time
    const [hours, minutes] = Start_Time.split(':').map(Number);
    const startDate = new Date(`1970-01-01T${Start_Time}`);
    const endDate = new Date(startDate.getTime() + (movie.Runtime || 120) * 60000);
    const End_Time = endDate.toTimeString().slice(0, 5);

    const showtime = await prisma.showtimes.create({
      data: {
        Movie_ID: parseInt(Movie_ID),
        Theater_ID: parseInt(Theater_ID),
        Show_Date: new Date(Show_Date),
        Start_Time: new Date(`1970-01-01T${Start_Time}`),
        End_Time: new Date(`1970-01-01T${End_Time}`),
        Price: parseFloat(Price),
        Format_ID: parseInt(Format_ID),
        Language_ID: parseInt(Language_ID),
        IsActive: true
      }
    });

    res.status(201).json({
      message: 'Showtime added successfully',
      showtime
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE showtime
router.delete('/:id', async (req, res) => {
  try {
    const showtimeId = parseInt(req.params.id);
    
    // Check if showtime exists
    const showtime = await prisma.showtimes.findUnique({
      where: { Show_ID: showtimeId }
    });
    
    if (!showtime) {
      return res.status(404).json({ error: 'Showtime not found' });
    }
    
    // Delete the showtime
    await prisma.showtimes.delete({
      where: { Show_ID: showtimeId }
    });
    
    res.json({ message: 'Showtime deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;