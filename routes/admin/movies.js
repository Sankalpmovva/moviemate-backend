const express = require('express');
const router = express.Router();
const { PrismaClient } = require('../../generated/prisma');
const adminAuth = require('../../middleware/auth');

const prisma = new PrismaClient();

// Apply adminAuth to all routes in this file
router.use(adminAuth);

// GET all movies
router.get('/', async (req, res) => {
  try {
    const movies = await prisma.movies.findMany();
    res.json(movies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new movie
router.post('/', async (req, res) => {
  const { title, description, poster, genre, duration, rating } = req.body;
  try {
    const movie = await prisma.movies.create({
      data: { title, description, poster, genre, duration, rating }
    });
    res.json(movie);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update movie
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  try {
    const movie = await prisma.movies.update({
      where: { Movie_ID: parseInt(id) },
      data
    });
    res.json(movie);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE movie
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.movies.delete({ where: { Movie_ID: parseInt(id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
