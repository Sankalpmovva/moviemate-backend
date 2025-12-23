const express = require('express');
const router = express.Router();
const { PrismaClient } = require('../../generated/prisma');
const { adminMiddleware } = require('../../middleware/auth');
const prisma = new PrismaClient();

// Apply admin middleware to all routes
router.use(adminMiddleware);

// GET all users with filters and pagination
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status = 'all',
      isAdmin = 'all',
      search = '',
      sortBy = 'Created_At',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    // Filter by active status
    if (status === 'active') {
      where.IsActive = true;
    } else if (status === 'inactive') {
      where.IsActive = false;
    }

    // Filter by admin status
    if (isAdmin === 'true') {
      where.IsAdmin = true;
    } else if (isAdmin === 'false') {
      where.IsAdmin = false;
    }

    // Search filter
    if (search) {
      where.OR = [
        {
          First_Name: {
            contains: search
          }
        },
        {
          Last_Name: {
            contains: search
          }
        },
        {
          Email: {
            contains: search
          }
        }
      ];
    }

    // Get total count for pagination
    const totalCount = await prisma.accounts.count({ where });

    // Get users
    const users = await prisma.accounts.findMany({
      where,
      include: {
        auth_providers: {
          select: {
            Provider_Name: true,
            Created_At: true
          }
        },
        _count: {
          select: {
            bookings: true,
            notifications: true
          }
        }
      },
      orderBy: {
        [sortBy]: sortOrder
      },
      skip,
      take: parseInt(limit)
    });

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET user statistics
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await prisma.accounts.count();
    const activeUsers = await prisma.accounts.count({
      where: { IsActive: true }
    });
    const adminUsers = await prisma.accounts.count({
      where: { IsAdmin: true }
    });

    // New users this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const newUsersThisMonth = await prisma.accounts.count({
      where: {
        Created_At: {
          gte: startOfMonth
        }
      }
    });

    // Users with bookings
    const usersWithBookings = await prisma.accounts.count({
      where: {
        bookings: {
          some: {}
        }
      }
    });

    // Users by signup date (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const usersByDay = await prisma.accounts.groupBy({
      by: ['Created_At'],
      where: {
        Created_At: {
          gte: thirtyDaysAgo
        }
      },
      _count: {
        Account_ID: true
      },
      orderBy: {
        Created_At: 'asc'
      }
    });

    res.json({
      totalUsers,
      activeUsers,
      adminUsers,
      newUsersThisMonth,
      usersWithBookings,
      signupTrend: usersByDay.map(item => ({
        date: item.Created_At,
        count: item._count.Account_ID
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await prisma.accounts.findUnique({
      where: { Account_ID: parseInt(req.params.id) },
      include: {
        auth_providers: true,
        bookings: {
          include: {
            showtimes: {
              include: {
                movies: true,
                theaters: true
              }
            }
          },
          orderBy: {
            Booking_Date: 'desc'
          },
          take: 10
        },
        _count: {
          select: {
            bookings: true,
            notifications: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate total spent
    const totalSpent = await prisma.bookings.aggregate({
      where: {
        User_ID: parseInt(req.params.id),
        IsActive: true
      },
      _sum: {
        Total_Price: true
      }
    });

    res.json({
      ...user,
      totalSpent: parseFloat(totalSpent._sum.Total_Price || 0)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE user
router.put('/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const {
      First_Name,
      Last_Name,
      IsActive,
      IsAdmin,
      Account_Balance
    } = req.body;

    // Check if user exists
    const existingUser = await prisma.accounts.findUnique({
      where: { Account_ID: userId }
    });
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prepare update data
    const updateData = {};
    if (First_Name !== undefined) updateData.First_Name = First_Name;
    if (Last_Name !== undefined) updateData.Last_Name = Last_Name;
    if (IsActive !== undefined) updateData.IsActive = IsActive;
    if (IsAdmin !== undefined) updateData.IsAdmin = IsAdmin;
    if (Account_Balance !== undefined) updateData.Account_Balance = parseFloat(Account_Balance);
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

// ADD balance to user
router.post('/:id/add-balance', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const user = await prisma.accounts.findUnique({
      where: { Account_ID: userId }
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newBalance = parseFloat(user.Account_Balance) + parseFloat(amount);
    const updatedUser = await prisma.accounts.update({
      where: { Account_ID: userId },
      data: {
        Account_Balance: newBalance,
        Updated_At: new Date()
      }
    });

    res.json({
      message: `Added €${amount.toFixed(2)} to user's balance`,
      newBalance: newBalance,
      user: updatedUser
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DEACTIVATE user
router.put('/:id/deactivate', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    const updatedUser = await prisma.accounts.update({
      where: { Account_ID: userId },
      data: {
        IsActive: false,
        Updated_At: new Date()
      }
    });

    res.json({
      message: 'User deactivated successfully',
      user: updatedUser
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ACTIVATE user
router.put('/:id/activate', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    const updatedUser = await prisma.accounts.update({
      where: { Account_ID: userId },
      data: {
        IsActive: true,
        Updated_At: new Date()
      }
    });

    res.json({
      message: 'User activated successfully',
      user: updatedUser
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET user's bookings
router.get('/:id/bookings', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { page = 1, limit = 20, status = 'all' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { User_ID: userId };
    if (status === 'active') {
      where.IsActive = true;
    } else if (status === 'cancelled') {
      where.IsActive = false;
    }

    const [bookings, totalCount] = await Promise.all([
      prisma.bookings.findMany({
        where,
        include: {
          showtimes: {
            include: {
              movies: true,
              theaters: true
            }
          }
        },
        orderBy: {
          Booking_Date: 'desc'
        },
        skip,
        take: parseInt(limit)
      }),
      prisma.bookings.count({ where })
    ]);

    res.json({
      bookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;