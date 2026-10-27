const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://savindudilanka9793_db_user:wYYrPg44XVpA4dlj@cluster0.yirgtnn.mongodb.net/three_hour_tracking?retryWrites=true&w=majority';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB Connection Cache (works for both standalone server and Vercel serverless)
let cachedDb = null;
async function connectToDatabase() {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }
  cachedDb = await mongoose.connect(MONGODB_URI, {
    bufferCommands: false
  });
  console.log('✅ Connected to MongoDB Atlas successfully.');
  return cachedDb;
}

// Ensure DB connected on each API request
app.use('/api', async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (err) {
    console.error('Database connection error:', err.message);
    res.status(500).json({ error: 'Database connection failed: ' + err.message });
  }
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
const trackingRoutes = require('./routes/trackingRoutes');
app.use('/api', trackingRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    dbConnected: mongoose.connection.readyState === 1
  });
});

// Fallback to index.html
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start local server if run directly
if (require.main === module || !process.env.VERCEL) {
  connectToDatabase()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`🚀 3-Hour Review Server running on http://localhost:${PORT}`);
      });
    })
    .catch(err => {
      console.error('❌ Failed to connect to MongoDB:', err.message);
    });
}

// Export for Vercel Serverless
module.exports = app;
