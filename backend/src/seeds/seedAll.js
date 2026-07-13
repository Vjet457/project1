const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

// Import all models
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const HealthRecord = require('../models/HealthRecord');
const MentalHealthRecord = require('../models/MentalHealthRecord');
const SymptomCheck = require('../models/SymptomCheck');
const EmergencyContact = require('../models/EmergencyContact');

// Sample Doctors Data
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
      coordinates: [72.8777, 19.0760],
    },
    consultationFee: { inPerson: 500, online: 400 },
    availability: {
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      timings: { morning: { start: '09:00', end: '13:00' }, evening: { start: '17:00', end: '20:00' } },
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
      coordinates: [77.2090, 28.6139],
    },
    consultationFee: { inPerson: 1000, online: 800 },
    availability: {
      days: ['monday', 'wednesday', 'friday', 'saturday'],
      timings: { morning: { start: '10:00', end: '14:00' }, evening: { start: '16:00', end: '19:00' } },
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
      coordinates: [77.5946, 12.9716],
    },
    consultationFee: { inPerson: 1200, online: 1000 },
    availability: {
      days: ['tuesday', 'thursday', 'saturday'],
      timings: { morning: { start: '09:00', end: '12:00' }, evening: { start: '15:00', end: '18:00' } },
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
      coordinates: [78.4867, 17.3850],
    },
    consultationFee: { inPerson: 700, online: 500 },
    availability: {
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      timings: { morning: { start: '10:00', end: '13:00' }, evening: { start: '16:00', end: '19:00' } },
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
      coordinates: [75.7873, 26.9124],
    },
    consultationFee: { inPerson: 800, online: 600 },
    availability: {
      days: ['monday', 'wednesday', 'friday', 'saturday'],
      timings: { morning: { start: '09:00', end: '14:00' }, evening: { start: '17:00', end: '20:00' } },
      onlineConsultation: false,
    },
    ratings: { average: 4.4, count: 150 },
    languages: ['English', 'Hindi'],
    isVerified: true,
    isActive: true,
  },
  {
    name: 'Dr. Meera Nair',
    email: 'meera.nair@hospital.com',
    phone: '+91 98765 43215',
    specialization: 'pediatrician',
    qualifications: ['MBBS', 'MD Pediatrics'],
    experience: 14,
    hospital: {
      name: 'Children\'s Hospital',
      address: 'Anna Nagar',
      city: 'Chennai',
      state: 'Tamil Nadu',
      zipCode: '600040',
    },
    clinicAddress: {
      street: '100 Kids Health Road',
      city: 'Chennai',
      state: 'Tamil Nadu',
      zipCode: '600040',
      country: 'India',
    },
    location: {
      type: 'Point',
      coordinates: [80.2707, 13.0827],
    },
    consultationFee: { inPerson: 600, online: 450 },
    availability: {
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      timings: { morning: { start: '08:00', end: '12:00' }, evening: { start: '16:00', end: '20:00' } },
      onlineConsultation: true,
    },
    ratings: { average: 4.9, count: 200 },
    languages: ['English', 'Hindi', 'Tamil', 'Malayalam'],
    isVerified: true,
    isActive: true,
  },
  {
    name: 'Dr. Arjun Mehta',
    email: 'arjun.mehta@hospital.com',
    phone: '+91 98765 43216',
    specialization: 'neurologist',
    qualifications: ['MBBS', 'MD', 'DM Neurology'],
    experience: 16,
    hospital: {
      name: 'Neuro Care Institute',
      address: 'Banjara Hills',
      city: 'Hyderabad',
      state: 'Telangana',
      zipCode: '500034',
    },
    clinicAddress: {
      street: '200 Brain Health Avenue',
      city: 'Hyderabad',
      state: 'Telangana',
      zipCode: '500034',
      country: 'India',
    },
    location: {
      type: 'Point',
      coordinates: [78.4500, 17.4100],
    },
    consultationFee: { inPerson: 1500, online: 1200 },
    availability: {
      days: ['monday', 'wednesday', 'friday'],
      timings: { morning: { start: '10:00', end: '14:00' }, evening: { start: '17:00', end: '19:00' } },
      onlineConsultation: true,
    },
    ratings: { average: 4.7, count: 78 },
    languages: ['English', 'Hindi', 'Telugu'],
    isVerified: true,
    isActive: true,
  },
  {
    name: 'Dr. Kavitha Rao',
    email: 'kavitha.rao@hospital.com',
    phone: '+91 98765 43217',
    specialization: 'gynecologist',
    qualifications: ['MBBS', 'MS OBG', 'DNB'],
    experience: 20,
    hospital: {
      name: 'Women\'s Health Center',
      address: 'Indiranagar',
      city: 'Bangalore',
      state: 'Karnataka',
      zipCode: '560038',
    },
    clinicAddress: {
      street: '300 Women Care Road',
      city: 'Bangalore',
      state: 'Karnataka',
      zipCode: '560038',
      country: 'India',
    },
    location: {
      type: 'Point',
      coordinates: [77.6400, 12.9784],
    },
    consultationFee: { inPerson: 900, online: 700 },
    availability: {
      days: ['monday', 'tuesday', 'thursday', 'friday', 'saturday'],
      timings: { morning: { start: '09:00', end: '13:00' }, evening: { start: '16:00', end: '19:00' } },
      onlineConsultation: true,
    },
    ratings: { average: 4.8, count: 180 },
    languages: ['English', 'Hindi', 'Kannada', 'Telugu'],
    isVerified: true,
    isActive: true,
  },
  {
    name: 'Dr. Sanjay Gupta',
    email: 'sanjay.gupta@hospital.com',
    phone: '+91 98765 43218',
    specialization: 'gastroenterologist',
    qualifications: ['MBBS', 'MD', 'DM Gastroenterology'],
    experience: 13,
    hospital: {
      name: 'Digestive Health Center',
      address: 'Connaught Place',
      city: 'Delhi',
      state: 'Delhi',
      zipCode: '110001',
    },
    clinicAddress: {
      street: '400 GI Health Road',
      city: 'Delhi',
      state: 'Delhi',
      zipCode: '110001',
      country: 'India',
    },
    location: {
      type: 'Point',
      coordinates: [77.2195, 28.6328],
    },
    consultationFee: { inPerson: 1100, online: 900 },
    availability: {
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      timings: { morning: { start: '10:00', end: '14:00' }, evening: { start: '17:00', end: '20:00' } },
      onlineConsultation: true,
    },
    ratings: { average: 4.5, count: 95 },
    languages: ['English', 'Hindi', 'Punjabi'],
    isVerified: true,
    isActive: true,
  },
  {
    name: 'Dr. Ananya Sharma',
    email: 'ananya.sharma@hospital.com',
    phone: '+91 98765 43219',
    specialization: 'psychologist',
    qualifications: ['MA Psychology', 'PhD Clinical Psychology'],
    experience: 9,
    hospital: {
      name: 'Mental Wellness Clinic',
      address: 'Powai',
      city: 'Mumbai',
      state: 'Maharashtra',
      zipCode: '400076',
    },
    clinicAddress: {
      street: '500 Mind Care Lane',
      city: 'Mumbai',
      state: 'Maharashtra',
      zipCode: '400076',
      country: 'India',
    },
    location: {
      type: 'Point',
      coordinates: [72.9052, 19.1176],
    },
    consultationFee: { inPerson: 1000, online: 800 },
    availability: {
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      timings: { morning: { start: '09:00', end: '13:00' }, evening: { start: '15:00', end: '19:00' } },
      onlineConsultation: true,
    },
    ratings: { average: 4.9, count: 110 },
    languages: ['English', 'Hindi', 'Marathi'],
    isVerified: true,
    isActive: true,
  },
];

