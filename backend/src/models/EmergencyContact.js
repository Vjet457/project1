const mongoose = require('mongoose');

const emergencyContactSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  contacts: [{
    name: {
      type: String,
      required: true,
    },
    relationship: {
      type: String,
      enum: ['spouse', 'parent', 'sibling', 'child', 'friend', 'doctor', 'other'],
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    email: String,
    isPrimary: {
      type: Boolean,
      default: false,
    },
    notifyOnEmergency: {
      type: Boolean,
      default: true,
    },
    notificationPreference: {
      sms: { type: Boolean, default: true },
      call: { type: Boolean, default: false },
      whatsapp: { type: Boolean, default: false },
    },
  }],
  // Medical Info for Emergency
  medicalInfo: {
    bloodGroup: String,
    allergies: [String],
    medications: [{
      name: String,
      dosage: String,
    }],
    medicalConditions: [String],
    insuranceProvider: String,
    insurancePolicyNumber: String,
    primaryPhysician: {
      name: String,
      phone: String,
      hospital: String,
    },
  },
  // Preferred Hospital
  preferredHospital: {
    name: String,
    address: String,
    phone: String,
    location: {
      type: { type: String, enum: ['Point'] },
      coordinates: [Number], // [longitude, latitude]
    },
  },
  // Emergency History
  emergencyHistory: [{
    date: { type: Date, default: Date.now },
    type: {
      type: String,
      enum: ['sos_triggered', 'ambulance_called', 'hospital_visit', 'other'],
    },
    description: String,
    location: {
      type: { type: String, enum: ['Point'] },
      coordinates: [Number],
    },
    resolved: { type: Boolean, default: false },
  }],
}, {
  timestamps: true,
});

// Index for geospatial queries (sparse to allow documents without location)
emergencyContactSchema.index({ 'preferredHospital.location': '2dsphere' }, { sparse: true });

// Defensive cleanup: older docs may contain { type: 'Point' } without coordinates,
// which breaks 2dsphere index extraction on any save operation.
emergencyContactSchema.pre('save', function sanitizeInvalidGeo(next) {
  const location = this?.preferredHospital?.location;

  if (!location) {
    return next();
  }

  const coordinates = location.coordinates;
  const hasValidCoordinates =
    Array.isArray(coordinates) &&
    coordinates.length === 2 &&
    coordinates.every((value) => typeof value === 'number' && Number.isFinite(value));

  if (!hasValidCoordinates) {
    this.set('preferredHospital.location', undefined);
    this.markModified('preferredHospital');
  }

  return next();
});

module.exports = mongoose.model('EmergencyContact', emergencyContactSchema);
