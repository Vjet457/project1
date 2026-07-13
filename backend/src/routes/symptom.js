const express = require('express');
const router = express.Router();
const SymptomCheck = require('../models/SymptomCheck');
const { protect } = require('../middleware/auth');

// @route   POST /api/symptoms/check
// @desc    Create a symptom check
// @access  Private
router.post('/check', protect, async (req, res) => {
  try {
    const symptomCheck = await SymptomCheck.create({
      user: req.user.id,
      ...req.body,
    });

    res.status(201).json({
      success: true,
      message: 'Symptom check created successfully',
      data: symptomCheck,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating symptom check',
      error: error.message,
    });
  }
});

// @route   GET /api/symptoms/history
// @desc    Get symptom check history
// @access  Private
router.get('/history', protect, async (req, res) => {
  try {
    const { status, limit = 20 } = req.query;
    
    const query = { user: req.user.id };
    if (status) query.status = status;

    const checks = await SymptomCheck.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: checks.length,
      data: checks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching symptom history',
      error: error.message,
    });
  }
});

// @route   GET /api/symptoms/check/:id
// @desc    Get a single symptom check
// @access  Private
router.get('/check/:id', protect, async (req, res) => {
  try {
    const check = await SymptomCheck.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!check) {
      return res.status(404).json({
        success: false,
        message: 'Symptom check not found',
      });
    }

    res.json({
      success: true,
      data: check,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching symptom check',
      error: error.message,
    });
  }
});

// @route   PUT /api/symptoms/check/:id
// @desc    Update a symptom check (status, follow-up)
// @access  Private
router.put('/check/:id', protect, async (req, res) => {
  try {
    const check = await SymptomCheck.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!check) {
      return res.status(404).json({
        success: false,
        message: 'Symptom check not found',
      });
    }

    res.json({
      success: true,
      message: 'Symptom check updated successfully',
      data: check,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating symptom check',
      error: error.message,
    });
  }
});

// @route   PUT /api/symptoms/check/:id/resolve
// @desc    Mark symptom as resolved
// @access  Private
router.put('/check/:id/resolve', protect, async (req, res) => {
  try {
    const { diagnosis, treatment, notes } = req.body;

    const check = await SymptomCheck.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      {
        $set: {
          status: 'resolved',
          resolvedDate: new Date(),
          'followUp.diagnosis': diagnosis,
          'followUp.treatment': treatment,
          'followUp.doctorVisited': true,
          notes,
        }
      },
      { new: true }
    );

    if (!check) {
      return res.status(404).json({
        success: false,
        message: 'Symptom check not found',
      });
    }

    res.json({
      success: true,
      message: 'Symptom marked as resolved',
      data: check,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error resolving symptom',
      error: error.message,
    });
  }
});

// @route   DELETE /api/symptoms/check/:id
// @desc    Delete a symptom check
// @access  Private
router.delete('/check/:id', protect, async (req, res) => {
  try {
    const check = await SymptomCheck.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!check) {
      return res.status(404).json({
        success: false,
        message: 'Symptom check not found',
      });
    }

    res.json({
      success: true,
      message: 'Symptom check deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting symptom check',
      error: error.message,
    });
  }
});

// @route   GET /api/symptoms/active
// @desc    Get active symptom checks
// @access  Private
router.get('/active', protect, async (req, res) => {
  try {
    const checks = await SymptomCheck.find({
      user: req.user.id,
      status: { $in: ['active', 'ongoing', 'worsened'] },
    }).sort({ date: -1 });

    res.json({
      success: true,
      count: checks.length,
      data: checks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching active symptoms',
      error: error.message,
    });
  }
});

module.exports = router;