// Sample Demo User
const createDemoUser = async () => {
  const demoUser = {
    firstName: 'Demo',
    lastName: 'User',
    email: 'demo@aarogyasaathi.com',
    password: 'demo123456',
    phone: '+91 98765 00000',
    dateOfBirth: new Date('1995-05-15'),
    gender: 'male',
    bloodGroup: 'O+',
    height: 175,
    weight: 70,
    address: {
      street: '123 Demo Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      zipCode: '400001',
      country: 'India',
    },
    medicalConditions: ['None'],
    allergies: ['Dust'],
    medications: [],
    isActive: true,
  };

  return await User.create(demoUser);
};

// Sample Health Records
const createHealthRecords = async (userId) => {
  const records = [];
  const today = new Date();
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    records.push({
      user: userId,
      date: date,
      vitals: {
        heartRate: 65 + Math.floor(Math.random() * 20),
        bloodPressure: {
          systolic: 110 + Math.floor(Math.random() * 20),
          diastolic: 70 + Math.floor(Math.random() * 15),
        },
        bloodOxygen: 95 + Math.floor(Math.random() * 5),
        bodyTemperature: 97.5 + Math.random() * 2,
      },
      activity: {
        steps: 5000 + Math.floor(Math.random() * 8000),
        distance: 3 + Math.random() * 6,
        caloriesBurned: 200 + Math.floor(Math.random() * 400),
        activeMinutes: 20 + Math.floor(Math.random() * 60),
      },
      sleep: {
        duration: 5 + Math.random() * 4,
        quality: 2 + Math.floor(Math.random() * 4),
      },
      nutrition: {
        waterIntake: 4 + Math.floor(Math.random() * 6),
        caloriesConsumed: 1500 + Math.floor(Math.random() * 1000),
      },
      body: {
        weight: 68 + Math.random() * 4,
        bmi: 22 + Math.random() * 3,
      },
      healthScore: {
        overall: 65 + Math.floor(Math.random() * 30),
        vitalsScore: 70 + Math.floor(Math.random() * 25),
        activityScore: 60 + Math.floor(Math.random() * 35),
        sleepScore: 65 + Math.floor(Math.random() * 30),
        nutritionScore: 60 + Math.floor(Math.random() * 35),
      },
      source: 'manual',
    });
  }
  
  return await HealthRecord.insertMany(records);
};

