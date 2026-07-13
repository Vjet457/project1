const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message,
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const allowedUpdates = [
      'firstName', 'lastName', 'phone', 'dateOfBirth', 'gender',
      'bloodGroup', 'height', 'weight', 'address', 'profilePicture',
      'medicalConditions', 'allergies', 'medications'
    ];

    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message,
    });
  }
});

// @route   PUT /api/users/medical-info
// @desc    Update medical information
// @access  Private
router.put('/medical-info', protect, async (req, res) => {
  try {
    const { bloodGroup, medicalConditions, allergies, medications } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        $set: {
          bloodGroup,
          medicalConditions,
          allergies,
          medications,
        }
      },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Medical information updated successfully',
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating medical information',
      error: error.message,
    });
  }
});

// @route   DELETE /api/users/account
// @desc    Delete user account
// @access  Private
router.delete('/account', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { isActive: false });
    res.json({
      success: true,
      message: 'Account deactivated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deactivating account',
      error: error.message,
    });
  }
});

module.exports = router;
