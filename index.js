const express = require("express");
const cors = require("cors");

const app = express();
app.use(express.json());

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Import routes
const accountsRouter = require("./routes/accounts");
const moviesRouter = require("./routes/movies");
const showtimesRouter = require("./routes/showtimes");
const bookingsRouter = require("./routes/bookings");
const tmdbSyncRouter = require('./routes/tmdbsync');
const customShowtimesRouter = require('./routes/customshowtimes');
const adminMoviesRouter = require('./routes/admin/movies');
const adminBookingsRouter = require('./routes/admin/bookings');
const adminShowtimesRoutes = require('./routes/admin/showtimes');
const adminAccountsRoutes = require('./routes/admin/accounts');
const adminDashboardRouter = require('./routes/admin/dashboard');
const adminTmdbRouter = require('./routes/admin/tmdb');
const passwordResetRouter = require('./routes/passwordreset');
const makeWebhookRouter = require('./routes/make-webhook');
const notificationsRouter = require('./routes/notifications');

app.use('/api/notifications', notificationsRouter);
app.use('/make-webhook', makeWebhookRouter);
app.use('/passwordreset', passwordResetRouter);
app.use('/admin/tmdb', adminTmdbRouter);
app.use('/admin/dashboard', adminDashboardRouter);
app.use('/admin/showtimes', adminShowtimesRoutes);
app.use('/admin/accounts', adminAccountsRoutes);
app.use('/admin/bookings', adminBookingsRouter);
app.use('/customshowtimes', customShowtimesRouter);
app.use('/tmdb-sync', tmdbSyncRouter);
app.use("/accounts", accountsRouter);
app.use("/movies", moviesRouter);
app.use("/showtimes", showtimesRouter);
app.use("/bookings", bookingsRouter);
app.use('/admin/movies', adminMoviesRouter);


const PORT = process.env.PORT || 2112;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);  
});