// Sample Mental Health Records
const createMentalHealthRecords = async (userId) => {
  const records = [];
  const today = new Date();
  const emotions = ['happy', 'calm', 'content', 'grateful', 'hopeful', 'stressed', 'anxious'];
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    records.push({
      user: userId,
      date: date,
      mood: {
        overall: 5 + Math.floor(Math.random() * 5),
        emotions: [emotions[Math.floor(Math.random() * emotions.length)]],
        notes: '',
      },
      stressLevel: 1 + Math.floor(Math.random() * 4),
      anxietyLevel: 1 + Math.floor(Math.random() * 3),
      energyLevel: 2 + Math.floor(Math.random() * 4),
      motivationLevel: 2 + Math.floor(Math.random() * 4),
      sleepQuality: 2 + Math.floor(Math.random() * 4),
      sleepHours: 5 + Math.random() * 4,
      socialInteraction: ['minimal', 'moderate', 'active'][Math.floor(Math.random() * 3)],
      activities: {
        meditation: {
          practiced: Math.random() > 0.5,
          duration: Math.floor(Math.random() * 20),
        },
        journaling: {
          practiced: Math.random() > 0.7,
        },
        breathingExercises: {
          practiced: Math.random() > 0.6,
          duration: Math.floor(Math.random() * 10),
        },
      },
      workLifeBalance: 2 + Math.floor(Math.random() * 4),
      mentalHealthScore: {
        overall: 60 + Math.floor(Math.random() * 35),
        moodScore: 65 + Math.floor(Math.random() * 30),
        stressScore: 55 + Math.floor(Math.random() * 40),
        wellnessScore: 60 + Math.floor(Math.random() * 35),
      },
    });
  }
  
  return await MentalHealthRecord.insertMany(records);
};

// Sample Symptom Checks
const createSymptomChecks = async (userId) => {
  const checks = [
    {
      user: userId,
      date: new Date(),
      symptoms: [
        { name: 'Headache', severity: 5, duration: { value: 2, unit: 'hours' }, location: 'head' },
      ],
      aiAnalysis: {
        possibleConditions: [
          { name: 'Tension Headache', probability: 70, description: 'Common headache due to stress or tension', severity: 'mild' },
          { name: 'Migraine', probability: 20, description: 'Severe headache often with sensitivity to light', severity: 'moderate' },
        ],
        urgencyLevel: 'low',
        recommendations: ['Rest in a dark room', 'Stay hydrated', 'Take OTC pain relief if needed'],
        shouldSeeDoctor: false,
        overallSeverityScore: 35,
      },
      status: 'resolved',
      resolvedDate: new Date(),
    },
    {
      user: userId,
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      symptoms: [
        { name: 'Fever', severity: 6, duration: { value: 1, unit: 'days' }, description: 'Mild fever with chills' },
        { name: 'Body ache', severity: 4, duration: { value: 1, unit: 'days' } },
      ],
      aiAnalysis: {
        possibleConditions: [
          { name: 'Viral Infection', probability: 65, description: 'Common viral illness', severity: 'mild' },
          { name: 'Common Cold', probability: 25, description: 'Upper respiratory infection', severity: 'mild' },
        ],
        urgencyLevel: 'medium',
        recommendations: ['Rest', 'Stay hydrated', 'Monitor temperature', 'See doctor if fever persists'],
        shouldSeeDoctor: true,
        specialistRecommended: 'general_physician',
        overallSeverityScore: 50,
      },
      status: 'resolved',
      resolvedDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      followUp: {
        doctorVisited: true,
        diagnosis: 'Viral fever',
        treatment: 'Rest and symptomatic treatment',
      },
    },
  ];
  
  return await SymptomCheck.insertMany(checks);
};

