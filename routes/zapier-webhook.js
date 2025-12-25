const express = require('express');
const router = express.Router();
const { importMovies } = require('../scripts/tmdbapi');
const { generateShowtimes } = require('./customshowtimes');
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

const ZAPIER_SECRET = process.env.ZAPIER_SECRET || 'mySecretToken123';

router.post('/', async (req, res) => {
  try {
    const { secret } = req.body;
    
    if (secret !== ZAPIER_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('Zapier webhook triggered');

    await importMovies();
    const showtimesCount = await generateShowtimes();

    await prisma.$executeRaw`
      INSERT INTO automation_logs (Trigger_Source, Movies_Imported, Showtimes_Generated, Status, Executed_At)
      VALUES ('zapier', 20, ${showtimesCount}, 'success', NOW())
    `;

    res.json({ 
      success: true,
      message: 'Automated import completed',
      showtimesGenerated: showtimesCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Zapier webhook error:', error);
    
    await prisma.$executeRaw`
      INSERT INTO automation_logs (Trigger_Source, Movies_Imported, Showtimes_Generated, Status, Error_Message, Executed_At)
      VALUES ('zapier', 0, 0, 'failed', ${error.message}, NOW())
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
    message: 'Zapier webhook is ready',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;