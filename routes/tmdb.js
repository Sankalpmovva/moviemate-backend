const express = require('express');
const router = express.Router();
const axios = require('axios');

const TMDB_API_KEY = process.env.TMDB_API_KEY; // already in your .env

// GET /tmdb?title=Movie+Name
router.get('/', async (req, res) => {
  const { title } = req.query;
  if (!title) return res.status(400).json({ error: 'Missing title' });

  try {
    const response = await axios.get('https://api.themoviedb.org/3/search/movie', {
      params: {
        api_key: TMDB_API_KEY,
        query: title,
      },
    });

    const movie = response.data.results[0];
    if (!movie) return res.json(null);

    res.json({
      TMDB_ID: movie.id,
      Title: movie.title,
      Poster_URL: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      Overview: movie.overview,
      Release_Date: movie.release_date,
      Rating: movie.vote_average,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'TMDB fetch failed' });
  }
});

module.exports = router;
