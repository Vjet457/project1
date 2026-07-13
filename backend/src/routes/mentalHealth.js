const express = require('express');
const router = express.Router();
const MentalHealthRecord = require('../models/MentalHealthRecord');
const { protect } = require('../middleware/auth');

// @route   POST /api/mental-health/record
// @desc    Create a mental health record
// @access  Private
router.post('/record', protect, async (req, res) => {
  try {
    const record = await MentalHealthRecord.create({
      user: req.user.id,
      ...req.body,
    });

    res.status(201).json({
      success: true,
      message: 'Mental health record created successfully',
      data: record,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating mental health record',
      error: error.message,
    });
  }
});

// @route   GET /api/mental-health/records
// @desc    Get all mental health records for user
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

    const records = await MentalHealthRecord.find(query)
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
      message: 'Error fetching mental health records',
      error: error.message,
    });
  }
});

// @route   GET /api/mental-health/record/:id
// @desc    Get a single mental health record
// @access  Private
router.get('/record/:id', protect, async (req, res) => {
  try {
    const record = await MentalHealthRecord.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Mental health record not found',
      });
    }

    res.json({
      success: true,
      data: record,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching mental health record',
      error: error.message,
    });
  }
});

// @route   PUT /api/mental-health/record/:id
// @desc    Update a mental health record
// @access  Private
router.put('/record/:id', protect, async (req, res) => {
  try {
    const record = await MentalHealthRecord.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Mental health record not found',
      });
    }

    res.json({
      success: true,
      message: 'Mental health record updated successfully',
      data: record,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating mental health record',
      error: error.message,
    });
  }
});

// @route   DELETE /api/mental-health/record/:id
// @desc    Delete a mental health record
// @access  Private
router.delete('/record/:id', protect, async (req, res) => {
  try {
    const record = await MentalHealthRecord.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Mental health record not found',
      });
    }

    res.json({
      success: true,
      message: 'Mental health record deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting mental health record',
      error: error.message,
    });
  }
});

// @route   GET /api/mental-health/mood-history
// @desc    Get mood history for charts
// @access  Private
router.get('/mood-history', protect, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const records = await MentalHealthRecord.find({
      user: req.user.id,
      date: { $gte: startDate },
    })
      .select('date mood.overall stressLevel anxietyLevel energyLevel')
      .sort({ date: 1 });

    res.json({
      success: true,
      data: records,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching mood history',
      error: error.message,
    });
  }
});

// @route   GET /api/mental-health/stats
// @desc    Get mental health statistics
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

    const records = await MentalHealthRecord.find({
      user: req.user.id,
      date: { $gte: startDate },
    }).sort({ date: -1 });

    const stats = {
      totalEntries: records.length,
      averages: {
        mood: 0,
        stress: 0,
        anxiety: 0,
        energy: 0,
        motivation: 0,
      },
      moodTrend: records.map(r => ({
        date: r.date,
        mood: r.mood?.overall || 0,
      })),
      topEmotions: {},
      meditationDays: 0,
    };

    if (records.length > 0) {
      records.forEach(record => {
        stats.averages.mood += record.mood?.overall || 0;
        stats.averages.stress += record.stressLevel || 0;
        stats.averages.anxiety += record.anxietyLevel || 0;
        stats.averages.energy += record.energyLevel || 0;
        stats.averages.motivation += record.motivationLevel || 0;

        // Count emotions
        record.mood?.emotions?.forEach(emotion => {
          stats.topEmotions[emotion] = (stats.topEmotions[emotion] || 0) + 1;
        });

        // Count meditation days
        if (record.activities?.meditation?.practiced) {
          stats.meditationDays++;
        }
      });

      Object.keys(stats.averages).forEach(key => {
        stats.averages[key] = Math.round((stats.averages[key] / records.length) * 10) / 10;
      });
    }

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching mental health statistics',
      error: error.message,
    });
  }
});

// @route   GET /api/mental-health/today
// @desc    Get today's mental health entry
// @access  Private
router.get('/today', protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const record = await MentalHealthRecord.findOne({
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
      message: 'Error fetching today\'s mental health data',
      error: error.message,
    });
  }
});

module.exports = router;
