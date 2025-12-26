const express = require('express');
const router = express.Router();
const { importMovies } = require('../scripts/tmdbapi');
const { generateShowtimes } = require('./customshowtimes');
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

router.post('/', async (req, res) => {
  try {
    const { secret } = req.body;
    

    console.log('Make.com scheduler triggered');

    await importMovies();
    const showtimesCount = await generateShowtimes();

    await prisma.$executeRaw`
      INSERT INTO automation_logs (Trigger_Source, Movies_Imported, Showtimes_Generated, Status, Executed_At)
      VALUES ('make.com', 20, ${showtimesCount}, 'success', NOW())
    `;

    res.json({ 
      success: true,
      message: 'Automated import completed',
      showtimesGenerated: showtimesCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Make scheduler error:', error);
    
    await prisma.$executeRaw`
      INSERT INTO automation_logs (Trigger_Source, Movies_Imported, Showtimes_Generated, Status, Error_Message, Executed_At)
      VALUES ('make.com', 0, 0, 'failed', ${error.message}, NOW())
    `;

    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

router.get('/test', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'Make scheduler is ready',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;