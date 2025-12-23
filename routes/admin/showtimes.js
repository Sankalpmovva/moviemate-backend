const express = require('express');
const router = express.Router();
const { PrismaClient } = require('../../generated/prisma');
const { adminMiddleware } = require('../../middleware/auth');
const prisma = new PrismaClient();

// Apply admin middleware to all routes
router.use(adminMiddleware);

// GET all showtimes with filters and pagination
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      movieId,
      theaterId,
      date,
      formatId,
      status = 'all',
      search = '',
      sortBy = 'Show_Date',
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

    // Filter by movie
    if (movieId) {
      where.Movie_ID = parseInt(movieId);
    }

    // Filter by theatre
    if (theaterId) {
      where.Theater_ID = parseInt(theaterId);
    }

    // Filter by date
    if (date) {
      where.Show_Date = new Date(date);
    }

    // Filter by format
    if (formatId) {
      where.Format_ID = parseInt(formatId);
    }

    // Search filter (by movie title or theatre name)
    if (search) {
      where.OR = [
        {
          movies: {
            Title: {
              contains: search
            }
          }
        },
        {
          theaters: {
            Name: {
              contains: search
            }
          }
        },
        {
          theaters: {
            City: {
              contains: search
            }
          }
        }
      ];
    }

    // Get total count for pagination
    const totalCount = await prisma.showtimes.count({ where });

    // Get showtimes with relationships
    const showtimes = await prisma.showtimes.findMany({
      where,
      include: {
        movies: true,
        theaters: true,
        formats: true,
        languages_showtimes_Language_IDTolanguages: true,
        languages_showtimes_Captions_IDTolanguages: true
      },
      orderBy: {
        [sortBy]: sortOrder
      },
      skip,
      take: parseInt(limit)
    });

    res.json({
      showtimes,
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

// GET showtime statistics
router.get('/stats', async (req, res) => {
  try {
    const totalShowtimes = await prisma.showtimes.count();
    const activeShowtimes = await prisma.showtimes.count({
      where: { IsActive: true }
    });
    const upcomingShowtimes = await prisma.showtimes.count({
      where: {
        Show_Date: {
          gte: new Date()
        }
      }
    });

    // Showtimes by theatre
    const showtimesByTheatre = await prisma.showtimes.groupBy({
      by: ['Theater_ID'],
      _count: {
        Show_ID: true
      },
      orderBy: {
        _count: {
          Show_ID: 'desc'
        }
      },
      take: 5
    });

    // Showtimes by movie
    const showtimesByMovie = await prisma.showtimes.groupBy({
      by: ['Movie_ID'],
      _count: {
        Show_ID: true
      },
      orderBy: {
        _count: {
          Show_ID: 'desc'
        }
      },
      take: 5
    });

    // Populate theatre details
    const showtimesByTheatreWithDetails = await Promise.all(
      showtimesByTheatre.map(async (item) => {
        const theatre = await prisma.theaters.findUnique({
          where: { Theatre_ID: item.Theater_ID }
        });
        return {
          theatreName: theatre?.Name || 'Unknown',
          theatreCity: theatre?.City || 'Unknown',
          showtimeCount: item._count.Show_ID
        };
      })
    );

    // Populate movie details
    const showtimesByMovieWithDetails = await Promise.all(
      showtimesByMovie.map(async (item) => {
        const movie = await prisma.movies.findUnique({
          where: { Movie_ID: item.Movie_ID }
        });
        return {
          movieTitle: movie?.Title || 'Unknown',
          showtimeCount: item._count.Show_ID
        };
      })
    );

    res.json({
      totalShowtimes,
      activeShowtimes,
      upcomingShowtimes,
      showtimesByTheatre: showtimesByTheatreWithDetails,
      showtimesByMovie: showtimesByMovieWithDetails
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single showtime by ID
router.get('/:id', async (req, res) => {
  try {
    const showtime = await prisma.showtimes.findUnique({
      where: { Show_ID: parseInt(req.params.id) },
      include: {
        movies: true,
        theaters: true,
        formats: true,
        languages_showtimes_Language_IDTolanguages: true,
        languages_showtimes_Captions_IDTolanguages: true
      }
    });

    if (!showtime) {
      return res.status(404).json({ error: 'Showtime not found' });
    }

    res.json(showtime);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE new showtime
router.post('/', async (req, res) => {
  try {
    const {
      Movie_ID,
      Theater_ID,
      Show_Date,
      Start_Time,
      End_Time,
      Price,
      Format_ID,
      Language_ID,
      Captions_ID = null,
      IsActive = true
    } = req.body;

    // Validate required fields
    if (!Movie_ID || !Theater_ID || !Show_Date || !Start_Time || !Price || !Format_ID || !Language_ID) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate that movie exists
    const movie = await prisma.movies.findUnique({
      where: { Movie_ID: parseInt(Movie_ID) }
    });
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    // Validate that theatre exists
    const theatre = await prisma.theaters.findUnique({
      where: { Theatre_ID: parseInt(Theater_ID) }
    });
    if (!theatre) {
      return res.status(404).json({ error: 'Theatre not found' });
    }

    // Validate that format exists
    const format = await prisma.formats.findUnique({
      where: { Format_ID: parseInt(Format_ID) }
    });
    if (!format) {
      return res.status(404).json({ error: 'Format not found' });
    }

    // Validate that language exists
    const language = await prisma.languages.findUnique({
      where: { Language_ID: parseInt(Language_ID) }
    });
    if (!language) {
      return res.status(404).json({ error: 'Language not found' });
    }

    // Validate caption language if provided
    if (Captions_ID) {
      const captionLanguage = await prisma.languages.findUnique({
        where: { Language_ID: parseInt(Captions_ID) }
      });
      if (!captionLanguage) {
        return res.status(404).json({ error: 'Caption language not found' });
      }
    }

    // Create showtime
    const showtime = await prisma.showtimes.create({
      data: {
        Movie_ID: parseInt(Movie_ID),
        Theater_ID: parseInt(Theater_ID),
        Show_Date: new Date(Show_Date),
        Start_Time: new Date(`1970-01-01T${Start_Time}`),
        End_Time: new Date(`1970-01-01T${End_Time}`),
        Price: parseFloat(Price),
        Format_ID: parseInt(Format_ID),
        Language_ID: parseInt(Language_ID),
        Captions_ID: Captions_ID ? parseInt(Captions_ID) : null,
        IsActive: IsActive
      },
      include: {
        movies: true,
        theaters: true,
        formats: true,
        languages_showtimes_Language_IDTolanguages: true,
        languages_showtimes_Captions_IDTolanguages: true
      }
    });

    res.status(201).json({
      message: 'Showtime created successfully',
      showtime
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE showtime
router.put('/:id', async (req, res) => {
  try {
    const showtimeId = parseInt(req.params.id);
    const {
      Movie_ID,
      Theater_ID,
      Show_Date,
      Start_Time,
      End_Time,
      Price,
      Format_ID,
      Language_ID,
      Captions_ID,
      IsActive
    } = req.body;

    // Check if showtime exists
    const existingShowtime = await prisma.showtimes.findUnique({
      where: { Show_ID: showtimeId }
    });
    if (!existingShowtime) {
      return res.status(404).json({ error: 'Showtime not found' });
    }

    // Prepare update data
    const updateData = {};
    if (Movie_ID !== undefined) updateData.Movie_ID = parseInt(Movie_ID);
    if (Theater_ID !== undefined) updateData.Theater_ID = parseInt(Theater_ID);
    if (Show_Date !== undefined) updateData.Show_Date = new Date(Show_Date);
    if (Start_Time !== undefined) updateData.Start_Time = new Date(`1970-01-01T${Start_Time}`);
    if (End_Time !== undefined) updateData.End_Time = new Date(`1970-01-01T${End_Time}`);
    if (Price !== undefined) updateData.Price = parseFloat(Price);
    if (Format_ID !== undefined) updateData.Format_ID = parseInt(Format_ID);
    if (Language_ID !== undefined) updateData.Language_ID = parseInt(Language_ID);
    if (Captions_ID !== undefined) updateData.Captions_ID = Captions_ID ? parseInt(Captions_ID) : null;
    if (IsActive !== undefined) updateData.IsActive = IsActive;

    // Update showtime
    const updatedShowtime = await prisma.showtimes.update({
      where: { Show_ID: showtimeId },
      data: updateData,
      include: {
        movies: true,
        theaters: true,
        formats: true,
        languages_showtimes_Language_IDTolanguages: true,
        languages_showtimes_Captions_IDTolanguages: true
      }
    });

    res.json({
      message: 'Showtime updated successfully',
      showtime: updatedShowtime
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE/DEACTIVATE showtime
router.delete('/:id', async (req, res) => {
  try {
    const showtimeId = parseInt(req.params.id);

    // Check if showtime exists
    const existingShowtime = await prisma.showtimes.findUnique({
      where: { Show_ID: showtimeId }
    });
    if (!existingShowtime) {
      return res.status(404).json({ error: 'Showtime not found' });
    }

    // Check if there are any active bookings for this showtime
    const activeBookings = await prisma.bookings.count({
      where: {
        Show_ID: showtimeId,
        IsActive: true
      }
    });

    if (activeBookings > 0) {
      return res.status(400).json({
        error: `Cannot delete showtime with ${activeBookings} active bookings. Please cancel bookings first.`
      });
    }

    // Soft delete (deactivate) the showtime
    await prisma.showtimes.update({
      where: { Show_ID: showtimeId },
      data: { IsActive: false }
    });

    res.json({ message: 'Showtime deactivated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ACTIVATE showtime
router.put('/:id/activate', async (req, res) => {
  try {
    const showtimeId = parseInt(req.params.id);

    const updatedShowtime = await prisma.showtimes.update({
      where: { Show_ID: showtimeId },
      data: { IsActive: true }
    });

    res.json({ 
      message: 'Showtime activated successfully',
      showtime: updatedShowtime
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;