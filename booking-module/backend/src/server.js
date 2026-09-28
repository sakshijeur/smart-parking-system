const express = require('express');
const cors = require('cors');
require('dotenv').config();

const bookingRoutes = require('./routes/bookings');
const parkingRoutes = require('./routes/parking');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', bookingRoutes);
app.use('/api', parkingRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Booking & Allocation service running on http://localhost:${PORT}`);
});
