const express = require('express');
const router = express.Router();
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

// --------------------
// Get all movies (public)
router.get('/', async (req, res) => {
  try {
    const movies = await prisma.movies.findMany({
      where: { IsActive: true },
      include: { genres: true }
    });
    res.json(movies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------
// Get single movie by ID
router.get('/:id', async (req, res) => {
  try {
    const movie = await prisma.movies.findUnique({
      where: { Movie_ID: parseInt(req.params.id) },
      include: { Genres: true }
    });
    if (!movie) return res.status(404).json({ error: 'Movie not found' });
    res.json(movie);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------
// Add new movie (admin)
router.post('/', async (req, res) => {
  const { TMDB_ID, Title, Genre_ID, Runtime, Rating } = req.body;
  try {
    const movie = await prisma.movies.create({
      data: {
        TMDB_ID,
        Title,
        Genre_ID,
        Runtime,
        Rating
      }
    });
    res.json({ message: 'Movie added', movie });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------
// Update movie (admin)
router.put('/:id', async (req, res) => {
  const { TMDB_ID, Title, Genre_ID, Runtime, Rating, IsActive } = req.body;
  try {
    const updated = await prisma.movies.update({
      where: { Movie_ID: parseInt(req.params.id) },
      data: { TMDB_ID, Title, Genre_ID, Runtime, Rating, IsActive }
    });
    res.json({ message: 'Movie updated', updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------
// Delete movie (admin)
router.delete('/:id', async (req, res) => {
  try {
    await prisma.movies.update({
      where: { Movie_ID: parseInt(req.params.id) },
      data: { IsActive: false } 
    });
    res.json({ message: 'Movie deactivated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
