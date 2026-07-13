const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

// Import all models
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const PhysicalHealth = require('../models/PhysicalHealth');
const MentalHealth = require('../models/MentalHealth');
const MoodLog = require('../models/MoodLog');
const SymptomCheck = require('../models/SymptomCheck');
const SOSAlert = require('../models/SOSAlert');
const Notification = require('../models/Notification');
const EmergencyContact = require('../models/EmergencyContact');

// Helper to generate random date within last N days
const randomDate = (daysBack) => {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysBack));
  date.setHours(Math.floor(Math.random() * 24));
  date.setMinutes(Math.floor(Math.random() * 60));
  return date;
};

// Helper for random number in range
const randomInRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Sample Doctors Data
const doctors = [
  {
    name: 'Dr. Rajesh Sharma',
    email: 'rajesh.sharma@hospital.com',
    phone: '+91 98765 43210',
    specialization: 'general_physician',
    qualifications: ['MBBS', 'MD'],
    experience: 15,
    hospital: { name: 'City General Hospital', address: 'MG Road', city: 'Mumbai', state: 'Maharashtra', zipCode: '400001' },
    clinicAddress: { street: '123 Health Street', city: 'Mumbai', state: 'Maharashtra', zipCode: '400001', country: 'India' },
    location: { type: 'Point', coordinates: [72.8777, 19.0760] },
    consultationFee: { inPerson: 500, online: 400 },
    availability: { days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], timings: { morning: { start: '09:00', end: '13:00' }, evening: { start: '17:00', end: '20:00' } }, onlineConsultation: true },
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
    hospital: { name: 'Heart Care Center', address: 'Sector 5', city: 'Delhi', state: 'Delhi', zipCode: '110001' },
    clinicAddress: { street: '456 Cardio Lane', city: 'Delhi', state: 'Delhi', zipCode: '110001', country: 'India' },
    location: { type: 'Point', coordinates: [77.2090, 28.6139] },
    consultationFee: { inPerson: 1000, online: 800 },
    availability: { days: ['monday', 'wednesday', 'friday', 'saturday'], timings: { morning: { start: '10:00', end: '14:00' }, evening: { start: '16:00', end: '19:00' } }, onlineConsultation: true },
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
    hospital: { name: 'Mind Wellness Center', address: 'Koramangala', city: 'Bangalore', state: 'Karnataka', zipCode: '560034' },
    clinicAddress: { street: '789 Mental Health Road', city: 'Bangalore', state: 'Karnataka', zipCode: '560034', country: 'India' },
    location: { type: 'Point', coordinates: [77.5946, 12.9716] },
    consultationFee: { inPerson: 1200, online: 1000 },
    availability: { days: ['tuesday', 'thursday', 'saturday'], timings: { morning: { start: '09:00', end: '12:00' }, evening: { start: '15:00', end: '18:00' } }, onlineConsultation: true },
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
    hospital: { name: 'Skin Care Clinic', address: 'Jubilee Hills', city: 'Hyderabad', state: 'Telangana', zipCode: '500033' },
    clinicAddress: { street: '321 Skin Health Avenue', city: 'Hyderabad', state: 'Telangana', zipCode: '500033', country: 'India' },
    location: { type: 'Point', coordinates: [78.4867, 17.3850] },
    consultationFee: { inPerson: 700, online: 500 },
    availability: { days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], timings: { morning: { start: '10:00', end: '13:00' }, evening: { start: '16:00', end: '19:00' } }, onlineConsultation: true },
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
    hospital: { name: 'Bone & Joint Hospital', address: 'Civil Lines', city: 'Jaipur', state: 'Rajasthan', zipCode: '302001' },
    clinicAddress: { street: '555 Ortho Center', city: 'Jaipur', state: 'Rajasthan', zipCode: '302001', country: 'India' },
    location: { type: 'Point', coordinates: [75.7873, 26.9124] },
    consultationFee: { inPerson: 800, online: 600 },
    availability: { days: ['monday', 'wednesday', 'friday', 'saturday'], timings: { morning: { start: '09:00', end: '14:00' }, evening: { start: '17:00', end: '20:00' } }, onlineConsultation: false },
    ratings: { average: 4.4, count: 150 },
    languages: ['English', 'Hindi'],
    isVerified: true,
    isActive: true,
  },
];

