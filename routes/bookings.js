const express = require('express');
const router = express.Router();
const { sendBookingConfirmation, sendBookingCancellation } = require('../config/notifications');
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

// --------------------
// Get all bookings (admin) or filter by user
// --------------------
router.get('/', async (req, res) => {
  const { userId } = req.query;

  try {
    const bookings = await prisma.bookings.findMany({
      where: userId ? { User_ID: parseInt(userId) } : {},
      include: {
        showtimes: {
          include: {
            movies: true,
            theaters: true,
            formats: true,
            languages_showtimes_Language_IDTolanguages: true,
            languages_showtimes_Captions_IDTolanguages: true
          }
        },
        accounts: true
      }
    });

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------
// Create booking
// --------------------
router.post('/create', async (req, res) => {
  console.log('Booking request received:', req.body);
  
  const { Show_ID, User_ID, Tickets, Total_Price } = req.body;

  if (!Show_ID || !User_ID || !Tickets || !Total_Price) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      received: { Show_ID, User_ID, Tickets, Total_Price }
    });
  }

  try {
    // Validate account exists and has sufficient balance
    const account = await prisma.accounts.findUnique({
      where: { Account_ID: parseInt(User_ID) }
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const currentBalance = parseFloat(account.Account_Balance) || 0;
    const price = parseFloat(Total_Price);

    console.log('Account balance check:', {
      accountId: account.Account_ID,
      currentBalance,
      price,
      sufficient: currentBalance >= price
    });

    if (currentBalance < price) {
      return res.status(400).json({ 
        error: 'Insufficient balance',
        required: price,
        current: currentBalance
      });
    }

    // Get showtime with related data
    const showtime = await prisma.showtimes.findUnique({
      where: { Show_ID: parseInt(Show_ID) },
      include: {
        movies: true,
        theaters: true,
        formats: true,
        languages_showtimes_Language_IDTolanguages: true
      }
    });

    if (!showtime) {
      return res.status(404).json({ error: 'Showtime not found' });
    }

    if (!showtime.Booking_Enabled) {
      return res.status(400).json({ error: 'Booking is closed for this showtime' });
    }

    // Check seat availability
    const totalCapacity = showtime.Total_Capacity || 0;
    const bookedSeats = showtime.Booked_Seats || 0;
    const availableSeats = totalCapacity - bookedSeats;
    
    if (availableSeats < parseInt(Tickets)) {
      return res.status(400).json({ 
        error: 'Not enough seats available',
        totalCapacity,
        bookedSeats,
        availableSeats,
        requestedSeats: parseInt(Tickets)
      });
    }

    // Create booking
    const booking = await prisma.bookings.create({
      data: {
        Show_ID: parseInt(Show_ID),
        User_ID: parseInt(User_ID),
        Tickets: parseInt(Tickets),
        Total_Price: price,
        Payment_Method: 'wallet',
        Payment_Date: new Date(),
        IsActive: true,
        Booking_Date: new Date()
      }
    });

    console.log('Booking created:', booking.Booking_ID);

    // Update account balance
    const newBalance = currentBalance - price;
    await prisma.accounts.update({
      where: { Account_ID: parseInt(User_ID) },
      data: {
        Account_Balance: newBalance
      }
    });

    // Update booked seats count
    await prisma.showtimes.update({
      where: { Show_ID: parseInt(Show_ID) },
      data: {
        Booked_Seats: bookedSeats + parseInt(Tickets)
      }
    });

    // Check if showtime is now full
    const updatedShowtime = await prisma.showtimes.findUnique({
      where: { Show_ID: parseInt(Show_ID) }
    });

    const updatedBookedSeats = updatedShowtime.Booked_Seats || 0;
    const updatedTotalCapacity = updatedShowtime.Total_Capacity || 0;
    
    if (updatedBookedSeats >= updatedTotalCapacity) {
      await prisma.showtimes.update({
        where: { Show_ID: parseInt(Show_ID) },
        data: { Booking_Enabled: false }
      });
      console.log('Showtime marked as full:', Show_ID);
    }
    const bookingDetails = {
      movieTitle: showtime.movies.Title,
      theatreName: showtime.theaters.Name,  
      theatreCity: showtime.theaters.City,
      showDate: updatedShowtime.Show_Date.toISOString().split('T')[0],
      showTime: updatedShowtime.Show_Time,  
      format: showtime.formats.Format_Name,
      ticketCount: parseInt(Tickets),
      totalPrice: price,
      bookingId: booking.Booking_ID
    };
      // Booking confirmation notification
      try {
        await sendBookingConfirmation(account, bookingDetails);
        console.log('Booking notification created for user:', account.Account_ID);
      } catch (notifError) {
        console.error('Failed to create notification:', notifError);
      }
    res.json({ 
      message: 'Booking successful', 
      booking: {
        id: booking.Booking_ID,
        showId: booking.Show_ID,
        userId: booking.User_ID,
        tickets: booking.Tickets,
        totalPrice: booking.Total_Price,
        bookingDate: booking.Booking_Date
      },
      newBalance: newBalance
    });

  } catch (err) {
    console.error('Booking creation error:', {
      error: err.message,
      stack: err.stack,
      body: req.body
    });
    
    res.status(500).json({ 
      error: 'Failed to create booking',
      details: err.message
    });
  }
});
// --------------------
// Get booking by ID
// --------------------
router.get('/:id', async (req, res) => {
  try {
    const booking = await prisma.bookings.findUnique({
      where: { Booking_ID: parseInt(req.params.id) },
      include: {
        showtimes: {
          include: {
            movies: true,
            theaters: true,
            formats: true,
            languages_showtimes_Language_IDTolanguages: true,
            languages_showtimes_Captions_IDTolanguages: true
          }
        },
        accounts: true
      }
    });

    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------
// Cancel booking 
// --------------------
router.delete('/:id', async (req, res) => {
  const bookingId = parseInt(req.params.id);
  console.log('Cancel booking request received for ID:', bookingId);
  
  try {
    // Get booking with all related data using correct relation names
    const booking = await prisma.bookings.findUnique({
      where: { Booking_ID: bookingId },
      include: {
        showtimes: {
          include: {
            movies: true,  // This should work based on your schema
            theaters: true,
            formats: true
          }
        },
        accounts: true
      }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    if (!booking.IsActive) {
      return res.status(400).json({ error: 'Booking already cancelled' });
    }

    console.log('Booking found:', {
      id: booking.Booking_ID,
      showId: booking.Show_ID,
      hasShowtime: !!booking.showtimes,
      hasMovie: !!booking.showtimes?.movies,
      movieTitle: booking.showtimes?.movies?.Title || 'NO MOVIE FOUND'
    });

    // Mark booking as inactive
    await prisma.bookings.update({
      where: { Booking_ID: bookingId },
      data: { IsActive: false }
    });

    console.log('Booking marked as cancelled');

    // Refund amount to account
    const refundAmount = parseFloat(booking.Total_Price);
    const currentBalance = parseFloat(booking.accounts.Account_Balance) || 0;
    const newBalance = currentBalance + refundAmount;

    await prisma.accounts.update({
      where: { Account_ID: booking.User_ID },
      data: {
        Account_Balance: newBalance
      }
    });

    console.log('Balance refunded to account:', booking.User_ID);

    // Return seats to capacity
    const showtime = await prisma.showtimes.findUnique({
      where: { Show_ID: booking.Show_ID }
    });

    if (!showtime) {
      console.error('Showtime not found for booking:', booking.Show_ID);
      return res.status(404).json({ error: 'Showtime not found' });
    }

    const bookedSeats = showtime.Booked_Seats || 0;
    const newBookedSeats = Math.max(0, bookedSeats - booking.Tickets);
    
    await prisma.showtimes.update({
      where: { Show_ID: booking.Show_ID },
      data: {
        Booked_Seats: newBookedSeats
      }
    });

    console.log('Seats returned to showtime');

    // Re-enable booking if it was full
    const updatedShowtime = await prisma.showtimes.findUnique({
      where: { Show_ID: booking.Show_ID }
    });

    const updatedBookedSeats = updatedShowtime.Booked_Seats || 0;
    const updatedTotalCapacity = updatedShowtime.Total_Capacity || 0;
    
    if (!updatedShowtime.Booking_Enabled && updatedBookedSeats < updatedTotalCapacity) {
      await prisma.showtimes.update({
        where: { Show_ID: booking.Show_ID },
        data: { Booking_Enabled: true }
      });
      console.log('Showtime re-enabled for bookings');
    }

    // Get movie title safely - check if movies relation exists
    let movieTitle = 'Unknown Movie';
    if (booking.showtimes && booking.showtimes.movies) {
      movieTitle = booking.showtimes.movies.Title;
    } else {
      // Fallback: try to get movie directly
      try {
        const movie = await prisma.movies.findUnique({
          where: { Movie_ID: showtime.Movie_ID }
        });
        movieTitle = movie?.Title || 'Unknown Movie';
      } catch (movieError) {
        console.error('Could not fetch movie:', movieError);
      }
    }

    // Prepare booking details with safe property access
    const bookingDetails = {
      movieTitle: movieTitle,
      theatreName: booking.showtimes?.theaters?.Name || 'Unknown Theatre',
      theatreCity: booking.showtimes?.theaters?.City || 'Unknown City',
      showDate: booking.showtimes?.Show_Date ? 
                new Date(booking.showtimes.Show_Date).toLocaleDateString('en-GB') : 
                'Unknown Date',
      showTime: booking.showtimes?.Start_Time ? 
                new Date(`1970-01-01T${booking.showtimes.Start_Time}`).toLocaleTimeString('en-GB', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                }) : 'Unknown Time',
      format: booking.showtimes?.formats?.Name || 'Standard',
      ticketCount: booking.Tickets,
      totalPrice: booking.Total_Price,
      bookingId: booking.Booking_ID
    };

    console.log('Booking details prepared:', bookingDetails);

    // Send cancellation notification
    try {
      await sendBookingCancellation(booking.accounts, bookingDetails);
      console.log('Cancellation email sent');
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
    }

    res.json({ 
      success: true,
      message: 'Booking cancelled and amount refunded',
      refundedAmount: refundAmount,
      newBalance: newBalance
    });

  } catch (err) {
    console.error('Booking cancellation error:', {
      error: err.message,
      stack: err.stack,
      bookingId: bookingId
    });
    
    res.status(500).json({ 
      error: 'Failed to cancel booking',
      details: err.message
    });
  }
});

module.exports = router;
