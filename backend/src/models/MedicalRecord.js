const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  doctor: {
    type: String,
    required: [true, 'Doctor name is required'],
    trim: true,
  },
  type: {
    type: String,
    enum: ['Lab Report', 'Imaging', 'Prescription', 'Checkup', 'Other'],
    default: 'Other',
  },
  icon: {
    type: String,
    default: 'file-document-outline',
  },
  fileUrl: {
    type: String,
    // useful for downloading
  },
  notes: {
    type: String,
    trim: true,
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);