// Generate Physical Health Records (30 days)
function generatePhysicalHealthData(userId) {
  const records = [];
  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    records.push({
      user: userId,
      date,
      steps: randomInRange(3000, 15000),
      distance: randomInRange(2, 12),
      activeMinutes: randomInRange(20, 120),
      heartRate: {
        resting: randomInRange(58, 85),
        average: randomInRange(65, 90),
        max: randomInRange(110, 160),
      },
      bloodPressure: {
        systolic: randomInRange(100, 140),
        diastolic: randomInRange(60, 90),
        pulse: randomInRange(60, 90),
      },
      bloodOxygen: randomInRange(94, 100),
      bmi: {
        value: parseFloat((Math.random() * 10 + 20).toFixed(1)),
        category: 'normal',
      },
      sleep: {
        duration: parseFloat((Math.random() * 3 + 5).toFixed(1)),
        quality: randomInRange(1, 5),
        deepSleep: parseFloat((Math.random() * 2 + 1).toFixed(1)),
        remSleep: parseFloat((Math.random() * 2 + 1).toFixed(1)),
      },
      waterIntake: {
        glasses: randomInRange(4, 12),
        target: 8,
      },
      calories: {
        intake: randomInRange(1500, 2500),
        burned: randomInRange(200, 600),
        target: 2000,
      },
      temperature: parseFloat((Math.random() * 1 + 36.5).toFixed(1)),
      source: 'manual',
    });
  }
  return records;
}

// Generate Mental Health Records (30 days)
function generateMentalHealthData(userId) {
  const records = [];
  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    records.push({
      user: userId,
      date,
      stressScore: randomInRange(1, 8),
      anxietyScore: randomInRange(1, 7),
      depressionScore: randomInRange(1, 5),
      sleepQuality: randomInRange(4, 10),
      energyLevel: randomInRange(3, 10),
      socialConnection: randomInRange(4, 10),
      focusLevel: randomInRange(4, 10),
      selfEsteem: randomInRange(5, 10),
      lifeSatisfaction: randomInRange(5, 10),
      copingEffectiveness: randomInRange(5, 10),
      aiRecommendations: [
        'Practice deep breathing exercises',
        'Take regular breaks during work',
        'Engage in physical activity',
      ],
    });
  }
  return records;
}

// Generate Mood Logs (14 days, multiple per day)
function generateMoodLogs(userId) {
  const emotions = ['happy', 'calm', 'anxious', 'sad', 'stressed', 'excited', 'grateful', 'content', 'tired'];
  const exerciseOptions = ['none', 'light', 'moderate', 'intense'];
  const socialOptions = ['none', 'minimal', 'moderate', 'lots'];
  const logs = [];
  
  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    logs.push({
      user: userId,
      date,
      moodRating: randomInRange(4, 10),
      emotions: emotions.slice(0, randomInRange(1, 4)),
      lifestyleFactors: {
        sleepQuality: randomInRange(1, 5),
        sleepHours: randomInRange(5, 9),
        exercise: exerciseOptions[randomInRange(0, 3)],
        socialInteraction: socialOptions[randomInRange(0, 3)],
        hydration: randomInRange(4, 10),
      },
      notes: 'Feeling good overall.',
    });
  }
  return logs;
}

// Generate Symptom Checks
function generateSymptomChecks(userId) {
  const symptoms = [
    { name: 'Headache', severity: 5, location: 'head' },
    { name: 'Fatigue', severity: 4, location: 'whole body' },
    { name: 'Back pain', severity: 6, location: 'lower back' },
    { name: 'Cold symptoms', severity: 3, location: 'nose/throat' },
  ];
  
  return [
    {
      user: userId,
      date: randomDate(7),
      symptoms: [symptoms[0], symptoms[1]],
      aiAnalysis: {
        possibleConditions: [{ name: 'Tension headache', probability: 70, severity: 'mild' }],
        urgencyLevel: 'low',
        recommendations: ['Rest', 'Stay hydrated', 'Take over-the-counter pain relief if needed'],
        shouldSeeDoctor: false,
        overallSeverityScore: 35,
      },
      status: 'resolved',
    },
    {
      user: userId,
      date: randomDate(14),
      symptoms: [symptoms[2]],
      aiAnalysis: {
        possibleConditions: [{ name: 'Muscle strain', probability: 65, severity: 'mild' }],
        urgencyLevel: 'low',
        recommendations: ['Apply heat/cold', 'Gentle stretching', 'Avoid heavy lifting'],
        shouldSeeDoctor: false,
        overallSeverityScore: 40,
      },
      status: 'resolved',
    },
  ];
}

