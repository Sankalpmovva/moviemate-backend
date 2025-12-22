// ugc.js
const axios = require('axios');
const cheerio = require('cheerio');

const THEATER_URL = 'https://www.ugc.be/films.html'; // Replace with specific theater URL if needed

async function fetchShowtimes() {
  try {
    const { data } = await axios.get(THEATER_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'fr-BE,fr;q=0.9,en;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Referer': 'https://www.google.com/',
      }
    });

    const $ = cheerio.load(data);

    const movies = [];

    $('.film').each((i, el) => {
      const title = $(el).find('.titre-film a').text().trim();
      const times = [];
      
      $(el).find('.seances li').each((j, t) => {
        times.push($(t).text().trim());
      });

      movies.push({ title, showtimes: times });
    });

    return movies;

  } catch (err) {
    console.error('Error fetching UGC showtimes:', err.message);
    return [];
  }
}

// Example usage
(async () => {
  const showtimes = await fetchShowtimes();
  console.log(showtimes);
})();
