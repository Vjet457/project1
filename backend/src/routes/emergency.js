const express = require('express');
const router = express.Router();
const EmergencyContact = require('../models/EmergencyContact');
const Notification = require('../models/Notification');
const SOSAlert = require('../models/SOSAlert');
const { protect } = require('../middleware/auth');
const { sendEmergencyNotification, hasTwilioConfig, hasTwilioWhatsAppConfig } = require('../utils/sms');

const clearMalformedPreferredHospitalLocationForUser = async (userId) => {
  await EmergencyContact.updateOne(
    {
      user: userId,
      'preferredHospital.location.type': 'Point',
      $or: [
        { 'preferredHospital.location.coordinates': { $exists: false } },
        { 'preferredHospital.location.coordinates.0': { $exists: false } },
        { 'preferredHospital.location.coordinates.1': { $exists: false } },
      ],
    },
    { $unset: { 'preferredHospital.location': 1 } }
  );
};

const sanitizePreferredHospitalLocation = async (emergencyData) => {
  if (!emergencyData?.preferredHospital?.location) {
    return emergencyData;
  }

  const location = emergencyData.preferredHospital.location;
  const coords = location.coordinates;
  const hasValidType = location.type === 'Point';
  const hasValidCoords =
    Array.isArray(coords) &&
    coords.length === 2 &&
    coords.every(value => typeof value === 'number' && Number.isFinite(value));

  // Remove malformed legacy geo payloads so 2dsphere indexing doesn't fail on save.
  if (!hasValidType || !hasValidCoords) {
    await EmergencyContact.updateOne(
      { _id: emergencyData._id },
      { $unset: { 'preferredHospital.location': 1 } }
    );
    emergencyData.preferredHospital.location = undefined;
  }

  return emergencyData;
};

const saveWithGeoRecovery = async (emergencyData) => {
  try {
    await emergencyData.save();
    return;
  } catch (error) {
    const message = error?.message || '';
    const isGeoExtractionError = message.includes("Can't extract geo keys") || message.includes('2dsphere');

    if (!isGeoExtractionError) {
      throw error;
    }

    await EmergencyContact.updateOne(
      { _id: emergencyData._id },
      { $unset: { 'preferredHospital.location': 1 } }
    );

    emergencyData.preferredHospital = emergencyData.preferredHospital || {};
    emergencyData.preferredHospital.location = undefined;
    await emergencyData.save();
  }
};

// @route   GET /api/emergency/contacts
// @desc    Get emergency contacts
// @access  Private
router.get('/contacts', protect, async (req, res) => {
  try {
    await clearMalformedPreferredHospitalLocationForUser(req.user.id);

    let emergencyData = await EmergencyContact.findOne({ user: req.user.id });

    if (!emergencyData) {
      emergencyData = await EmergencyContact.create({
        user: req.user.id,
        contacts: [],
      });
    }

    await sanitizePreferredHospitalLocation(emergencyData);

    res.json({
      success: true,
      data: emergencyData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching emergency contacts',
      error: error.message,
    });
  }
});

// @route   POST /api/emergency/contacts
// @desc    Add emergency contact
// @access  Private
router.post('/contacts', protect, async (req, res) => {
  try {
    await clearMalformedPreferredHospitalLocationForUser(req.user.id);

    const { name, relationship, phone, email, isPrimary, notifyOnEmergency } = req.body;

    let emergencyData = await EmergencyContact.findOne({ user: req.user.id });

    if (!emergencyData) {
      emergencyData = await EmergencyContact.create({
        user: req.user.id,
        contacts: [],
      });
    }

    // If new contact is primary, unset other primary contacts
    if (isPrimary) {
      emergencyData.contacts.forEach(contact => {
        contact.isPrimary = false;
      });
    }

    emergencyData.contacts.push({
      name,
      relationship,
      phone,
      email,
      isPrimary: isPrimary || emergencyData.contacts.length === 0,
      notifyOnEmergency: notifyOnEmergency !== false,
    });

    await sanitizePreferredHospitalLocation(emergencyData);

    await saveWithGeoRecovery(emergencyData);

    res.status(201).json({
      success: true,
      message: 'Emergency contact added',
      data: emergencyData,
    });
  } catch (error) {
    const isGeoError = String(error?.message || '').includes("Can't extract geo keys");
    res.status(500).json({
      success: false,
      message: isGeoError
        ? 'Emergency profile data is corrupted. Please restart backend once and try again.'
        : (error.message || 'Error adding emergency contact'),
      error: isGeoError ? 'Emergency profile geo data is invalid' : error.message,
    });
  }
});

