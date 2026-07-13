const mongoose = require('mongoose');

const emergencyContactSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  
  // Emergency Contacts List
  contacts: [{
    name: {
      type: String,
      required: true,
    },
    relationship: {
      type: String,
      enum: ['spouse', 'parent', 'sibling', 'child', 'friend', 'doctor', 'neighbor', 'colleague', 'other'],
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    alternatePhone: String,
    email: String,
    address: String,
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
      call: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      whatsapp: { type: Boolean, default: false },
    },
    notes: String,
  }],
  
  // Medical Information for Emergency Responders
  medicalInfo: {
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    allergies: [{
      allergen: String,
      severity: { type: String, enum: ['mild', 'moderate', 'severe', 'life_threatening'] },
      reaction: String,
    }],
    medications: [{
      name: String,
      dosage: String,
      frequency: String,
      purpose: String,
      prescribedBy: String,
    }],
    medicalConditions: [{
      condition: String,
      diagnosedDate: Date,
      status: { type: String, enum: ['active', 'managed', 'resolved'] },
      notes: String,
    }],
    surgeries: [{
      procedure: String,
      date: Date,
      hospital: String,
    }],
    implants: [{
      type: { type: String }, // pacemaker, joint replacement, etc.
      implantDate: Date,
      notes: String,
    }],
    organDonor: { type: Boolean, default: false },
    dnr: { type: Boolean, default: false }, // Do Not Resuscitate
  },
  
  // Insurance Information
  insurance: {
    provider: String,
    policyNumber: String,
    groupNumber: String,
    validUntil: Date,
    contactNumber: String,
    coverageDetails: String,
  },
  
  // Primary Physician
  primaryPhysician: {
    name: String,
    specialization: String,
    hospital: String,
    phone: String,
    email: String,
    address: String,
  },
  
  // Preferred Hospital
  preferredHospital: {
    name: String,
    address: String,
    phone: String,
    emergencyNumber: String,
    location: {
      type: { type: String, enum: ['Point'] },
      coordinates: [Number], // [longitude, latitude]
    },
  },
  
  // Special Instructions
  specialInstructions: {
    medicalAlert: String, // e.g., "Diabetic - may need glucose"
    accessInstructions: String, // e.g., "Key under mat"
    languagePreference: String,
    culturalConsiderations: String,
    otherNotes: String,
  },
  
  // Home Address (for emergency services)
  homeAddress: {
    street: String,
    apartment: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'India' },
    location: {
      type: { type: String, enum: ['Point'] },
      coordinates: [Number],
    },
    accessCode: String, // Gate/building code
  },
  
  // Verification
  isVerified: {
    type: Boolean,
    default: false,
  },
  lastVerified: Date,
  
  // Last Emergency
  lastEmergency: {
    date: Date,
    type: String,
    outcome: String,
  },
}, {
  timestamps: true,
});

// Sparse index for geospatial (only if coordinates exist)
emergencyContactSchema.index({ 'preferredHospital.location': '2dsphere' }, { sparse: true });
emergencyContactSchema.index({ 'homeAddress.location': '2dsphere' }, { sparse: true });

module.exports = mongoose.model('EmergencyContact', emergencyContactSchema);
