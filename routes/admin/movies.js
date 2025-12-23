const express = require('express');
const router = express.Router();
const { PrismaClient } = require('../../generated/prisma');
const { authMiddleware, adminMiddleware } = require('../../middleware/auth');
const prisma = new PrismaClient();

// Apply admin middleware to all routes
router.use(adminMiddleware);

// GET all movies
router.get('/', async (req, res) => {
  try {
    const movies = await prisma.movies.findMany({
      include: {
        genres: true
      },
      orderBy: {
        Added_At: 'desc'
      }
    });
    res.json(movies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE movie
router.post('/', async (req, res) => {
  try {
    const movie = await prisma.movies.create({ 
      data: req.body,
      include: {
        genres: true
      }
    });
    res.json(movie);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE movie
router.put('/:id', async (req, res) => {
  try {
    const movie = await prisma.movies.update({
      where: { Movie_ID: parseInt(req.params.id) },
      data: req.body,
      include: {
        genres: true
      }
    });
    res.json(movie);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE movie (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    await prisma.movies.update({
      where: { Movie_ID: parseInt(req.params.id) },
      data: { IsActive: false }
    });
    res.json({ success: true, message: 'Movie deactivated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all genres
router.get('/genres', async (req, res) => {
  try {
    const genres = await prisma.genres.findMany({
      orderBy: {
        Name: 'asc'
      }
    });
    res.json(genres);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;