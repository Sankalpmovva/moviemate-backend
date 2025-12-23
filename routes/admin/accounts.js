const express = require('express');
const router = express.Router();
const { PrismaClient } = require('../../generated/prisma');
const { adminMiddleware } = require('../../middleware/auth');
const prisma = new PrismaClient();

// Apply admin middleware to all routes
router.use(adminMiddleware);

// GET all users with filters 
router.get('/', async (req, res) => {
  try {
    const { 
      search = '',
      status = 'all',
      role = 'all'
    } = req.query;

    console.log('Query params:', { search, status, role });

    // Build WHERE clause for MySQL
    const where = {};

    // Filter by active status
    if (status === 'active') {
      where.IsActive = true;
    } else if (status === 'inactive') {
      where.IsActive = false;
    }

    // Filter by admin status
    if (role === 'admin') {
      where.IsAdmin = true;
    } else if (role === 'user') {
      where.IsAdmin = false;
    }

    // Search filter 
    if (search && search.trim() !== '') {
      const searchTerm = search.trim();
      
      where.OR = [
        {
          First_Name: {
            contains: searchTerm
          }
        },
        {
          Last_Name: {
            contains: searchTerm
          }
        },
        {
          Email: {
            contains: searchTerm
          }
        }
      ];
      
    }

    console.log('MySQL where clause:', where);

    // Get users with booking count
    const users = await prisma.accounts.findMany({
      where,
      include: {
        _count: {
          select: {
            bookings: true
          }
        }
      },
      orderBy: {
        Created_At: 'desc'
      }
    });

    console.log('Found users:', users.length);
    res.json(users);
    
  } catch (err) {
    console.error('Error in GET /:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE user (toggle admin, activate/deactivate)
router.put('/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { IsActive, IsAdmin } = req.body;

    // Check if user exists
    const existingUser = await prisma.accounts.findUnique({
      where: { Account_ID: userId }
    });
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prepare update data
    const updateData = {};
    if (IsActive !== undefined) updateData.IsActive = IsActive;
    if (IsAdmin !== undefined) updateData.IsAdmin = IsAdmin;
    updateData.Updated_At = new Date();

    // Update user
    const updatedUser = await prisma.accounts.update({
      where: { Account_ID: userId },
      data: updateData
    });

    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET user details (for modal)
router.get('/:id', async (req, res) => {
  try {
    const user = await prisma.accounts.findUnique({
      where: { Account_ID: parseInt(req.params.id) },
      include: {
        bookings: {
          include: {
            showtimes: {
              include: {
                movies: true
              }
            }
          },
          orderBy: {
            Booking_Date: 'desc'
          },
          take: 5
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;