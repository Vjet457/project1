const mongoose = require('mongoose');
const Doctor = require('../models/Doctor');
require('dotenv').config({ path: '../../.env' });

const doctors = [
  {
    name: 'Dr. Rajesh Sharma',
    email: 'rajesh.sharma@hospital.com',
    phone: '+91 98765 43210',
    specialization: 'general_physician',
    qualifications: ['MBBS', 'MD'],
    experience: 15,
    hospital: {
      name: 'City General Hospital',
      address: 'MG Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      zipCode: '400001',
    },
    clinicAddress: {
      street: '123 Health Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      zipCode: '400001',
      country: 'India',
    },
    location: {
      type: 'Point',
      coordinates: [72.8777, 19.0760], // Mumbai
    },
    consultationFee: {
      inPerson: 500,
      online: 400,
    },
    availability: {
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      timings: {
        morning: { start: '09:00', end: '13:00' },
        evening: { start: '17:00', end: '20:00' },
      },
      onlineConsultation: true,
    },
    ratings: { average: 4.5, count: 120 },
    languages: ['English', 'Hindi', 'Marathi'],
    isVerified: true,
    isActive: true,
  },
  {
    name: 'Dr. Priya Patel',
    email: 'priya.patel@hospital.com',
    phone: '+91 98765 43211',
    specialization: 'cardiologist',
    qualifications: ['MBBS', 'MD', 'DM Cardiology'],
    experience: 12,
    hospital: {
      name: 'Heart Care Center',
      address: 'Sector 5',
      city: 'Delhi',
      state: 'Delhi',
      zipCode: '110001',
    },
    clinicAddress: {
      street: '456 Cardio Lane',
      city: 'Delhi',
      state: 'Delhi',
      zipCode: '110001',
      country: 'India',
    },
    location: {
      type: 'Point',
      coordinates: [77.2090, 28.6139], // Delhi
    },
    consultationFee: {
      inPerson: 1000,
      online: 800,
    },
    availability: {
      days: ['monday', 'wednesday', 'friday', 'saturday'],
      timings: {
        morning: { start: '10:00', end: '14:00' },
        evening: { start: '16:00', end: '19:00' },
      },
      onlineConsultation: true,
    },
    ratings: { average: 4.8, count: 85 },
    languages: ['English', 'Hindi', 'Gujarati'],
    isVerified: true,
    isActive: true,
  },
  {
    name: 'Dr. Amit Kumar',
    email: 'amit.kumar@hospital.com',
    phone: '+91 98765 43212',
    specialization: 'psychiatrist',
    qualifications: ['MBBS', 'MD Psychiatry'],
    experience: 10,
    hospital: {
      name: 'Mind Wellness Center',
      address: 'Koramangala',
      city: 'Bangalore',
      state: 'Karnataka',
      zipCode: '560034',
    },
    clinicAddress: {
      street: '789 Mental Health Road',
      city: 'Bangalore',
      state: 'Karnataka',
      zipCode: '560034',
      country: 'India',
    },
    location: {
      type: 'Point',
      coordinates: [77.5946, 12.9716], // Bangalore
    },
    consultationFee: {
      inPerson: 1200,
      online: 1000,
    },
    availability: {
      days: ['tuesday', 'thursday', 'saturday'],
      timings: {
        morning: { start: '09:00', end: '12:00' },
        evening: { start: '15:00', end: '18:00' },
      },
      onlineConsultation: true,
    },
    ratings: { average: 4.7, count: 65 },
    languages: ['English', 'Hindi', 'Kannada'],
    isVerified: true,
    isActive: true,
  },
  {
    name: 'Dr. Sneha Reddy',
    email: 'sneha.reddy@hospital.com',
    phone: '+91 98765 43213',
    specialization: 'dermatologist',
    qualifications: ['MBBS', 'MD Dermatology'],
    experience: 8,
    hospital: {
      name: 'Skin Care Clinic',
      address: 'Jubilee Hills',
      city: 'Hyderabad',
      state: 'Telangana',
      zipCode: '500033',
    },
    clinicAddress: {
      street: '321 Skin Health Avenue',
      city: 'Hyderabad',
      state: 'Telangana',
      zipCode: '500033',
      country: 'India',
    },
    location: {
      type: 'Point',
      coordinates: [78.4867, 17.3850], // Hyderabad
    },
    consultationFee: {
      inPerson: 700,
      online: 500,
    },
    availability: {
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      timings: {
        morning: { start: '10:00', end: '13:00' },
        evening: { start: '16:00', end: '19:00' },
      },
      onlineConsultation: true,
    },
    ratings: { average: 4.6, count: 92 },
    languages: ['English', 'Hindi', 'Telugu'],
    isVerified: true,
    isActive: true,
  },
  {
    name: 'Dr. Vikram Singh',
    email: 'vikram.singh@hospital.com',
    phone: '+91 98765 43214',
    specialization: 'orthopedic',
    qualifications: ['MBBS', 'MS Orthopedics'],
    experience: 18,
    hospital: {
      name: 'Bone & Joint Hospital',
      address: 'Civil Lines',
      city: 'Jaipur',
      state: 'Rajasthan',
      zipCode: '302001',
    },
    clinicAddress: {
      street: '555 Ortho Center',
      city: 'Jaipur',
      state: 'Rajasthan',
      zipCode: '302001',
      country: 'India',
    },
    location: {
      type: 'Point',
      coordinates: [75.7873, 26.9124], // Jaipur
    },
    consultationFee: {
      inPerson: 800,
      online: 600,
    },
    availability: {
      days: ['monday', 'wednesday', 'friday', 'saturday'],
      timings: {
        morning: { start: '09:00', end: '14:00' },
        evening: { start: '17:00', end: '20:00' },
      },
      onlineConsultation: false,
    },
    ratings: { average: 4.4, count: 150 },
    languages: ['English', 'Hindi'],
    isVerified: true,
    isActive: true,
  },
];

const seedDoctors = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not set. Configure your Atlas connection string before seeding.');
    }
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected');

    await Doctor.deleteMany({});
    console.log('Existing doctors removed');

    await Doctor.insertMany(doctors);
    console.log(`${doctors.length} doctors seeded successfully`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedDoctors();
