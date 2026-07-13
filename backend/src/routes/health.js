const express = require('express');
const router = express.Router();
const HealthRecord = require('../models/HealthRecord');
const { protect } = require('../middleware/auth');

// @route   POST /api/health/record
// @desc    Create a health record
// @access  Private
router.post('/record', protect, async (req, res) => {
  try {
    const record = await HealthRecord.create({
      user: req.user.id,
      ...req.body,
    });

    res.status(201).json({
      success: true,
      message: 'Health record created successfully',
      data: record,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating health record',
      error: error.message,
    });
  }
});

// @route   GET /api/health/records
// @desc    Get all health records for user
// @access  Private
router.get('/records', protect, async (req, res) => {
  try {
    const { startDate, endDate, limit = 30 } = req.query;
    
    const query = { user: req.user.id };
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const records = await HealthRecord.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching health records',
      error: error.message,
    });
  }
});

// @route   GET /api/health/record/:id
// @desc    Get a single health record
// @access  Private
router.get('/record/:id', protect, async (req, res) => {
  try {
    const record = await HealthRecord.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Health record not found',
      });
    }

    res.json({
      success: true,
      data: record,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching health record',
      error: error.message,
    });
  }
});

// @route   PUT /api/health/record/:id
// @desc    Update a health record
// @access  Private
router.put('/record/:id', protect, async (req, res) => {
  try {
    const record = await HealthRecord.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Health record not found',
      });
    }

    res.json({
      success: true,
      message: 'Health record updated successfully',
      data: record,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating health record',
      error: error.message,
    });
  }
});

// @route   DELETE /api/health/record/:id
// @desc    Delete a health record
// @access  Private
router.delete('/record/:id', protect, async (req, res) => {
  try {
    const record = await HealthRecord.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Health record not found',
      });
    }

    res.json({
      success: true,
      message: 'Health record deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting health record',
      error: error.message,
    });
  }
});

// @route   GET /api/health/stats
// @desc    Get health statistics summary
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    let startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    const records = await HealthRecord.find({
      user: req.user.id,
      date: { $gte: startDate },
    }).sort({ date: -1 });

    // Calculate averages
    const stats = {
      totalRecords: records.length,
      averages: {
        heartRate: 0,
        steps: 0,
        sleepHours: 0,
        caloriesBurned: 0,
        waterIntake: 0,
      },
      latestVitals: records[0]?.vitals || null,
      healthScoreTrend: records.map(r => ({
        date: r.date,
        score: r.healthScore?.overall || 0,
      })),
    };

    if (records.length > 0) {
      records.forEach(record => {
        stats.averages.heartRate += record.vitals?.heartRate || 0;
        stats.averages.steps += record.activity?.steps || 0;
        stats.averages.sleepHours += record.sleep?.duration || 0;
        stats.averages.caloriesBurned += record.activity?.caloriesBurned || 0;
        stats.averages.waterIntake += record.nutrition?.waterIntake || 0;
      });

      Object.keys(stats.averages).forEach(key => {
        stats.averages[key] = Math.round(stats.averages[key] / records.length);
      });
    }

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching health statistics',
      error: error.message,
    });
  }
});

// @route   GET /api/health/today
// @desc    Get today's health data
// @access  Private
router.get('/today', protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const record = await HealthRecord.findOne({
      user: req.user.id,
      date: { $gte: today },
    }).sort({ date: -1 });

    res.json({
      success: true,
      data: record || null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching today\'s health data',
      error: error.message,
    });
  }
});

module.exports = router;
