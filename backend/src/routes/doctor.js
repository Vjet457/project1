const express = require('express');
const router = express.Router();
const Doctor = require('../models/Doctor');
const { protect } = require('../middleware/auth');

// @route   GET /api/doctors
// @desc    Get all doctors with filters
// @access  Public
router.get('/', async (req, res) => {
  try {
    const {
      specialization,
      city,
      minRating,
      onlineConsultation,
      lat,
      lng,
      radius = 10, // km
      limit = 20,
      page = 1,
    } = req.query;

    const query = { isActive: true };

    if (specialization) {
      query.specialization = specialization;
    }

    if (city) {
      query['clinicAddress.city'] = new RegExp(city, 'i');
    }

    if (minRating) {
      query['ratings.average'] = { $gte: parseFloat(minRating) };
    }

    if (onlineConsultation === 'true') {
      query['availability.onlineConsultation'] = true;
    }

    // Geospatial query
    if (lat && lng) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: parseInt(radius) * 1000, // Convert km to meters
        },
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const doctors = await Doctor.find(query)
      .select('-reviews')
      .sort({ 'ratings.average': -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Doctor.countDocuments(query);

    res.json({
      success: true,
      count: doctors.length,
      total,
      pages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: doctors,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching doctors',
      error: error.message,
    });
  }
});

// @route   GET /api/doctors/specializations
// @desc    Get list of specializations
// @access  Public
router.get('/specializations', (req, res) => {
  const specializations = [
    { value: 'general_physician', label: 'General Physician' },
    { value: 'cardiologist', label: 'Cardiologist' },
    { value: 'dermatologist', label: 'Dermatologist' },
    { value: 'orthopedic', label: 'Orthopedic' },
    { value: 'pediatrician', label: 'Pediatrician' },
    { value: 'gynecologist', label: 'Gynecologist' },
    { value: 'psychiatrist', label: 'Psychiatrist' },
    { value: 'psychologist', label: 'Psychologist' },
    { value: 'neurologist', label: 'Neurologist' },
    { value: 'ophthalmologist', label: 'Ophthalmologist' },
    { value: 'ent_specialist', label: 'ENT Specialist' },
    { value: 'dentist', label: 'Dentist' },
    { value: 'pulmonologist', label: 'Pulmonologist' },
    { value: 'gastroenterologist', label: 'Gastroenterologist' },
    { value: 'endocrinologist', label: 'Endocrinologist' },
    { value: 'urologist', label: 'Urologist' },
    { value: 'oncologist', label: 'Oncologist' },
    { value: 'nephrologist', label: 'Nephrologist' },
    { value: 'rheumatologist', label: 'Rheumatologist' },
    { value: 'allergist', label: 'Allergist' },
  ];

  res.json({
    success: true,
    data: specializations,
  });
});

// @route   GET /api/doctors/:id
// @desc    Get doctor by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    res.json({
      success: true,
      data: doctor,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching doctor',
      error: error.message,
    });
  }
});

// @route   POST /api/doctors/:id/review
// @desc    Add review for a doctor
// @access  Private
router.post('/:id/review', protect, async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    // Check if user already reviewed
    const existingReview = doctor.reviews.find(
      r => r.user.toString() === req.user.id
    );

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this doctor',
      });
    }

    // Add review
    doctor.reviews.push({
      user: req.user.id,
      rating,
      comment,
    });

    // Update average rating
    const totalRatings = doctor.reviews.reduce((sum, r) => sum + r.rating, 0);
    doctor.ratings.average = Math.round((totalRatings / doctor.reviews.length) * 10) / 10;
    doctor.ratings.count = doctor.reviews.length;

    await doctor.save();

    res.status(201).json({
      success: true,
      message: 'Review added successfully',
      data: doctor,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding review',
      error: error.message,
    });
  }
});

// @route   GET /api/doctors/nearby
// @desc    Get nearby doctors
// @access  Public
router.get('/nearby/location', async (req, res) => {
  try {
    const { lat, lng, radius = 5, specialization } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
      });
    }

    const query = {
      isActive: true,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: parseInt(radius) * 1000,
        },
      },
    };

    if (specialization) {
      query.specialization = specialization;
    }

    const doctors = await Doctor.find(query)
      .select('name specialization clinicAddress ratings phone availability.onlineConsultation')
      .limit(20);

    res.json({
      success: true,
      count: doctors.length,
      data: doctors,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching nearby doctors',
      error: error.message,
    });
  }
});

module.exports = router;
