

// Booking confirmation template
const bookingConfirmationTemplate = (userName, bookingDetails) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 30px; border-radius: 10px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #ff6b00; margin: 0;">MovieMate</h1>
    <p style="color: #666; margin-top: 5px;">Your Cinema Booking Platform</p>
  </div>
  
  <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <h2 style="color: #333; margin-top: 0;">Booking Confirmed! 🎉</h2>
    
    <p>Hi ${userName},</p>
    <p>Your movie booking has been confirmed. Here are your ticket details:</p>
    
    <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 25px 0; border-left: 4px solid #ff6b00;">
      <h3 style="color: #333; margin-top: 0;">${bookingDetails.movieTitle}</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666;">Theatre:</td>
          <td style="padding: 8px 0; font-weight: bold;">${bookingDetails.theatreName}, ${bookingDetails.theatreCity}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Date & Time:</td>
          <td style="padding: 8px 0; font-weight: bold;">${bookingDetails.showDate} at ${bookingDetails.showTime}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Format:</td>
          <td style="padding: 8px 0; font-weight: bold;">${bookingDetails.format}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Tickets:</td>
          <td style="padding: 8px 0; font-weight: bold;">${bookingDetails.ticketCount} ticket(s)</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Total Paid:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #28a745;">€${bookingDetails.totalPrice}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Booking Reference:</td>
          <td style="padding: 8px 0; font-weight: bold;">#${bookingDetails.bookingId}</td>
        </tr>
      </table>
    </div>
    
    <div style="background: #e8f4ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0; color: #0066cc;">
        <strong>📱 Present this email at the theatre</strong><br>
        Your tickets will be available at the counter.
      </p>
    </div>
    
    <p style="color: #666; font-size: 14px;">
      Need to make changes? You can manage your booking in your account.
    </p>
    
    <div style="text-align: center; margin-top: 30px;">
      <a href="http://localhost:5173/bookings" 
         style="background: #ff6b00; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
        View My Bookings
      </a>
    </div>
  </div>
  
  <div style="text-align: center; margin-top: 30px; color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px;">
    <p>MovieMate Cinema Booking System<br>
    This is an automated email, please do not reply.</p>
  </div>
</div>
`;

// Booking cancellation template
const bookingCancellationTemplate = (userName, bookingDetails) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 30px; border-radius: 10px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #ff6b00; margin: 0;">MovieMate</h1>
    <p style="color: #666; margin-top: 5px;">Your Cinema Booking Platform</p>
  </div>
  
  <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <h2 style="color: #333; margin-top: 0;">Booking Cancelled ✅</h2>
    
    <p>Hi ${userName},</p>
    <p>Your booking has been successfully cancelled. Here are the details:</p>
    
    <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 25px 0; border-left: 4px solid #dc3545;">
      <h3 style="color: #333; margin-top: 0;">${bookingDetails.movieTitle}</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666;">Theatre:</td>
          <td style="padding: 8px 0; font-weight: bold;">${bookingDetails.theatreName}, ${bookingDetails.theatreCity}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Date & Time:</td>
          <td style="padding: 8px 0; font-weight: bold;">${bookingDetails.showDate} at ${bookingDetails.showTime}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Tickets:</td>
          <td style="padding: 8px 0; font-weight: bold;">${bookingDetails.ticketCount} ticket(s)</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Amount Refunded:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #28a745;">€${bookingDetails.totalPrice}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Booking Reference:</td>
          <td style="padding: 8px 0; font-weight: bold;">#${bookingDetails.bookingId}</td>
        </tr>
      </table>
    </div>
    
    <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0; color: #666;">
        <strong>Refund Information:</strong><br>
        €${bookingDetails.totalPrice} has been added back to your MovieMate wallet balance.
        You can use this for future bookings.
      </p>
    </div>
    
    <p style="color: #666; font-size: 14px;">
      The refunded amount is now available in your account balance.
    </p>
    
    <div style="text-align: center; margin-top: 30px;">
      <a href="http://localhost:5173" 
         style="background: #ff6b00; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
        Browse Movies
      </a>
    </div>
  </div>
  
  <div style="text-align: center; margin-top: 30px; color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px;">
    <p>MovieMate Cinema Booking System<br>
    This is an automated email, please do not reply.</p>
  </div>
</div>
`;

// Wallet top-up template
const walletTopupTemplate = (userName, amount, newBalance) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 30px; border-radius: 10px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #ff6b00; margin: 0;">MovieMate</h1>
    <p style="color: #666; margin-top: 5px;">Your Cinema Booking Platform</p>
  </div>
  
  <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <h2 style="color: #333; margin-top: 0;">Wallet Topped Up!</h2>
    
    <p>Hi ${userName},</p>
    <p>Your MovieMate wallet has been successfully topped up.</p>
    
    <div style="background: #e8f5e8; padding: 25px; border-radius: 6px; margin: 25px 0; text-align: center;">
      <div style="font-size: 48px; color: #28a745; margin-bottom: 10px;">€${amount}</div>
      <p style="color: #666; margin: 0;">Added to your wallet</p>
    </div>
    
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr>
        <td style="padding: 10px 0; color: #666;">New Balance:</td>
        <td style="padding: 10px 0; font-weight: bold; color: #28a745; text-align: right;">€${newBalance}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; color: #666;">Transaction Date:</td>
        <td style="padding: 10px 0; text-align: right;">${new Date().toLocaleDateString('en-GB')}</td>
      </tr>
    </table>
    
    <p style="color: #666; font-size: 14px;">
      You can now use your balance to book movie tickets instantly!
    </p>
    
    <div style="text-align: center; margin-top: 30px;">
      <a href="http://localhost:5173" 
         style="background: #ff6b00; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
        Book Movies Now
      </a>
    </div>
  </div>
  
  <div style="text-align: center; margin-top: 30px; color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px;">
    <p>MovieMate Cinema Booking System<br>
    This is an automated email, please do not reply.</p>
  </div>
</div>
`;

module.exports = {
  bookingConfirmationTemplate,
  bookingCancellationTemplate,
  walletTopupTemplate
};