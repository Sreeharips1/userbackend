const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const morgan = require('morgan');
const authRoutes = require('./routes/authRoutes');
const trainerRoutes = require('./routes/trainerRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');

dotenv.config();
connectDB();

const app = express();

// Middlewares
app.use(express.json());
app.use(morgan('dev'));

// Enhanced CORS configuration
const allowedOrigins = [
  'https://userfrontend-psi.vercel.app',
  'http://localhost:3000' // For local development
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Normalize origin URL
    const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
    
    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }
    
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', trainerRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoints
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'OK',
    message: 'FlexZone Gym API Service',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Error handling for undefined routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Server configuration
const PORT = process.env.PORT || 5000;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

app.listen(PORT, HOST, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`Listening on http://${HOST}:${PORT}`);
});
