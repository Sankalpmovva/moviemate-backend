const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

// Notification helper function
const createNotification = async (userId, purpose, message) => {
  try {
    await prisma.notifications.create({
      data: {
        User_ID: userId,
        Purpose: purpose,
        Message: message,
        Method: 'in-app',
        Sent_At: new Date()
      }
    });
    console.log("Notification created for user " + userId + ": " + purpose);
    return true;
  } catch (error) {
    console.error('Notification error:', error);
    return false;
  }
};

// Booking confirmation notification
const sendBookingConfirmation = async (user, bookingDetails) => {
  const message = "Your booking has been confirmed! \n" +
    "Movie: " + bookingDetails.movieTitle + "\n" +
    "Theatre: " + bookingDetails.theatreName + ", " + bookingDetails.theatreCity + "\n" +
    "Date: " + bookingDetails.showDate + " at " + bookingDetails.showTime + "\n" +
    "Format: " + bookingDetails.format + "\n" +
    "Tickets: " + bookingDetails.ticketCount + "\n" +
    "Total: €" + bookingDetails.totalPrice.toFixed(2) + "\n" +
    "Booking ID: " + bookingDetails.bookingId;

  return await createNotification(user.Account_ID, 'booking_confirmation', message);
};

// Booking cancellation notification
const sendBookingCancellation = async (user, bookingDetails) => {
  const message = "Your booking has been cancelled and refunded.\n" +
    "Movie: " + bookingDetails.movieTitle + "\n" +
    "Theatre: " + bookingDetails.theatreName + ", " + bookingDetails.theatreCity + "\n" +
    "Date: " + bookingDetails.showDate + " at " + bookingDetails.showTime + "\n" +
    "Refunded: €" + bookingDetails.totalPrice.toFixed(2) + "\n" +
    "Booking ID: " + bookingDetails.bookingId;

  return await createNotification(user.Account_ID, 'booking_cancellation', message);
};

// Wallet top-up notification
const sendWalletTopup = async (user, amount, newBalance) => {
  const message = "Your wallet has been topped up successfully!\n" +
    "Amount Added: €" + amount.toFixed(2) + "\n" +
    "New Balance: €" + newBalance.toFixed(2);

  return await createNotification(user.Account_ID, 'wallet_topup', message);
};

module.exports = { 
  createNotification,
  sendBookingConfirmation, 
  sendBookingCancellation, 
  sendWalletTopup 
};