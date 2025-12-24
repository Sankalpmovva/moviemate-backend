const express = require('express');
const router = express.Router();
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

// --------------------
// Helper functions
// --------------------
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

    // Fetch available formats and languages from DB
    const formatRows = await prisma.formats.findMany({ select: { Format_ID: true, Name: true } });
    const languageRows = await prisma.languages.findMany({ select: { Language_ID: true, Name: true } });

const showtimeData = [];

// Generate showtimes for ALL movies
for (const movie of movies) {
  // Pick only 1 random theater per movie (reduced from 2)
  const selectedTheater = randomPick(theaters);
  
  // Reduce to only 3 days instead of 7
  for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
    const showDate = new Date();
    showDate.setHours(0, 0, 0, 0);
    showDate.setDate(showDate.getDate() + dayOffset);

    // Reduce to only 2 showtimes per day (pick 2 random hours)
    const selectedHours = showHours.sort(() => 0.5 - Math.random()).slice(0, 2);
    
    for (const hour of selectedHours) {
      const [hhStr, mmStr] = hour.split(':');
      const hh = parseInt(hhStr);
      const mm = parseInt(mmStr);

      // Start time Date object
      const startTime = new Date(showDate);
      startTime.setHours(hh, mm, 0, 0);

      // End time (2h runtime)
      const endTime = new Date(showDate);
      let endHour = hh + 2;
      if (endHour >= 24) endHour -= 24;
      endTime.setHours(endHour, mm, 0, 0);

      // Pick random format and language
      const format = randomPick(formatRows);
      const language = randomPick(languageRows);

      // Randomly assign captions (50% chance)
      const caption = Math.random() < 0.5 ? language : null;

      // Price based on format
      let price = 10;
      if (format.Name.toLowerCase() === '3d') price = 15;
      if (format.Name.toLowerCase() === '4dx') price = 20;

      showtimeData.push({
        Movie_ID: movie.Movie_ID,
        Theater_ID: selectedTheater.Theatre_ID,
        Show_Date: showDate, 
        Start_Time: startTime, 
        End_Time: endTime,     
        Price: price,
        Format_ID: format.Format_ID,
        Language_ID: language.Language_ID,
        Captions_ID: caption ? caption.Language_ID : null,
        IsActive: true
      });
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
