const config = require('../config');

const TWILIO_API_BASE = 'https://api.twilio.com/2010-04-01';

function hasTwilioConfig() {
  return Boolean(
    config.twilioAccountSid &&
    config.twilioAuthToken &&
    (config.twilioFromNumber || config.twilioMessagingServiceSid)
  );
}

function hasTwilioWhatsAppConfig() {
  return Boolean(
    config.twilioAccountSid &&
    config.twilioAuthToken &&
    config.twilioWhatsAppFromNumber
  );
}

function buildTwilioFormBody(to, message, sender) {
  const body = new URLSearchParams();
  body.append('To', to);
  body.append('Body', message);

  if (config.twilioMessagingServiceSid) {
    body.append('MessagingServiceSid', config.twilioMessagingServiceSid);
  } else if (sender) {
    body.append('From', sender);
  }

  return body;
}

async function sendSms(to, message) {
  if (!hasTwilioConfig()) {
    return {
      success: false,
      skipped: true,
      reason: 'Twilio is not configured',
    };
  }

  const endpoint = `${TWILIO_API_BASE}/Accounts/${config.twilioAccountSid}/Messages.json`;
  const authHeader = Buffer.from(`${config.twilioAccountSid}:${config.twilioAuthToken}`).toString('base64');
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authHeader}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: buildTwilioFormBody(to, message, config.twilioFromNumber),
  });

  const responseText = await response.text();
  let data = null;
  try {
    data = responseText ? JSON.parse(responseText) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const errorMessage = data?.message || responseText || 'Twilio SMS send failed';
    throw new Error(errorMessage);
  }

  return {
    success: true,
    sid: data?.sid,
  };
}

async function sendWhatsApp(to, message) {
  if (!hasTwilioWhatsAppConfig()) {
    return {
      success: false,
      skipped: true,
      reason: 'Twilio WhatsApp is not configured',
    };
  }

  const endpoint = `${TWILIO_API_BASE}/Accounts/${config.twilioAccountSid}/Messages.json`;
  const authHeader = Buffer.from(`${config.twilioAccountSid}:${config.twilioAuthToken}`).toString('base64');
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authHeader}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: buildTwilioFormBody(`whatsapp:${to}`, message, `whatsapp:${config.twilioWhatsAppFromNumber}`),
  });

  const responseText = await response.text();
  let data = null;
  try {
    data = responseText ? JSON.parse(responseText) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const errorMessage = data?.message || responseText || 'Twilio WhatsApp send failed';
    throw new Error(errorMessage);
  }

  return {
    success: true,
    sid: data?.sid,
  };
}

async function sendEmergencyNotification({ phone, message, useWhatsApp = false }) {
  const deliveries = [];

  const smsResult = await sendSms(phone, message);
  deliveries.push({ channel: 'sms', ...smsResult });

  if (useWhatsApp) {
    const whatsappResult = await sendWhatsApp(phone, message);
    deliveries.push({ channel: 'whatsapp', ...whatsappResult });
  }

  return deliveries;
}

module.exports = {
  hasTwilioConfig,
  hasTwilioWhatsAppConfig,
  sendSms,
  sendWhatsApp,
  sendEmergencyNotification,
};