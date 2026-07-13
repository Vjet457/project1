const express = require('express');
const router = express.Router();
const MedicalRecord = require('../models/MedicalRecord');
const { protect } = require('../middleware/auth');

// @route   POST /api/medical-records
// @desc    Add a new medical record
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const record = await MedicalRecord.create({
      user: req.user.id,
      ...req.body,
    });

    res.status(201).json({
      success: true,
      message: 'Medical record created successfully',
      data: record,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating medical record',
      error: error.message,
    });
  }
});

// @route   GET /api/medical-records
// @desc    Get all medical records for logged in user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const records = await MedicalRecord.find({ user: req.user.id })
      .sort({ date: -1 });

    res.json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching medical records',
      error: error.message,
    });
  }
});

// @route   DELETE /api/medical-records/:id
// @desc    Delete a medical record
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const record = await MedicalRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    // Ensure user owns the record
    if (record.user.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized to delete this record' });
    }

    await record.deleteOne();

    res.json({
      success: true,
      message: 'Record removed',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting medical record',
      error: error.message,
    });
  }
});

module.exports = router;