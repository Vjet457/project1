// Emergency Service
import { Linking, Platform } from 'react-native';
import api from './api';

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phoneNumber: string;
  isPrimary: boolean;
}

export interface Hospital {
  id: string;
  name: string;
  type: 'government' | 'private' | 'clinic';
  address: string;
  city: string;
  pincode: string;
  latitude: number;
  longitude: number;
  distance?: number;
  phoneNumber: string;
  emergencyNumber?: string;
  hasAmbulance: boolean;
  has24x7: boolean;
  specialties: string[];
  rating?: number;
}

export interface AmbulanceService {
  id: string;
  name: string;
  phoneNumber: string;
  type: 'basic' | 'advanced' | 'air';
  isGovernment: boolean;
  estimatedArrival?: number; // minutes
  rating?: number;
}

export interface EmergencyAlert {
  id: string;
  userId: string;
  type: 'medical' | 'accident' | 'cardiac' | 'other';
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  status: 'active' | 'resolved' | 'cancelled';
  contactsNotified: string[];
  smsDeliveryEnabled?: boolean;
  whatsappDeliveryEnabled?: boolean;
  nearestHospital?: Hospital;
  ambulanceDispatched?: boolean;
  createdAt: string;
  resolvedAt?: string;
}

export interface SOSMessage {
  location?: {
    latitude: number;
    longitude: number;
  };
  medicalInfo?: {
    bloodType?: string;
    allergies?: string[];
    conditions?: string[];
    medications?: string[];
  };
  emergencyType: string;
}

class EmergencyService {
  private readonly EMERGENCY_NUMBERS = {
    ambulance: '102',
    police: '100',
    fire: '101',
    nationalEmergency: '112',
    women: '1091',
    childHelpline: '1098',
  };

