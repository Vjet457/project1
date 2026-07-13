const User = require('./User');
const HealthRecord = require('./HealthRecord');
const MentalHealthRecord = require('./MentalHealthRecord');
const SymptomCheck = require('./SymptomCheck');
const EmergencyContact = require('./EmergencyContact');
const Doctor = require('./Doctor');

// New models
const PhysicalHealth = require('./PhysicalHealth');
const MentalHealth = require('./MentalHealth');
const MoodLog = require('./MoodLog');
const SOSAlert = require('./SOSAlert');
const Notification = require('./Notification');

module.exports = {
  User,
  HealthRecord,
  MentalHealthRecord,
  SymptomCheck,
  EmergencyContact,
  Doctor,
  // New models
  PhysicalHealth,
  MentalHealth,
  MoodLog,
  SOSAlert,
  Notification,
};
