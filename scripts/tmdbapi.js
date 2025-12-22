require('dotenv').config();
const axios = require('axios');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// --------------------
// Function to search a movie by title
// --------------------
async function fetchMovieDetails(title) {
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

    const results = response.data.results;
    if (!results || results.length === 0) {
      return null; // movie not found
    }

    // Take the first result (most relevant)
    const movie = results[0];

    return {
      TMDB_ID: movie.id,
      Title: movie.title,
      Poster_URL: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      Overview: movie.overview,
      Release_Date: movie.release_date,
      Rating: movie.vote_average
    };

  } catch (err) {
    console.error('TMDB API error:', err.message);
    return null;
  }
}

// --------------------
// Example usage
// --------------------
(async () => {
  const movieTitle = 'Avatar: The Way of Water';
  const movieData = await fetchMovieDetails(movieTitle);
  console.log(movieData);
})();

module.exports = { fetchMovieDetails };
