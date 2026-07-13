require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/aarogyasaathi',
  jwtSecret: process.env.JWT_SECRET || 'default_secret_change_me',
  jwtExpire: process.env.JWT_EXPIRE || '30d',
  clientUrl: process.env.CLIENT_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:8081',
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
  twilioFromNumber: process.env.TWILIO_FROM_NUMBER || '',
  twilioMessagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID || '',
  twilioWhatsAppFromNumber: process.env.TWILIO_WHATSAPP_FROM_NUMBER || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
};
