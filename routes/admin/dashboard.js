const express = require('express');
const router = express.Router();
const { PrismaClient } = require('../../generated/prisma');
const { adminMiddleware } = require('../../middleware/auth');
const prisma = new PrismaClient();

// Apply admin middleware to all routes
router.use(adminMiddleware);

// GET dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    // Get total revenue from active bookings
    const revenueData = await prisma.bookings.aggregate({
      where: { IsActive: true },
      _sum: { Total_Price: true }
    });
    
    const totalRevenue = parseFloat(revenueData._sum.Total_Price || 0);

    // Get total active users
    const totalUsers = await prisma.accounts.count({
      where: { IsActive: true }
    });

    // Get total bookings
    const totalBookings = await prisma.bookings.count({
      where: { IsActive: true } 
    });

    // Get today's bookings
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayBookings = await prisma.bookings.count({
      where: {
        Booking_Date: { gte: today },
        IsActive: true
      }
    });

    // Get active showtimes
    const activeShowtimes = await prisma.showtimes.count({
      where: { 
        IsActive: true,
        Show_Date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      }
    });

    // Get upcoming showtimes (next 7 days)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const upcomingShowtimes = await prisma.showtimes.count({
      where: {
        IsActive: true,
        Show_Date: { 
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: nextWeek
        }
      }
    });

    // Get new users this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const newUsers = await prisma.accounts.count({
      where: {
        Created_At: { gte: oneWeekAgo }
      }
    });

    // Get top movies by bookings
    const topMoviesData = await prisma.bookings.groupBy({
      by: ['Show_ID'],
      where: { IsActive: true },
      _count: { Booking_ID: true },
      orderBy: { _count: { Booking_ID: 'desc' } },
      take: 5
    });

    // Get movie details for top movies
    const topMovies = await Promise.all(
      topMoviesData.map(async (item) => {
        const showtime = await prisma.showtimes.findUnique({
          where: { Show_ID: item.Show_ID },
          include: { movies: true }
        });
        return {
          movieTitle: showtime?.movies?.Title || 'Unknown Movie',
          bookingCount: item._count.Booking_ID
        };
      })
    );

    // Calculate revenue change (this month vs last month)
    const currentMonth = new Date();
    const firstDayCurrentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const firstDayLastMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0);

    const currentMonthRevenueData = await prisma.bookings.aggregate({
      where: {
        IsActive: true,
        Booking_Date: { gte: firstDayCurrentMonth }
      },
      _sum: { Total_Price: true }
    });

    const lastMonthRevenueData = await prisma.bookings.aggregate({
      where: {
        IsActive: true,
        Booking_Date: { 
          gte: firstDayLastMonth,
          lte: lastDayLastMonth
        }
      },
      _sum: { Total_Price: true }
    });

    const currentMonthRevenue = parseFloat(currentMonthRevenueData._sum.Total_Price || 0);
    const lastMonthRevenue = parseFloat(lastMonthRevenueData._sum.Total_Price || 0);
    
    let revenueChange = 0;
    if (lastMonthRevenue > 0) {
      revenueChange = ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
    }

    // Get revenue data for last 7 days
    const revenueData7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      
      const dayRevenueData = await prisma.bookings.aggregate({
        where: {
          IsActive: true,
          Booking_Date: {
            gte: startOfDay,
            lt: endOfDay
          }
        },
        _sum: { Total_Price: true }
      });
      
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      revenueData7Days.push({
        day: dayNames[date.getDay()],
        amount: parseFloat(dayRevenueData._sum.Total_Price || 0)
      });
    }

    // Get recent activity (last 10 bookings)
    const recentBookings = await prisma.bookings.findMany({
      where: { IsActive: true },
      include: {
        accounts: {
          select: {
            First_Name: true,
            Last_Name: true
          }
        },
        showtimes: {
          include: {
            movies: {
              select: { Title: true }
            }
          }
        }
      },
      orderBy: { Booking_Date: 'desc' },
      take: 10
    });

    const recentActivity = recentBookings.map(booking => ({
      id: booking.Booking_ID,
      type: 'booking',
      message: `New booking for "${booking.showtimes?.movies?.Title}" by ${booking.accounts?.First_Name} ${booking.accounts?.Last_Name}`,
      timestamp: booking.Booking_Date
    }));

    res.json({
      totalRevenue,
      totalUsers,
      totalBookings,
      todayBookings,
      activeShowtimes,
      upcomingShowtimes,
      newUsers,
      revenueChange: parseFloat(revenueChange.toFixed(1)),
      topMovies,
      revenueData7Days,
      recentActivity
    });

  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET quick stats (for header cards)