// @route   PUT /api/emergency/contacts/:contactId
// @desc    Update emergency contact
// @access  Private
router.put('/contacts/:contactId', protect, async (req, res) => {
  try {
    await clearMalformedPreferredHospitalLocationForUser(req.user.id);

    const emergencyData = await EmergencyContact.findOne({ user: req.user.id });

    if (!emergencyData) {
      return res.status(404).json({
        success: false,
        message: 'Emergency data not found',
      });
    }

    await sanitizePreferredHospitalLocation(emergencyData);

    const contact = emergencyData.contacts.id(req.params.contactId);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found',
      });
    }

    // If updating to primary, unset other primary contacts
    if (req.body.isPrimary) {
      emergencyData.contacts.forEach(c => {
        c.isPrimary = false;
      });
    }

    Object.assign(contact, req.body);
    await sanitizePreferredHospitalLocation(emergencyData);
    await saveWithGeoRecovery(emergencyData);

    res.json({
      success: true,
      message: 'Emergency contact updated',
      data: emergencyData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating emergency contact',
      error: error.message,
    });
  }
});

// @route   DELETE /api/emergency/contacts/:contactId
// @desc    Delete emergency contact
// @access  Private
router.delete('/contacts/:contactId', protect, async (req, res) => {
  try {
    await clearMalformedPreferredHospitalLocationForUser(req.user.id);

    const emergencyData = await EmergencyContact.findOne({ user: req.user.id });

    if (!emergencyData) {
      return res.status(404).json({
        success: false,
        message: 'Emergency data not found',
      });
    }

    await sanitizePreferredHospitalLocation(emergencyData);

    emergencyData.contacts = emergencyData.contacts.filter(
      c => c._id.toString() !== req.params.contactId
    );
    await sanitizePreferredHospitalLocation(emergencyData);
    await saveWithGeoRecovery(emergencyData);

    res.json({
      success: true,
      message: 'Emergency contact deleted',
      data: emergencyData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting emergency contact',
      error: error.message,
    });
  }
});

// @route   PUT /api/emergency/medical-info
// @desc    Update emergency medical info
// @access  Private
router.put('/medical-info', protect, async (req, res) => {
  try {
    await clearMalformedPreferredHospitalLocationForUser(req.user.id);

    let emergencyData = await EmergencyContact.findOne({ user: req.user.id });

    if (!emergencyData) {
      emergencyData = await EmergencyContact.create({
        user: req.user.id,
        contacts: [],
      });
    }

    await sanitizePreferredHospitalLocation(emergencyData);

    emergencyData.medicalInfo = req.body;
    await emergencyData.save();

    res.json({
      success: true,
      message: 'Medical info updated',
      data: emergencyData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating medical info',
      error: error.message,
    });
  }
});

// @route   PUT /api/emergency/preferred-hospital
// @desc    Update preferred hospital
// @access  Private
router.put('/preferred-hospital', protect, async (req, res) => {
  try {
    await clearMalformedPreferredHospitalLocationForUser(req.user.id);

    let emergencyData = await EmergencyContact.findOne({ user: req.user.id });

    if (!emergencyData) {
      emergencyData = await EmergencyContact.create({
        user: req.user.id,
        contacts: [],
      });
    }

    await sanitizePreferredHospitalLocation(emergencyData);

    emergencyData.preferredHospital = req.body;
    await emergencyData.save();

    res.json({
      success: true,
      message: 'Preferred hospital updated',
      data: emergencyData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating preferred hospital',
      error: error.message,
    });
  }
});

