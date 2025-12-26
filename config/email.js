const nodemailer = require('nodemailer');


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Send email helper function
const sendEmail = async (to, subject, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"MovieMate" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });
    console.log('Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Email error:', error);
    throw error;
  }
};

// Send booking confirmation email
const sendBookingConfirmation = async (user, bookingDetails) => {
  const subject = `Booking Confirmed: ${bookingDetails.movieTitle}`;
  const html = bookingConfirmationTemplate(
    user.First_Name || 'MovieMate User',
    bookingDetails
  );
  
  return await sendEmail(user.Email, subject, html);
};

// Send booking cancellation email
const sendBookingCancellation = async (user, bookingDetails) => {
  const subject = `Booking Cancelled: ${bookingDetails.movieTitle}`;
  const html = bookingCancellationTemplate(
    user.First_Name || 'MovieMate User',
    bookingDetails
  );
  
  return await sendEmail(user.Email, subject, html);
};

// Send wallet top-up email
const sendWalletTopup = async (user, amount, newBalance) => {
  const subject = `Wallet Topped Up: €${amount}`;
  const html = walletTopupTemplate(
    user.First_Name || 'MovieMate User',
    amount,
    newBalance
  );
  
  return await sendEmail(user.Email, subject, html);
};


module.exports = { sendEmail, sendBookingConfirmation, sendBookingCancellation, sendWalletTopup };