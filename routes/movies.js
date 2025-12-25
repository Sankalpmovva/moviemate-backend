const express = require('express');
const router = express.Router();
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

// --------------------
// Get all movies with basic info only 
router.get('/', async (req, res) => {
  try {
    const movies = await prisma.movies.findMany({
      where: { IsActive: true },
      include: {
        genres: {
          select: {
            Genre_ID: true,
            Name: true
          }
        }
      },
      orderBy: {
        Added_At: 'desc'
      }
    });
    res.json(movies);
  } catch (err) {
    console.error('Error fetching movies:', err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------
// Get single movie by ID 
router.get('/:id', async (req, res) => {
  try {
    const movie = await prisma.movies.findUnique({
      where: { Movie_ID: parseInt(req.params.id) },
      include: {
        genres: {
          select: {
            Genre_ID: true,
            Name: true
          }
        }
      }
    });
    if (!movie) return res.status(404).json({ error: 'Movie not found' });
    res.json(movie);
  } catch (err) {
    console.error('Error fetching movie:', err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------
// Get all formats
router.get('/formats', async (req, res) => {
  try {
    const formats = await prisma.formats.findMany({
      orderBy: {
        Name: 'asc'
      }
    });
    res.json(formats);
  } catch (err) {
    console.error('Error fetching formats:', err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------
// Get all genres
router.get('/genres/all', async (req, res) => {
  try {
    const genres = await prisma.genres.findMany({
      orderBy: {
        Name: 'asc'
      }
    });
    res.json(genres);
  } catch (err) {
    console.error('Error fetching genres:', err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------
// Get movies with showtimes (for filtering)
router.get('/with-showtimes', async (req, res) => {
  try {
    const movies = await prisma.movies.findMany({
      where: { IsActive: true },
      include: {
        genres: true,
        showtimes: {
          where: { IsActive: true },
          include: {
            formats: true,
            screens: true
          }
        }
      },
      orderBy: {
        Added_At: 'desc'
      }
    });
    res.json(movies);
  } catch (err) {
    console.error('Error fetching movies with showtimes:', err);
    res.status(500).json({ error: err.message });
  }
});



module.exports = router;