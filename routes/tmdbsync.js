const express = require('express');
const router = express.Router();
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();
const { fetchMovieDetails } = require('../scripts/tmdbapi');

// GET /tmdb-sync
// Fetch TMDB details for all movies in DB and update the database
router.get('/', async (req, res) => {
  try {
    // 1. Get all movies from DB
    const movies = await prisma.movies.findMany();

    const updatedMovies = [];

    // 2. Loop through each movie and fetch details from TMDB
    for (const movie of movies) {
      const tmdbData = await fetchMovieDetails(movie.Title);
      if (tmdbData) {
        const updated = await prisma.movies.update({
          where: { Movie_ID: movie.Movie_ID },
          data: {
            Poster_URL: tmdbData.Poster_URL,
            Overview: tmdbData.Overview,
            Release_Date: tmdbData.Release_Date,
            Rating: tmdbData.Rating
          }
        });
        updatedMovies.push(updated);
      }
    }

    res.json({ message: 'TMDB sync complete', updatedCount: updatedMovies.length });
  } catch (err) {
    console.error('TMDB sync error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
