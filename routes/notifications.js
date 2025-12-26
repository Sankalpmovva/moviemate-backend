const express = require('express');
const router = express.Router();
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

// Get all notifications for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const notifications = await prisma.notifications.findMany({
      where: { User_ID: parseInt(req.params.userId) },
      orderBy: { Sent_At: 'desc' },
      take: 50 // Limit to last 50 notifications
    });
    
    res.json(notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: err.message });
  }
});


// Delete a notification
router.delete('/:id', async (req, res) => {
  try {
    await prisma.notifications.delete({
      where: { Notification_ID: parseInt(req.params.id) }
    });
    
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    console.error('Error deleting notification:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete all notifications for a user
router.delete('/user/:userId/all', async (req, res) => {
  try {
    await prisma.notifications.deleteMany({
      where: { User_ID: parseInt(req.params.userId) }
    });
    
    res.json({ message: 'All notifications deleted' });
  } catch (err) {
    console.error('Error deleting notifications:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;