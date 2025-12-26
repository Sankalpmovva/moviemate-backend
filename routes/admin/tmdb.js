const express = require('express');
const router = express.Router();
const { adminMiddleware } = require('../../middleware/auth');
const { importMovies } = require('../../scripts/tmdbapi');


router.use(adminMiddleware);

router.post('/import', async (req, res) => {
  try {
    await importMovies();
    res.json({ 
      success: true, 
      message: 'Movies imported successfully from TMDB' 
    });
  } catch (err) {
    console.error('TMDB import error:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

//serch movies from TMDB

router.get('/search', async (req, res) => {
  const { title } = req.query;
  if (!title) return res.status(400).json({ error: "Title is required" });

  try {
    const response = await axios.get(`${TMDB_BASE_URL}/search/movie`, {
      params: {
        api_key: TMDB_API_KEY,
        query: title,
        language: 'en-US',
        page: 1,
        include_adult: false
      }
    });

    const movie = response.data.results[0];
    if (!movie) return res.status(404).json({});

    res.json({
      TMDB_ID: movie.id,
      Title: movie.title,
      Poster_URL: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '',
      Overview: movie.overview,
      Release_Date: movie.release_date,
      Rating: movie.vote_average
    });
  } catch (err) {
    console.error('TMDB route error:', err.message);
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;