require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();

// Enable CORS with detailed configuration
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://spirit-flow.vercel.app'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-JSON-Response-Size'],
  optionsSuccessStatus: 200
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Backend is running',
    timestamp: new Date().toISOString()
  });
});

// Load auth routes with error handling
try {
  const authRoutes = require('./src/routes/auth');
  app.use('/api/auth', authRoutes);
  console.log('✅ Auth routes loaded successfully');
} catch (error) {
  console.error('❌ Failed to load auth routes:', error.message);
  console.error(error.stack);
}

// Load products routes with error handling
try {
  const productsRoutes = require('./src/routes/products');
  app.use('/api/products', productsRoutes);
  console.log('✅ Products routes loaded successfully');
} catch (error) {
  console.error('❌ Failed to load products routes:', error.message);
  console.error(error.stack);
}

// Load stock routes with error handling
try {
  const stockRoutes = require('./src/routes/stock');
  app.use('/api/stock', stockRoutes);
  console.log('✅ Stock routes loaded successfully');
} catch (error) {
  console.error('❌ Failed to load stock routes:', error.message);
  console.error(error.stack);
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
    path: req.path
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.message);
  res.status(500).json({
    status: 'error',
    message: err.message || 'Internal server error'
  });
});

// Start server
const PORT = process.env.PORT || 3001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS enabled for multiple origins`);
}).on('error', (error) => {
  console.error('❌ Server startup error:', error);
  process.exit(1);
});