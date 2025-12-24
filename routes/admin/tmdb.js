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

module.exports = router;