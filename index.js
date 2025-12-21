const express = require("express");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// Import routes
const accountsRouter = require("./routes/accounts");
const moviesRouter = require("./routes/movies");
const showtimesRouter = require("./routes/showtimes");
const bookingsRouter = require("./routes/bookings");

app.use("/accounts", accountsRouter);
app.use("/movies", moviesRouter);
app.use("/showtimes", showtimesRouter);
app.use("/bookings", bookingsRouter);

const PORT = process.env.PORT || 2112;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
