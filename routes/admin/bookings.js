const express = require('express');
const router = express.Router();
const { PrismaClient } = require('../../generated/prisma');
const { adminMiddleware } = require('../../middleware/auth');
const prisma = new PrismaClient();

// Apply admin middleware to all routes
router.use(adminMiddleware);

// GET all bookings with filters and pagination
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status = 'all', 
      search = '',
      sortBy = 'Booking_Date',
      sortOrder = 'desc',
      dateFrom,
      dateTo
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    // Filter by active status
    if (status === 'active') {
      where.IsActive = true;
    } else if (status === 'cancelled') {
      where.IsActive = false;
    }

    // Search filter (by user email or movie title)
    if (search) {
      where.OR = [
        {
          accounts: {
            Email: {
              contains: search
            }
          }
        },
        {
          showtimes: {
            movies: {
              Title: {
                contains: search
              }
            }
          }
        }
      ];
    }

    // Date range filter
    if (dateFrom || dateTo) {
      where.Booking_Date = {};
      if (dateFrom) {
        where.Booking_Date.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.Booking_Date.lte = new Date(dateTo);
      }
    }

    // Get total count for pagination
    const totalCount = await prisma.bookings.count({ where });

    // Get bookings with relationships
    const bookings = await prisma.bookings.findMany({
      where,
      include: {
        accounts: {
          select: {
            Account_ID: true,
            First_Name: true,
            Last_Name: true,
            Email: true
          }
        },
        showtimes: {
          include: {
            movies: true,
            theaters: true,
            formats: true
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

// GET booking statistics
router.get('/stats', async (req, res) => {
  try {
    const totalBookings = await prisma.bookings.count();
    const activeBookings = await prisma.bookings.count({
      where: { IsActive: true }
    });
    const cancelledBookings = await prisma.bookings.count({
      where: { IsActive: false }
    });

    // Total revenue
    const revenueData = await prisma.bookings.aggregate({
      where: { IsActive: true },
      _sum: {
        Total_Price: true
      }
    });

    // Bookings today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayBookings = await prisma.bookings.count({
      where: {
        Booking_Date: {
          gte: today
        }
      }
    });

    // Top movies by bookings
    const topMovies = await prisma.bookings.groupBy({
      by: ['Show_ID'],
      where: { IsActive: true },
      _count: {
        Booking_ID: true
      },
      orderBy: {
        _count: {
          Booking_ID: 'desc'
        }
      },
      take: 5
    });

    // Populate movie details for top movies
    const topMoviesWithDetails = await Promise.all(
      topMovies.map(async (item) => {
        const showtime = await prisma.showtimes.findUnique({
          where: { Show_ID: item.Show_ID },
          include: { movies: true }
        });
        return {
          movieTitle: showtime?.movies?.Title || 'Unknown',
          bookingCount: item._count.Booking_ID
        };
      })
    );

    res.json({
      totalBookings,
      activeBookings,
      cancelledBookings,
      totalRevenue: parseFloat(revenueData._sum.Total_Price || 0),
      todayBookings,
      topMovies: topMoviesWithDetails
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single booking by ID
router.get('/:id', async (req, res) => {
  try {
    const booking = await prisma.bookings.findUnique({
      where: { Booking_ID: parseInt(req.params.id) },
      include: {
        accounts: {
          select: {
            Account_ID: true,
            First_Name: true,
            Last_Name: true,
            Email: true,
            Account_Balance: true
          }
        },
        showtimes: {
          include: {
            movies: true,
            theaters: true,
            formats: true,
            languages_showtimes_Language_IDTolanguages: true,
            languages_showtimes_Captions_IDTolanguages: true
          }
        }
      }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CANCEL booking (admin override)
router.put('/:id/cancel', async (req, res) => {
  try {
    const booking = await prisma.bookings.findUnique({
      where: { Booking_ID: parseInt(req.params.id) }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (!booking.IsActive) {
      return res.status(400).json({ error: 'Booking already cancelled' });
    }

    // Deactivate booking
    await prisma.bookings.update({
      where: { Booking_ID: parseInt(req.params.id) },
      data: { IsActive: false }
    });

    // Refund to account balance
    const account = await prisma.accounts.findUnique({
      where: { Account_ID: booking.User_ID }
    });

    await prisma.accounts.update({
      where: { Account_ID: booking.User_ID },
      data: {
        Account_Balance: parseFloat(account.Account_Balance) + parseFloat(booking.Total_Price)
      }
    });

    res.json({
      message: 'Booking cancelled and refunded successfully',
      refundedAmount: parseFloat(booking.Total_Price)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REACTIVATE booking
router.put('/:id/reactivate', async (req, res) => {
  try {
    const booking = await prisma.bookings.findUnique({
      where: { Booking_ID: parseInt(req.params.id) }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.IsActive) {
      return res.status(400).json({ error: 'Booking is already active' });
    }

    await prisma.bookings.update({
      where: { Booking_ID: parseInt(req.params.id) },
      data: { IsActive: true }
    });

    res.json({ message: 'Booking reactivated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;