// Generate Notifications
function generateNotifications(userId) {
  return [
    {
      user: userId,
      type: 'water_reminder',
      title: 'Stay Hydrated! 💧',
      message: 'You\'ve only had 4 glasses today. Drink some water!',
      priority: 'normal',
      status: 'read',
      readAt: new Date(),
    },
    {
      user: userId,
      type: 'health_tip',
      title: 'Health Tip of the Day',
      message: 'Walking 30 minutes daily can reduce heart disease risk by 35%.',
      priority: 'low',
      status: 'delivered',
    },
    {
      user: userId,
      type: 'mood_check',
      title: 'How are you feeling?',
      message: 'Take a moment to log your mood and emotions.',
      priority: 'normal',
      status: 'pending',
      scheduledFor: new Date(Date.now() + 3600000),
    },
    {
      user: userId,
      type: 'achievement',
      title: 'Goal Achieved! 🎉',
      message: 'You reached 10,000 steps today! Keep it up!',
      priority: 'normal',
      status: 'read',
      readAt: randomDate(2),
    },
  ];
}

async function seedDatabase() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not set. Configure your Atlas connection string before seeding.');
    }
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Doctor.deleteMany({}),
      PhysicalHealth.deleteMany({}),
      MentalHealth.deleteMany({}),
      MoodLog.deleteMany({}),
      SymptomCheck.deleteMany({}),
      SOSAlert.deleteMany({}),
      Notification.deleteMany({}),
      EmergencyContact.deleteMany({}),
    ]);

    // Seed Doctors
    console.log('👨‍⚕️ Seeding doctors...');
    await Doctor.insertMany(doctors);
    console.log(`   ✅ Created ${doctors.length} doctors`);

    // Create demo user
    console.log('👤 Creating demo user...');
    const hashedPassword = await bcrypt.hash('demo123456', 10);
    const demoUser = await User.create({
      email: 'demo@aarogyasaathi.com',
      password: hashedPassword,
      firstName: 'Demo',
      lastName: 'User',
      phone: '+91 98765 00000',
      dateOfBirth: new Date('1990-05-15'),
      gender: 'male',
      bloodGroup: 'O+',
      height: 175,
      weight: 70,
      isVerified: true,
      isActive: true,
    });
    console.log(`   ✅ Created demo user: ${demoUser.email}`);

    // Seed Physical Health Data
    console.log('💪 Seeding physical health data...');
    const physicalData = generatePhysicalHealthData(demoUser._id);
    await PhysicalHealth.insertMany(physicalData);
    console.log(`   ✅ Created ${physicalData.length} physical health records`);

    // Seed Mental Health Data
    console.log('🧠 Seeding mental health data...');
    const mentalData = generateMentalHealthData(demoUser._id);
    await MentalHealth.insertMany(mentalData);
    console.log(`   ✅ Created ${mentalData.length} mental health records`);

    // Seed Mood Logs
    console.log('😊 Seeding mood logs...');
    const moodData = generateMoodLogs(demoUser._id);
    await MoodLog.insertMany(moodData);
    console.log(`   ✅ Created ${moodData.length} mood logs`);

    // Seed Symptom Checks
    console.log('🩺 Seeding symptom checks...');
    const symptomData = generateSymptomChecks(demoUser._id);
    await SymptomCheck.insertMany(symptomData);
    console.log(`   ✅ Created ${symptomData.length} symptom checks`);

    // Seed Notifications
    console.log('🔔 Seeding notifications...');
    const notificationData = generateNotifications(demoUser._id);
    await Notification.insertMany(notificationData);
    console.log(`   ✅ Created ${notificationData.length} notifications`);

    // Seed Emergency Contact
    console.log('🚨 Seeding emergency contact...');
    await EmergencyContact.create({
      user: demoUser._id,
      contacts: [
        {
          name: 'Rahul Kumar',
          relationship: 'sibling',
          phone: '+91 98765 11111',
          isPrimary: true,
          notifyOnEmergency: true,
        },
        {
          name: 'Dr. Sharma',
          relationship: 'doctor',
          phone: '+91 98765 22222',
          isPrimary: false,
          notifyOnEmergency: true,
        },
      ],
      medicalInfo: {
        bloodGroup: 'O+',
        allergies: ['Penicillin'],
        medications: [{ name: 'Vitamin D', dosage: '1000 IU' }],
        medicalConditions: [],
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
    });
    console.log('   ✅ Created emergency contact info');

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Doctors: ${doctors.length}`);
    console.log(`   - Users: 1 (demo@aarogyasaathi.com / demo123456)`);
    console.log(`   - Physical Health Records: ${physicalData.length}`);
    console.log(`   - Mental Health Records: ${mentalData.length}`);
    console.log(`   - Mood Logs: ${moodData.length}`);
    console.log(`   - Symptom Checks: ${symptomData.length}`);
    console.log(`   - Notifications: ${notificationData.length}`);
    console.log(`   - Emergency Contacts: 1`);

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
}

seedDatabase();
