const express = require('express');
const router = express.Router();
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

const showHours = ['12:00', '15:30', '18:00', '21:00'];
const randomPick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const generateShowtimes = async () => {
  const movies = await prisma.movies.findMany({ where: { IsActive: true } });
  const theaters = await prisma.theaters.findMany();

  if (!movies.length || !theaters.length) {
    throw new Error('No movies or theaters found');
  }

  const formatRows = await prisma.formats.findMany({ select: { Format_ID: true, Name: true } });
  const languageRows = await prisma.languages.findMany({ select: { Language_ID: true, Name: true } });

  const showtimeData = [];

  for (const movie of movies) {
    const selectedTheater = randomPick(theaters);
    
    for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
      const showDate = new Date();
      showDate.setHours(0, 0, 0, 0);
      showDate.setDate(showDate.getDate() + dayOffset);

      const selectedHours = showHours.sort(() => 0.5 - Math.random()).slice(0, 2);
      
      for (const hour of selectedHours) {
        const [hhStr, mmStr] = hour.split(':');
        const hh = parseInt(hhStr);
        const mm = parseInt(mmStr);

        const startTime = new Date(showDate);
        startTime.setHours(hh, mm, 0, 0);

        const endTime = new Date(showDate);
        let endHour = hh + 2;
        if (endHour >= 24) endHour -= 24;
        endTime.setHours(endHour, mm, 0, 0);

        const format = randomPick(formatRows);
        const language = randomPick(languageRows);
        const caption = Math.random() < 0.5 ? language : null;

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

  await prisma.showtimes.createMany({ data: showtimeData });
  return showtimeData.length;
};

router.post('/', async (req, res) => {
  try {
    const count = await generateShowtimes();
    res.json({ message: 'Fake showtimes generated', count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.generateShowtimes = generateShowtimes;