// Sample Emergency Contact
const createEmergencyContact = async (userId) => {
  const emergencyData = {
    user: userId,
    contacts: [
      {
        name: 'Emergency Contact 1',
        relationship: 'spouse',
        phone: '+91 98765 11111',
        email: 'contact1@example.com',
        isPrimary: true,
        notifyOnEmergency: true,
      },
      {
        name: 'Emergency Contact 2',
        relationship: 'parent',
        phone: '+91 98765 22222',
        isPrimary: false,
        notifyOnEmergency: true,
      },
    ],
    medicalInfo: {
      bloodGroup: 'O+',
      allergies: ['Dust'],
      medications: [],
      medicalConditions: [],
      insuranceProvider: 'Health Insurance Co',
      insurancePolicyNumber: 'POL123456789',
    },
    preferredHospital: {
      name: 'City General Hospital',
      address: 'MG Road, Mumbai',
      phone: '+91 22 12345678',
      location: {
        type: 'Point',
        coordinates: [72.8777, 19.0760], // Mumbai coordinates
      },
    },
  };
  
  return await EmergencyContact.create(emergencyData);
};

// Main seed function
const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not set. Configure your Atlas connection string before seeding.');
    }
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected');

    // Clear existing data
    console.log('\nClearing existing data...');
    await User.deleteMany({});
    await Doctor.deleteMany({});
    await HealthRecord.deleteMany({});
    await MentalHealthRecord.deleteMany({});
    await SymptomCheck.deleteMany({});
    await EmergencyContact.deleteMany({});
    console.log('Existing data cleared');

    // Seed Doctors
    console.log('\nSeeding doctors...');
    await Doctor.insertMany(doctors);
    console.log(`${doctors.length} doctors added`);

    // Create Demo User
    console.log('\nCreating demo user...');
    const demoUser = await createDemoUser();
    console.log(`Demo user created: ${demoUser.email}`);

    // Create Health Records for demo user
    console.log('\nCreating health records...');
    const healthRecords = await createHealthRecords(demoUser._id);
    console.log(`${healthRecords.length} health records created`);

    // Create Mental Health Records for demo user
    console.log('\nCreating mental health records...');
    const mentalRecords = await createMentalHealthRecords(demoUser._id);
    console.log(`${mentalRecords.length} mental health records created`);

    // Create Symptom Checks for demo user
    console.log('\nCreating symptom checks...');
    const symptomChecks = await createSymptomChecks(demoUser._id);
    console.log(`${symptomChecks.length} symptom checks created`);

    // Create Emergency Contact for demo user
    console.log('\nCreating emergency contact...');
    await createEmergencyContact(demoUser._id);
    console.log('Emergency contact created');

    // Create indexes
    console.log('\nCreating indexes...');
    await Doctor.collection.createIndex({ location: '2dsphere' });
    await Doctor.collection.createIndex({ specialization: 1, 'ratings.average': -1 });
    await HealthRecord.collection.createIndex({ user: 1, date: -1 });
    await MentalHealthRecord.collection.createIndex({ user: 1, date: -1 });
    await SymptomCheck.collection.createIndex({ user: 1, date: -1 });
    console.log('Indexes created');

    console.log('\n========================================');
    console.log('DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('========================================');
    console.log('\nDatabase Summary:');
    console.log(`- Users: 1 (Demo User)`);
    console.log(`- Doctors: ${doctors.length}`);
    console.log(`- Health Records: ${healthRecords.length}`);
    console.log(`- Mental Health Records: ${mentalRecords.length}`);
    console.log(`- Symptom Checks: ${symptomChecks.length}`);
    console.log(`- Emergency Contacts: 1`);
    console.log('\nDemo User Credentials:');
    console.log('Email: demo@aarogyasaathi.com');
    console.log('Password: demo123456');
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

// Run the seed
seedDatabase();
