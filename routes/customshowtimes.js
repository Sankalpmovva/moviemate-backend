const express = require('express');
const router = express.Router();
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

// --------------------
// Helper functions
// --------------------
const formats = [1, 2, 3]; // example Format_IDs
const languages = [1, 2]; // example Language_IDs
const captions = [null, 1, 2]; // Caption Language_IDs or null
const prices = [8.5, 10.0, 12.5]; // example ticket prices
const showHours = ['12:00', '15:30', '18:00', '21:00'];

// Random pick function
const randomPick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// --------------------
// Generate fake showtimes for next 7 days
// --------------------
router.post('/', async (req, res) => {
  try {
    const movies = await prisma.movies.findMany({ where: { IsActive: true } });
    const theaters = await prisma.theaters.findMany();

    if (!movies.length || !theaters.length)
      return res.status(400).json({ error: 'No movies or theaters found' });

    const showtimeData = [];

    for (const movie of movies) {
      for (const theater of theaters) {
        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
          const showDate = new Date();
          showDate.setDate(showDate.getDate() + dayOffset);

          for (const hour of showHours) {
            const [hh, mm] = hour.split(':');
            const startTime = `${hh}:${mm}:00`;
            const endTime = `${parseInt(hh) + 2}:${mm}:00`; // 2h runtime

            showtimeData.push({
              Movie_ID: movie.Movie_ID,
              Theater_ID: theater.Theatre_ID,
              Show_Date: showDate.toISOString().split('T')[0],
              Start_Time: startTime,
              End_Time: endTime,
              Price: randomPick(prices),
              Format_ID: randomPick(formats),
              Language_ID: randomPick(languages),
              Captions_ID: randomPick(captions),
              IsActive: true
            });
          }
        }
      }
    }

    // Bulk insert
    await prisma.showtimes.createMany({ data: showtimeData });

    res.json({ message: 'Fake showtimes generated', count: showtimeData.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
