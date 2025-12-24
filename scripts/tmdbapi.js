require('dotenv').config();
const axios = require('axios');
const { PrismaClient } = require('../generated/prisma');

const prisma = new PrismaClient();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// --------------------
// Fetch popular/now-playing movies from TMDB
// --------------------
async function fetchPopularMovies(page = 1) {
  const response = await axios.get(`${TMDB_BASE_URL}/movie/now_playing`, {
    params: {
      api_key: TMDB_API_KEY,
      language: 'en-US',
      page,
    },
  });

  return response.data.results || [];
}

// --------------------
// Fetch TMDB genres once
// --------------------
let tmdbGenres = [];
async function fetchTMDBGenres() {
  if (tmdbGenres.length > 0) return tmdbGenres;

  const response = await axios.get(`${TMDB_BASE_URL}/genre/movie/list`, {
    params: { api_key: TMDB_API_KEY, language: 'en-US' },
  });
  tmdbGenres = response.data.genres || [];
  return tmdbGenres;
}

// --------------------
// Insert movies into database
// --------------------
async function importMovies() {
  const genresList = await fetchTMDBGenres();
  const movies = await fetchPopularMovies();

  for (const movie of movies) {
    try {
      if (!movie.genre_ids || movie.genre_ids.length === 0) continue;

      // Use the first genre only
      const genreId = movie.genre_ids[0];
      const genreData = genresList.find(g => g.id === genreId);
      if (!genreData) continue;

      // Ensure genre exists in DB
      const dbGenre = await prisma.genres.upsert({
        where: { Name: genreData.name },
        update: {},
        create: { Name: genreData.name },
      });

      // Insert movie
      await prisma.movies.create({
        data: {
          TMDB_ID: movie.id,
          Title: movie.title,
          Poster_URL: movie.poster_path
            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
            : null,
          Overview: movie.overview,
          Release_Date: movie.release_date ? new Date(movie.release_date) : null,
          Rating: movie.vote_average,
          IsActive: true,
          Genre_ID: dbGenre.Genre_ID,
        },
      });

      console.log(`Inserted: ${movie.title}`);
    } catch (err) {
      console.error(`Insert failed for "${movie.title}":`, err.message);
    }
  }

  console.log('Movie import completed.');
  await prisma.$disconnect();
}

// --------------------
//importMovies();

module.exports = { importMovies, fetchPopularMovies, fetchTMDBGenres };
