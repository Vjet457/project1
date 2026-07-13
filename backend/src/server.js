const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/database');
const config = require('./config');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const healthRoutes = require('./routes/health');
const mentalHealthRoutes = require('./routes/mentalHealth');
const symptomRoutes = require('./routes/symptom');
const emergencyRoutes = require('./routes/emergency');
const doctorRoutes = require('./routes/doctor');
const aiRoutes = require('./routes/ai');
const medicalRecordRoutes = require('./routes/medicalRecord');
const healthScoreHistoryRoutes = require('./routes/healthScoreHistory');

// Initialize express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
const allowedOrigins = [config.clientUrl, process.env.RENDER_EXTERNAL_URL].filter(Boolean);
app.use(cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : true,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/mental-health', mentalHealthRoutes);
app.use('/api/symptoms', symptomRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/medical-records', medicalRecordRoutes);
app.use('/api/health-score-history', healthScoreHistoryRoutes);

// Health check route
app.get('/api/health-check', (req, res) => {
  res.json({ status: 'ok', message: 'AarogyaSaathi API is running' });
});

const frontendBuildPath = path.resolve(__dirname, '../../web/build');
const frontendIndexPath = path.join(frontendBuildPath, 'index.html');
const assetsPath = path.resolve(__dirname, '../../assets');
const aiPath = path.resolve(__dirname, '../../ai');

if (config.nodeEnv === 'production') {
  app.use(express.static(frontendBuildPath));
  app.use('/assets', express.static(assetsPath));
  app.use('/ai', express.static(aiPath));
}

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }

  if (config.nodeEnv === 'production' && fs.existsSync(frontendIndexPath)) {
    return res.sendFile(frontendIndexPath);
  }

  return res.status(404).json({
    success: false,
    message: 'Frontend build not available yet. Run the web build step first.',
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`Server running in ${config.nodeEnv} mode on port ${PORT}`);
});

module.exports = app;
