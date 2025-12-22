require('dotenv').config();
const axios = require('axios');
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Fetch a batch of popular or now playing movies
async function fetchMoviesBatch() {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/movie/now_playing`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'en-US',
        page: 1,  // can loop multiple pages if needed
      },
    });

    return response.data.results;
  } catch (err) {
    console.error('TMDB fetch error:', err.message);
    return [];
  }
}

// Insert movie into database
async function insertMovie(movie) {
  try {
    // Check if movie already exists
    const existing = await prisma.movies.findUnique({
      where: { TMDB_ID: movie.id }
    });
    if (existing) return existing;

    // Optional: fetch or create genre
    const genresData = movie.genre_ids.map(async (genreId) => {
      return prisma.genres.upsert({
        where: { Genre_ID: genreId },
        update: {},
        create: { Genre_ID: genreId, Name: `Genre ${genreId}` }, // simplified, can map TMDB genre names
      });
    });

    await Promise.all(genresData);

    const newMovie = await prisma.movies.create({
      data: {
        TMDB_ID: movie.id,
        Title: movie.title,
        Poster_URL: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
        Overview: movie.overview,
        Release_Date: movie.release_date,
        Rating: movie.vote_average,
        IsActive: true,
      },
    });

    return newMovie;

  } catch (err) {
    console.error('Insert movie error:', err.message);
    return null;
  }
}

// Main function
(async () => {
  const movies = await fetchMoviesBatch();
  console.log(`Fetched ${movies.length} movies from TMDB.`);

  for (const movie of movies) {
    const inserted = await insertMovie(movie);
    if (inserted) console.log('Inserted:', inserted.Title);
  }

  console.log('All done.');
  process.exit();
})();