  // Make emergency call
  async makeEmergencyCall(type: keyof typeof this.EMERGENCY_NUMBERS): Promise<void> {
    const number = this.EMERGENCY_NUMBERS[type];
    const url = Platform.OS === 'ios' ? `tel:${number}` : `tel:${number}`;
    
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Emergency call error:', error);
      throw new Error('Unable to make call');
    }
  }

  // Call custom number
  async callNumber(phoneNumber: string): Promise<void> {
    const url = Platform.OS === 'ios' ? `tel:${phoneNumber}` : `tel:${phoneNumber}`;
    
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Call error:', error);
      throw new Error('Unable to make call');
    }
  }

  // Trigger SOS alert
  async triggerSOS(message: SOSMessage): Promise<{ success: boolean; alert?: EmergencyAlert; error?: string }> {
    try {
      const response = await api.post<{
        success?: boolean;
        data?: {
          alertId?: string;
          contactsNotified?: number;
          smsDeliveryEnabled?: boolean;
          whatsappDeliveryEnabled?: boolean;
          notifiedContacts?: Array<{ id: string; name: string; phone: string; relationship: string }>;
        };
        alertId?: string;
        contactsNotified?: number;
        smsDeliveryEnabled?: boolean;
        whatsappDeliveryEnabled?: boolean;
        notifiedContacts?: Array<{ id: string; name: string; phone: string; relationship: string }>;
      }>('/emergency/trigger-sos', message);

      const payload = response.data?.data || response.data;
      return {
        success: response.success,
        alert: payload
          ? {
              id: payload.alertId || '',
              userId: '',
              type: message.emergencyType as any,
              location: message.location,
              status: 'active',
              contactsNotified: (payload.notifiedContacts || []).map(contact => contact.id),
              smsDeliveryEnabled: payload.smsDeliveryEnabled,
              whatsappDeliveryEnabled: payload.whatsappDeliveryEnabled,
              createdAt: new Date().toISOString(),
            }
          : undefined,
        error: response.error,
      };
    } catch (error) {
      console.error('SOS trigger error:', error);
      return { success: false, error: 'Failed to trigger SOS alert' };
    }
  }

  // Cancel SOS alert
  async cancelSOS(alertId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.patch(`/emergency/sos/${alertId}/cancel`, {});
      return { success: response.success, error: response.error };
    } catch (error) {
      console.error('SOS cancel error:', error);
      return { success: false, error: 'Failed to cancel SOS alert' };
    }
  }

  // Get nearby hospitals
  async getNearbyHospitals(
    latitude: number,
    longitude: number,
    maxDistance: number = 10
  ): Promise<{ success: boolean; data?: Hospital[]; error?: string }> {
    try {
      const response = await api.get<Hospital[]>(
        `/emergency/hospitals?latitude=${latitude}&longitude=${longitude}&maxDistance=${maxDistance}`
      );
      return { success: response.success, data: response.data, error: response.error };
    } catch (error) {
      console.error('Get hospitals error:', error);
      return { success: false, error: 'Failed to fetch nearby hospitals' };
    }
  }

  // Get ambulance services
  async getAmbulanceServices(
    latitude: number,
    longitude: number
  ): Promise<{ success: boolean; data?: AmbulanceService[]; error?: string }> {
    try {
      const response = await api.get<AmbulanceService[]>(
        `/emergency/ambulances?latitude=${latitude}&longitude=${longitude}`
      );
      return { success: response.success, data: response.data, error: response.error };
    } catch (error) {
      console.error('Get ambulances error:', error);
      return { success: false, error: 'Failed to fetch ambulance services' };
    }
  }

  // Manage emergency contacts
  async getEmergencyContacts(): Promise<{ success: boolean; data?: EmergencyContact[]; error?: string }> {
    try {
      const response = await api.get<{ success: boolean; data: { contacts?: Array<{ _id?: string; id?: string; name: string; relationship: string; phone?: string; phoneNumber?: string; isPrimary?: boolean }> } }>('/emergency/contacts');
      const contactsArr = response.data?.data?.contacts || response.data?.contacts;
      const contacts = (contactsArr || []).map(contact => ({
        id: contact._id || contact.id || '',
        name: contact.name,
        relationship: contact.relationship,
        phoneNumber: contact.phone || contact.phoneNumber || '',
        isPrimary: Boolean(contact.isPrimary),
      }));
      return { success: response.success, data: contacts, error: response.error };
    } catch (error) {
      console.error('Get emergency contacts error:', error);
      return { success: false, error: 'Failed to fetch emergency contacts' };
    }
  }

  async addEmergencyContact(
    contact: Omit<EmergencyContact, 'id'>
  ): Promise<{ success: boolean; data?: EmergencyContact; error?: string }> {
    try {
      const response = await api.post('/emergency/contacts', {
        name: contact.name,
        relationship: contact.relationship,
        phone: contact.phoneNumber,
        isPrimary: contact.isPrimary,
        notifyOnEmergency: true,
      });
      return { success: response.success, data: response.data, error: response.error };
    } catch (error) {
      console.error('Add emergency contact error:', error);
      return { success: false, error: 'Failed to add emergency contact' };
    }
  }

  async updateEmergencyContact(
    id: string,
    contact: Partial<EmergencyContact>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.put(`/emergency/contacts/${id}`, {
        name: contact.name,
        relationship: contact.relationship,
        phone: contact.phoneNumber,
        isPrimary: contact.isPrimary,
        notifyOnEmergency: true,
      });
      return { success: response.success, error: response.error };
    } catch (error) {
      console.error('Update emergency contact error:', error);
      return { success: false, error: 'Failed to update emergency contact' };
    }
  }

  async deleteEmergencyContact(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.delete(`/emergency/contacts/${id}`);
      return { success: response.success, error: response.error };
    } catch (error) {
      console.error('Delete emergency contact error:', error);
      return { success: false, error: 'Failed to delete emergency contact' };
    }
  }

  // Notify emergency contacts
  async notifyContacts(
    message: string,
    location?: { latitude: number; longitude: number }
  ): Promise<{ success: boolean; notified?: number; error?: string }> {
    try {
      const response = await api.post<{ contactsNotified: number }>('/emergency/notify', {
        message,
        location,
      });
      return { success: response.success, notified: response.data?.contactsNotified, error: response.error };
    } catch (error) {
      console.error('Notify contacts error:', error);
      return { success: false, error: 'Failed to notify emergency contacts' };
    }
  }

  // Get emergency numbers
  getEmergencyNumbers(): typeof this.EMERGENCY_NUMBERS {
    return { ...this.EMERGENCY_NUMBERS };
  }

  // Share location via SMS
  async shareLocationViaSMS(
    phoneNumber: string,
    latitude: number,
    longitude: number
  ): Promise<void> {
    const message = `Emergency! I need help. My location: https://maps.google.com/?q=${latitude},${longitude}`;
    const url = Platform.OS === 'ios'
      ? `sms:${phoneNumber}&body=${encodeURIComponent(message)}`
      : `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;

    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Share location error:', error);
      throw new Error('Unable to share location');
    }
  }

  // Open one SMS composer addressed to multiple contacts with live location.
  async shareLocationViaSMSBulk(
    phoneNumbers: string[],
    latitude: number,
    longitude: number
  ): Promise<void> {
    const normalized = Array.from(new Set(
      phoneNumbers
        .map((phone) => phone.replace(/[^+\d]/g, ''))
        .filter(Boolean)
    ));

    if (normalized.length === 0) {
      throw new Error('No valid contact numbers available');
    }

    const recipients = normalized.join(',');
    const message = `Emergency! I need help. My live location: https://maps.google.com/?q=${latitude},${longitude}`;
    const url = Platform.OS === 'ios'
      ? `sms:${recipients}&body=${encodeURIComponent(message)}`
      : `sms:${recipients}?body=${encodeURIComponent(message)}`;

    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Bulk share location error:', error);
      throw new Error('Unable to open SMS app for emergency contacts');
    }
  }
}

export const emergencyService = new EmergencyService();
export default emergencyService;
