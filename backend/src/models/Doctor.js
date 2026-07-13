const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
  },
  specialization: {
    type: String,
    required: true,
    enum: [
      'general_physician',
      'cardiologist',
      'dermatologist',
      'orthopedic',
      'pediatrician',
      'gynecologist',
      'psychiatrist',
      'psychologist',
      'neurologist',
      'ophthalmologist',
      'ent_specialist',
      'dentist',
      'pulmonologist',
      'gastroenterologist',
      'endocrinologist',
      'urologist',
      'oncologist',
      'nephrologist',
      'rheumatologist',
      'allergist',
      'other',
    ],
  },
  qualifications: [{
    type: String,
  }],
  experience: {
    type: Number, // years
    min: 0,
  },
  hospital: {
    name: String,
    address: String,
    city: String,
    state: String,
    zipCode: String,
  },
  clinicAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'India' },
  },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: [Number], // [longitude, latitude]
  },
  consultationFee: {
    inPerson: Number,
    online: Number,
  },
  availability: {
    days: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    }],
    timings: {
      morning: { start: String, end: String },
      evening: { start: String, end: String },
    },
    onlineConsultation: { type: Boolean, default: false },
  },
  ratings: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 },
  },
  reviews: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    date: { type: Date, default: Date.now },
  }],
  languages: [{
    type: String,
  }],
  profilePicture: String,
  isVerified: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Index for geospatial queries
doctorSchema.index({ location: '2dsphere' });
doctorSchema.index({ specialization: 1, 'ratings.average': -1 });

module.exports = mongoose.model('Doctor', doctorSchema);