// @route   POST /api/emergency/trigger-sos
// @desc    Trigger SOS alert
// @access  Private
router.post('/trigger-sos', protect, async (req, res) => {
  try {
    const { location, description, emergencyType = 'medical', severity = 'high', userCondition } = req.body;

    let emergencyData = await EmergencyContact.findOne({ user: req.user.id });

    if (!emergencyData) {
      return res.status(404).json({
        success: false,
        message: 'Emergency contacts not set up',
      });
    }

    // Persist the alert so the contact list and notification history stay in sync.
    const sosAlert = await SOSAlert.create({
      user: req.user.id,
      location: location
        ? {
            type: 'Point',
            coordinates: [location.longitude, location.latitude],
            accuracy: location.accuracy,
            altitude: location.altitude,
            address: location.address,
            landmark: location.landmark,
          }
        : undefined,
      emergencyType,
      severity,
      userCondition,
      status: 'notifying',
    });

    const contactsToNotify = emergencyData.contacts.filter(contact => contact.notifyOnEmergency !== false);
    const notifiedContacts = [];
    const notificationMessage = `${req.user.name || 'A user'} triggered an SOS alert${description ? `: ${description}` : ''}`;

    await Promise.all(contactsToNotify.map(async (contact) => {
      notifiedContacts.push(contact);
      const useWhatsApp = Boolean(contact.notificationPreference?.whatsapp);
      const deliveryChannels = [{ type: 'sms', status: 'sent', sentAt: new Date() }];

      if (useWhatsApp && hasTwilioWhatsAppConfig()) {
        deliveryChannels.push({ type: 'in_app', status: 'sent', sentAt: new Date() });
      }

      await Notification.create({
        user: req.user.id,
        type: 'emergency_update',
        title: 'Emergency SOS Triggered',
        message: notificationMessage,
        priority: 'urgent',
        status: 'sent',
        sentAt: new Date(),
        channels: deliveryChannels,
        metadata: {
          source: 'sos_trigger',
          tags: ['sos', 'emergency', contact.relationship || 'other', ...(useWhatsApp ? ['whatsapp'] : [])],
        },
        content: {
          data: {
            alertId: sosAlert._id,
            contactId: contact._id,
            contactPhone: contact.phone,
            location,
            useWhatsApp,
          },
        },
      });

      if (hasTwilioConfig() || (useWhatsApp && hasTwilioWhatsAppConfig())) {
        await sendEmergencyNotification({
          phone: contact.phone,
          message: `${notificationMessage}. ${location ? `Location: https://maps.google.com/?q=${location.latitude},${location.longitude}` : 'Location sharing unavailable.'}`,
          useWhatsApp,
        });
      }
    }));

    emergencyData.emergencyHistory.push({
      type: 'sos_triggered',
      description,
      location: location ? {
        type: 'Point',
        coordinates: [location.longitude, location.latitude],
      } : undefined,
    });

    await emergencyData.save();

    sosAlert.status = 'responded';
    sosAlert.notifications = contactsToNotify.map(contact => ({
      contactId: contact._id,
      contactName: contact.name,
      contactPhone: contact.phone,
      contactRelation: contact.relationship,
      method: contact.notificationPreference?.whatsapp && hasTwilioWhatsAppConfig() ? 'whatsapp' : 'sms',
      status: 'sent',
    }));
    await sosAlert.save();

    // In production, you would additionally integrate SMS/push providers here.

    res.json({
      success: true,
      message: 'SOS alert triggered. Emergency contacts will be notified.',
      data: {
        alertId: sosAlert._id,
        contactsNotified: contactsToNotify.length,
        smsDeliveryEnabled: hasTwilioConfig(),
        whatsappDeliveryEnabled: hasTwilioWhatsAppConfig(),
        notifiedContacts: notifiedContacts.map(contact => ({
          id: contact._id,
          name: contact.name,
          phone: contact.phone,
          relationship: contact.relationship,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error triggering SOS',
      error: error.message,
    });
  }
});

// @route   POST /api/emergency/notify
// @desc    Send an emergency update to saved contacts
// @access  Private
router.post('/notify', protect, async (req, res) => {
  try {
    const { message, location } = req.body;

    const emergencyData = await EmergencyContact.findOne({ user: req.user.id });
    if (!emergencyData) {
      return res.status(404).json({
        success: false,
        message: 'Emergency contacts not set up',
      });
    }

    const contactsToNotify = emergencyData.contacts.filter(contact => contact.notifyOnEmergency !== false);

    const mapsUrl = location && typeof location.latitude === 'number' && typeof location.longitude === 'number'
      ? `https://maps.google.com/?q=${location.latitude},${location.longitude}`
      : null;
    const finalMessage = mapsUrl
      ? `${message || 'Emergency alert triggered.'} Location: ${mapsUrl}`
      : (message || 'An emergency update was sent to your emergency contact list.');

    let contactsDelivered = 0;
    let contactsPending = 0;
    const deliveryErrors = [];

    await Promise.all(contactsToNotify.map(async (contact) => {
      const useWhatsApp = Boolean(contact.notificationPreference?.whatsapp);
      const canDeliver = hasTwilioConfig() || (useWhatsApp && hasTwilioWhatsAppConfig());
      let delivered = false;

      if (canDeliver) {
        try {
          await sendEmergencyNotification({
            phone: contact.phone,
            message: finalMessage,
            useWhatsApp,
          });
          delivered = true;
        } catch (deliveryError) {
          delivered = false;
          deliveryErrors.push({
            contactId: String(contact._id),
            phone: contact.phone,
            error: deliveryError?.message || 'Delivery failed',
          });
          console.error('Emergency notification delivery failed:', deliveryError);
        }
      }

      if (delivered) {
        contactsDelivered += 1;
      } else {
        contactsPending += 1;
      }

      await Notification.create({
        user: req.user.id,
        type: 'emergency_update',
        title: 'Emergency Update',
        message: finalMessage,
        priority: 'urgent',
        status: delivered ? 'sent' : 'pending',
        sentAt: new Date(),
        channels: [{ type: useWhatsApp ? 'in_app' : 'sms', status: delivered ? 'sent' : 'pending', sentAt: new Date() }],
        content: {
          data: {
            contactId: contact._id,
            contactName: contact.name,
            contactPhone: contact.phone,
            location,
            mapsUrl,
          },
        },
        metadata: {
          source: 'emergency_notify',
          tags: ['emergency', 'contact_notification'],
        },
      });
    }));

    res.json({
      success: true,
      message: 'Emergency notifications queued',
      data: {
        contactsNotified: contactsToNotify.length,
        contactsDelivered,
        contactsPending,
        deliveryErrors,
        mapsUrl,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error sending emergency notifications',
      error: error.message,
    });
  }
});

// @route   GET /api/emergency/history
// @desc    Get emergency history
// @access  Private
router.get('/history', protect, async (req, res) => {
  try {
    const emergencyData = await EmergencyContact.findOne({ user: req.user.id });

    res.json({
      success: true,
      data: emergencyData?.emergencyHistory || [],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching emergency history',
      error: error.message,
    });
  }
});

module.exports = router;
