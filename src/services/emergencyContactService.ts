import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

// alias so the rest of the file is unchanged
const apiClient = api;

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  relationship?: string;
}

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface EmergencyNotification {
  contactId: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  message: string;
  location: LocationData;
  mapsUrl: string;
  sentAt: string;
  status: 'pending' | 'sent' | 'failed';
}

class EmergencyContactService {
  private emergencyContacts: EmergencyContact[] = [];

  async fetchEmergencyContacts(): Promise<EmergencyContact[]> {
    try {
      // First, try to get from backend
      const response = await apiClient.get<{ success: boolean; data?: { contacts?: Array<{ _id?: string; id?: string; name: string; phone?: string; phoneNumber?: string; email?: string; relationship?: string }> } }>(`/emergency/contacts`);
      
      const contacts = response.data?.data?.contacts || [];
      if (contacts.length > 0) {
        this.emergencyContacts = contacts.map((contact) => ({
          id: contact._id || contact.id || '',
          name: contact.name,
          phone: contact.phone || contact.phoneNumber || '',
          email: contact.email,
          relationship: contact.relationship,
        }));
        // Cache locally
        await AsyncStorage.setItem(
          'emergencyContacts',
          JSON.stringify(this.emergencyContacts)
        );
        return this.emergencyContacts;
      }
    } catch (error) {
      console.log('Failed to fetch emergency contacts from backend, using cached:', error);
    }

    // Fallback to local storage
    try {
      const cached = await AsyncStorage.getItem('emergencyContacts');
      if (cached) {
        this.emergencyContacts = JSON.parse(cached);
        return this.emergencyContacts;
      }
    } catch (error) {
      console.error('Failed to fetch cached emergency contacts:', error);
    }

    return [];
  }

  async saveEmergencyContact(contact: EmergencyContact): Promise<void> {
    try {
      // Save to backend
      await apiClient.post(`/emergency/contacts`, {
        name: contact.name,
        relationship: contact.relationship || 'other',
        phone: contact.phone,
        email: contact.email,
        isPrimary: false,
        notifyOnEmergency: true,
      });
      
      // Update local cache
      this.emergencyContacts.push(contact);
      await AsyncStorage.setItem(
        'emergencyContacts',
        JSON.stringify(this.emergencyContacts)
      );
    } catch (error) {
      console.error('Failed to save emergency contact:', error);
      throw error;
    }
  }

  async updateEmergencyContact(contactId: string, updates: Partial<EmergencyContact>): Promise<void> {
    try {
      // Update on backend
      await apiClient.put(`/emergency/contacts/${contactId}`, {
        name: updates.name,
        relationship: updates.relationship,
        phone: updates.phone,
        email: updates.email,
      });
      
      // Update local cache
      this.emergencyContacts = this.emergencyContacts.map(c =>
        c.id === contactId ? { ...c, ...updates } : c
      );
      await AsyncStorage.setItem(
        'emergencyContacts',
        JSON.stringify(this.emergencyContacts)
      );
    } catch (error) {
      console.error('Failed to update emergency contact:', error);
      throw error;
    }
  }

  async deleteEmergencyContact(contactId: string): Promise<void> {
    try {
      // Delete from backend
      await apiClient.delete(`/emergency/contacts/${contactId}`);
      
      // Update local cache
      this.emergencyContacts = this.emergencyContacts.filter(c => c.id !== contactId);
      await AsyncStorage.setItem(
        'emergencyContacts',
        JSON.stringify(this.emergencyContacts)
      );
    } catch (error) {
      console.error('Failed to delete emergency contact:', error);
      throw error;
    }
  }

  async sendEmergencyAlert(
    location: LocationData,
    mapsUrl: string,
    userName: string,
    healthScore: number
  ): Promise<EmergencyNotification[]> {
    const contacts = await this.fetchEmergencyContacts();
    const notifications: EmergencyNotification[] = [];

    if (contacts.length === 0) {
      console.warn('No emergency contacts found');
      return notifications;
    }

    const timestamp = new Date().toISOString();
    const locationString = `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;

    const message = `EMERGENCY ALERT: ${userName} has triggered an emergency alert with a critical health score of ${healthScore}/100. Location: ${locationString}. Maps: ${mapsUrl}`;
    let deliveredCount = 0;

    try {
      // Backend route fans out to all saved emergency contacts.
      const response = await apiClient.post<{ data?: { contactsDelivered?: number } }>(`/emergency/notify`, {
        message,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
      });
      deliveredCount = Number(response.data?.data?.contactsDelivered || 0);
    } catch (error) {
      console.error('Failed to send emergency alert broadcast:', error);
    }

    for (const contact of contacts) {

      const notification: EmergencyNotification = {
        contactId: contact.id,
        contactName: contact.name,
        contactPhone: contact.phone,
        contactEmail: contact.email,
        message,
        location,
        mapsUrl,
        sentAt: timestamp,
        status: 'pending',
      };

      notification.status = deliveredCount > 0 ? 'sent' : 'failed';
      console.log(`Emergency alert queued for ${contact.name}`);

      notifications.push(notification);
    }

    // Log emergency incident
    await this.logEmergencyIncident(userName, location, healthScore, notifications);

    return notifications;
  }

  async sendEmergencyCancellation(userName: string): Promise<void> {
    const contacts = await this.fetchEmergencyContacts();
    const timestamp = new Date().toISOString();

    const message = `ALERT CANCELLED: ${userName} has cancelled the emergency alert at ${timestamp}.`;

    try {
      await apiClient.post(`/emergency/notify`, {
        message,
      });

      for (const contact of contacts) {
        console.log(`Cancellation notice queued for ${contact.name}`);
      }
    } catch (error) {
      console.error('Failed to send cancellation notice broadcast:', error);
    }
  }

  private async logEmergencyIncident(
    userName: string,
    location: LocationData,
    healthScore: number,
    notifications: EmergencyNotification[]
  ): Promise<void> {
    try {
      // No dedicated incident log route in backend; keep console-only fallback.
      console.log('Emergency incident log', {
        userName,
        location,
        healthScore,
        notificationsCount: notifications.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log emergency incident:', error);
    }
  }

  getContacts(): EmergencyContact[] {
    return this.emergencyContacts;
  }
}

export const emergencyContactService = new EmergencyContactService();