router.get('/quick-stats', async (req, res) => {
  try {
    // Get counts in parallel for better performance
    const [
      totalRevenue,
      totalUsers,
      totalBookings,
      activeShowtimes
    ] = await Promise.all([
      prisma.bookings.aggregate({
        where: { IsActive: true },
        _sum: { Total_Price: true }
      }),
      prisma.accounts.count({ where: { IsActive: true } }),
      prisma.bookings.count(),
      prisma.showtimes.count({ 
        where: { 
          IsActive: true,
          Show_Date: { gte: new Date() }
        }
      })
    ]);

    res.json({
      totalRevenue: parseFloat(totalRevenue._sum.Total_Price || 0),
      totalUsers,
      totalBookings,
      activeShowtimes
    });
  } catch (err) {
    console.error('Error fetching quick stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET revenue data for chart
router.get('/revenue-data', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const revenueData = [];
    
    for (let i = parseInt(days) - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      
      const dayRevenue = await prisma.bookings.aggregate({
        where: {
          IsActive: true,
          Booking_Date: {
            gte: startOfDay,
            lt: endOfDay
          }
        },
        _sum: { Total_Price: true }
      });
      
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      revenueData.push({
        day: dayNames[date.getDay()],
        amount: parseFloat(dayRevenue._sum.Total_Price || 0),
        date: date.toISOString().split('T')[0]
      });
    }
    
    res.json(revenueData);
  } catch (err) {
    console.error('Error fetching revenue data:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET recent activity
router.get('/recent-activity', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const recentBookings = await prisma.bookings.findMany({
      where: { IsActive: true },
      include: {
        accounts: {
          select: {
            First_Name: true,
            Last_Name: true
          }
        },
        showtimes: {
          include: {
            movies: {
              select: { Title: true }
            }
          }
        }
      },
      orderBy: { Booking_Date: 'desc' },
      take: parseInt(limit)
    });

    const recentUsers = await prisma.accounts.findMany({
      orderBy: { Created_At: 'desc' },
      take: 5,
      select: {
        Account_ID: true,
        First_Name: true,
        Last_Name: true,
        Email: true,
        Created_At: true
      }
    });

    const recentMovies = await prisma.movies.findMany({
      where: { IsActive: true },
      orderBy: { Added_At: 'desc' },
      take: 5,
      select: {
        Movie_ID: true,
        Title: true,
        Added_At: true
      }
    });

    const activities = [
      ...recentBookings.map(booking => ({
        id: booking.Booking_ID,
        type: 'booking',
        message: `Booking for "${booking.showtimes?.movies?.Title}" by ${booking.accounts?.First_Name} ${booking.accounts?.Last_Name}`,
        timestamp: booking.Booking_Date,
        amount: booking.Total_Price
      })),
      ...recentUsers.map(user => ({
        id: user.Account_ID,
        type: 'user',
        message: `New user registered: ${user.First_Name} ${user.Last_Name} (${user.Email})`,
        timestamp: user.Created_At
      })),
      ...recentMovies.map(movie => ({
        id: movie.Movie_ID,
        type: 'movie',
        message: `New movie added: "${movie.Title}"`,
        timestamp: movie.Added_At
      }))
    ];

    // Sort by timestamp descending
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json(activities.slice(0, parseInt(limit)));
  } catch (err) {
    console.error('Error fetching recent activity:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET top movies
router.get('/top-movies', async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const topMoviesData = await prisma.bookings.groupBy({
      by: ['Show_ID'],
      where: { IsActive: true },
      _count: { Booking_ID: true },
      orderBy: { _count: { Booking_ID: 'desc' } },
      take: parseInt(limit)
    });

    const topMovies = await Promise.all(
      topMoviesData.map(async (item) => {
        const showtime = await prisma.showtimes.findUnique({
          where: { Show_ID: item.Show_ID },
          include: { movies: true }
        });
        return {
          movieTitle: showtime?.movies?.Title || 'Unknown Movie',
          bookingCount: item._count.Booking_ID,
          movieId: showtime?.movies?.Movie_ID
        };
      })
    );

    res.json(topMovies);
  } catch (err) {
    console.error('Error fetching top movies:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;