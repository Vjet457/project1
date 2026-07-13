import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Linking,
  Vibration,
  Platform,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  IconButton,
  Avatar,
  Portal,
  Modal,
  TextInput,
  Divider,
  Snackbar,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors } from '../styles/theme';
import { MainStackParamList } from '../types';
import { emergencyService } from '../services/emergencyService';
import { geolocationService } from '../services/geolocationService';
import { emergencyContactService } from '../services/emergencyContactService';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

const RELATIONSHIP_OPTIONS = [
  { label: 'Spouse', value: 'spouse' },
  { label: 'Parent', value: 'parent' },
  { label: 'Sibling', value: 'sibling' },
  { label: 'Child', value: 'child' },
  { label: 'Friend', value: 'friend' },
  { label: 'Doctor', value: 'doctor' },
  { label: 'Other', value: 'other' },
];

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation: string;
  isPrimary: boolean;
}

const emergencyServices = [
  { id: 1, name: 'Ambulance', number: '108', icon: 'local-hospital', color: '#F44336' },
  { id: 2, name: 'Police', number: '100', icon: 'local-police', color: '#2196F3' },
  { id: 3, name: 'Fire', number: '101', icon: 'local-fire-department', color: '#FF9800' },
  { id: 4, name: 'Women Helpline', number: '1091', icon: 'support-agent', color: '#E91E63' },
];

const EmergencyScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { user } = useAuth();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [sosActive, setSosActive] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(5);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '', relation: 'other' });
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const loadContacts = async () => {
    const result = await emergencyService.getEmergencyContacts();
    if (result.success && result.data) {
      setContacts(result.data.map((contact, index) => ({
        id: contact.id || String(index + 1),
        name: contact.name,
        phone: contact.phoneNumber,
        relation: contact.relationship,
        isPrimary: contact.isPrimary,
      })));
    } else if (!result.success) {
      setSnackbarMessage(result.error || 'Failed to load contacts');
      setSnackbarVisible(true);
    }
  };

  useEffect(() => {
    void loadContacts();
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (sosActive && sosCountdown > 0) {
      interval = setInterval(() => {
        setSosCountdown(prev => prev - 1);
        Vibration.vibrate(500);
      }, 1000);
    } else if (sosActive && sosCountdown === 0) {
      triggerSOS();
    }
    return () => clearInterval(interval);
  }, [sosActive, sosCountdown]);

  const triggerSOS = async () => {
    setSosActive(false);
    setSosCountdown(5);

    // Get real GPS location
    let locationCoords: { latitude: number; longitude: number } | undefined;
    let mapsUrl = '';
    let locationDelivered = false;
    try {
      const hasPermission = await geolocationService.requestLocationPermission();
      if (hasPermission) {
        const loc = await geolocationService.getCurrentLocation();
        locationCoords = { latitude: loc.latitude, longitude: loc.longitude };
        mapsUrl = `https://maps.google.com/?q=${loc.latitude},${loc.longitude}`;

        // Notify emergency contacts with location
        const userName = user ? `${user.firstName} ${user.lastName}`.trim() || user.email : 'A user';
        const notifications = await emergencyContactService.sendEmergencyAlert(
          loc,
          mapsUrl,
          userName,
          0 // SOS triggered manually
        );
        locationDelivered = notifications.some(notification => notification.status === 'sent');
      }
    } catch (locErr) {
      console.warn('Could not get location for SOS:', locErr);
    }

    const result = await emergencyService.triggerSOS({
      emergencyType: 'medical',
      location: locationCoords,
      medicalInfo: {},
    });

    // If backend SMS/WhatsApp providers are not configured, open device SMS composer
    // with live location so user can send directly to all emergency contacts.
    if (
      locationCoords &&
      result.success &&
      result.alert &&
      !result.alert.smsDeliveryEnabled &&
      !result.alert.whatsappDeliveryEnabled
    ) {
      try {
        await emergencyService.shareLocationViaSMSBulk(
          contacts.map(contact => contact.phone),
          locationCoords.latitude,
          locationCoords.longitude
        );
        locationDelivered = true;
      } catch (smsFallbackError) {
        console.warn('SMS fallback failed:', smsFallbackError);
      }
    }

    // Let user decide whether to call ambulance immediately.
    Alert.alert(
      'Call Ambulance',
      'Do you want to call 108 now?',
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Call 108',
          onPress: () => {
            void Linking.openURL('tel:108');
          },
        },
      ]
    );

    if (result.success) {
      const contactsNotified = result.alert?.contactsNotified?.length || contacts.length;
      setSnackbarMessage(
        contactsNotified > 0
          ? `Emergency alert sent to ${contactsNotified} contacts${locationDelivered ? ' with your location' : ''}`
          : (locationDelivered ? 'Location shared with emergency contacts' : 'Emergency alert sent')
      );
    } else {
      setSnackbarMessage(result.error || 'Unable to send emergency alert');
    }
    setSnackbarVisible(true);
  };

  const handleSOSPress = () => {
    if (sosActive) {
      setSosActive(false);
      setSosCountdown(5);
      setSnackbarMessage('SOS cancelled');
      setSnackbarVisible(true);
    } else {
      setSosActive(true);
      Vibration.vibrate([0, 200, 100, 200]);
    }
  };

  const handleCallEmergency = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  const handleCallContact = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
  };

  const handleAddContact = () => {
    if (!newContact.name.trim()) {
      setSnackbarMessage('Please enter a name');
      setSnackbarVisible(true);
      return;
    }
    const sanitizedPhone = newContact.phone.replace(/[^+\d]/g, '');
    if (!sanitizedPhone) {
      setSnackbarMessage('Please enter a phone number');
      setSnackbarVisible(true);
      return;
    }
    if (sanitizedPhone.replace(/\D/g, '').length < 10) {
      Alert.alert('Invalid Phone Number', 'Please enter at least 10 digits.');
      return;
    }

    void (async () => {
      const response = await emergencyService.addEmergencyContact({
        name: newContact.name.trim(),
        relationship: newContact.relation as any,
        phoneNumber: sanitizedPhone,
        isPrimary: contacts.length === 0,
      });

      if (response.success) {
        await loadContacts();
        setNewContact({ name: '', phone: '', relation: 'other' });
        setShowAddContact(false);
        setSnackbarMessage('Contact added successfully');
      } else {
        Alert.alert('Error', response.error || 'Failed to add contact. Check all fields and try again.');
      }
      if (response.success) {
        setSnackbarVisible(true);
      }
    })();
  };

  const handleRemoveContact = (id: string) => {
    void (async () => {
      const response = await emergencyService.deleteEmergencyContact(id);
      if (response.success) {
        setContacts(contacts.filter(c => c.id !== id));
        setSnackbarMessage('Contact removed');
      } else {
        setSnackbarMessage(response.error || 'Failed to remove contact');
      }
      setSnackbarVisible(true);
    })();
  };

  const handleSetPrimary = (id: string) => {
    void (async () => {
      const response = await emergencyService.updateEmergencyContact(id, { isPrimary: true });
      if (response.success) {
        setContacts(contacts.map(c => ({
          ...c,
          isPrimary: c.id === id,
        })));
        setSnackbarMessage('Primary contact updated');
      } else {
        setSnackbarMessage(response.error || 'Failed to update primary contact');
      }
      setSnackbarVisible(true);
    })();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={colors.gradients.emergency} style={styles.header}>
        <View style={styles.headerContent}>
          <IconButton
            icon="arrow-left"
            iconColor="white"
            size={24}
            onPress={() => navigation.goBack()}
          />
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Emergency</Text>
            <Text style={styles.headerSubtitle}>Quick access to emergency services</Text>
          </View>
          <IconButton
            icon="settings"
            iconColor="white"
            size={24}
            onPress={() => setShowAddContact(true)}
          />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* SOS Button */}
        <View style={styles.sosContainer}>
          <TouchableOpacity
            style={[styles.sosButton, sosActive && styles.sosButtonActive]}
            onPress={handleSOSPress}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={sosActive ? ['#FF0000', '#CC0000'] : ['#FF5252', '#D32F2F']}
              style={styles.sosGradient}
            >
              {sosActive ? (
                <>
                  <Text style={styles.sosCountdown}>{sosCountdown}</Text>
                  <Text style={styles.sosActiveText}>Tap to Cancel</Text>
                </>
              ) : (
                <>
                  <Icon name="warning" size={48} color="white" />
                  <Text style={styles.sosText}>SOS</Text>
                  <Text style={styles.sosSubtext}>Hold for Emergency</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
          {sosActive && (
            <Text style={styles.sosWarning}>
              Emergency services will be contacted in {sosCountdown} seconds
            </Text>
          )}
        </View>

        {/* Emergency Services */}
        <Text style={styles.sectionTitle}>Emergency Services</Text>
        <View style={styles.servicesGrid}>
          {emergencyServices.map((service) => (
            <TouchableOpacity
              key={service.id}
              style={[styles.serviceCard, { backgroundColor: service.color + '15' }]}
              onPress={() => handleCallEmergency(service.number)}
              activeOpacity={0.8}
            >
              <View style={[styles.serviceIcon, { backgroundColor: service.color }]}>
                <Icon name={service.icon} size={24} color="white" />
              </View>
              <Text style={[styles.serviceName, { color: service.color }]}>{service.name}</Text>
              <Text style={styles.serviceNumber}>{service.number}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Find Doctor Card */}
        <Card style={styles.findDoctorCard} mode="elevated">
          <TouchableOpacity
            onPress={() => navigation.navigate('DoctorFinder')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#2196F3', '#1976D2']}
              style={styles.findDoctorGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.findDoctorContent}>
                <View style={styles.findDoctorIcon}>
                  <Icon name="local-hospital" size={32} color="white" />
                </View>
                <View style={styles.findDoctorText}>
                  <Text style={styles.findDoctorTitle}>Find Nearby Doctors</Text>
                  <Text style={styles.findDoctorSubtitle}>
                    Locate hospitals, clinics & specialists near you
                  </Text>
                </View>
                <Icon name="chevron-right" size={28} color="white" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Card>

        {/* Emergency Contacts */}
        <View style={styles.contactsHeader}>
          <Text style={styles.sectionTitle}>Emergency Contacts</Text>
          <Button
            mode="outlined"
            icon="plus"
            onPress={() => setShowAddContact(true)}
            compact
          >
            Add
          </Button>
        </View>

        {contacts.map((contact) => (
          <Card key={contact.id} style={styles.contactCard}>
            <Card.Content style={styles.contactContent}>
              <Avatar.Text
                size={50}
                label={contact.name.substring(0, 2).toUpperCase()}
                style={[styles.contactAvatar, contact.isPrimary && styles.primaryAvatar]}
              />
              <View style={styles.contactInfo}>
                <View style={styles.contactNameRow}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  {contact.isPrimary && (
                    <Icon name="star" size={16} color="#8f2a2aae" style={{ marginLeft: 4 }} />
                  )}
                </View>
                <Text style={styles.contactRelation}>{contact.relation}</Text>
                <Text style={styles.contactPhone}>{contact.phone}</Text>
              </View>
              <View style={styles.contactActions}>
                <IconButton
                  icon="phone"
                  size={24}
                  iconColor={colors.success}
                  onPress={() => handleCallContact(contact.phone)}
                />
                <IconButton
                  icon="star-outline"
                  size={20}
                  iconColor={contact.isPrimary ? '#FFD700' : colors.outline}
                  onPress={() => handleSetPrimary(contact.id)}
                />
              </View>
            </Card.Content>
          </Card>
        ))}

        {/* Safety Tips */}
        <Card style={styles.tipsCard}>
          <Card.Content>
            <Text style={styles.tipsTitle}>⚠️ Safety Tips</Text>
            <Divider style={{ marginVertical: 8 }} />
            <Text style={styles.tipItem}>• Stay calm during emergencies</Text>
            <Text style={styles.tipItem}>• Share your live location with trusted contacts</Text>
            <Text style={styles.tipItem}>• Keep emergency numbers saved offline</Text>
            <Text style={styles.tipItem}>• Know your nearest hospital location</Text>
          </Card.Content>
        </Card>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Contact Modal */}
      <Portal>
        <Modal
          visible={showAddContact}
          onDismiss={() => setShowAddContact(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Text style={styles.modalTitle}>Add Emergency Contact</Text>
          
          <TextInput
            mode="outlined"
            label="Name"
            value={newContact.name}
            onChangeText={(text: string) => setNewContact({ ...newContact, name: text })}
            style={styles.input}
          />
          
          <TextInput
            mode="outlined"
            label="Phone Number"
            value={newContact.phone}
            onChangeText={(text: string) => setNewContact({ ...newContact, phone: text })}
            keyboardType="phone-pad"
            style={styles.input}
          />

          <Text style={[styles.modalTitle, { fontSize: 14, marginBottom: 8 }]}>Relationship</Text>
          <View style={styles.relationshipRow}>
            {RELATIONSHIP_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.relationChip,
                  newContact.relation === opt.value && styles.relationChipActive,
                ]}
                onPress={() => setNewContact({ ...newContact, relation: opt.value })}
              >
                <Text style={[
                  styles.relationChipText,
                  newContact.relation === opt.value && styles.relationChipTextActive,
                ]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => setShowAddContact(false)}
              style={styles.modalButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleAddContact}
              style={styles.modalButton}
            >
              Add Contact
            </Button>
          </View>
        </Modal>

        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={2000}
        >
          {snackbarMessage}
        </Snackbar>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sosContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  sosButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#FF0000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  sosButtonActive: {
    transform: [{ scale: 1.05 }],
  },
  sosGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosText: {
    fontSize: 32,
    fontWeight: '900',
    color: 'white',
    marginTop: 8,
  },
  sosSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  sosCountdown: {
    fontSize: 64,
    fontWeight: '900',
    color: 'white',
  },
  sosActiveText: {
    fontSize: 14,
    color: 'white',
    marginTop: 4,
  },
  sosWarning: {
    marginTop: 16,
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1B1F',
    marginBottom: 12,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  serviceCard: {
    width: (width - 44) / 2,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
  },
  serviceNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.onSurface,
    marginTop: 4,
  },
  contactsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactCard: {
    borderRadius: 16,
    marginBottom: 12,
  },
  contactContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactAvatar: {
    backgroundColor: colors.primary,
  },
  primaryAvatar: {
    backgroundColor: colors.secondary,
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contactNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  contactRelation: {
    fontSize: 12,
    color: '#49454F',
    marginTop: 2,
  },
  contactPhone: {
    fontSize: 14,
    color: '#0066CC',
    marginTop: 2,
    fontWeight: '500',
  },
  contactActions: {
    flexDirection: 'row',
  },
  tipsCard: {
    borderRadius: 16,
    marginTop: 12,
    backgroundColor: '#FFF3E0',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1B1F',
  },
  tipItem: {
    fontSize: 14,
    color: '#49454F',
    lineHeight: 24,
    fontWeight: '500',
  },
  modalContainer: {
    backgroundColor: colors.surface,
    margin: 20,
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1B1F',
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
    backgroundColor: colors.surface,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 12,
  },
  modalButton: {
    borderRadius: 8,
  },
  relationshipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  relationChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#F5F5F5',
    marginRight: 6,
    marginBottom: 6,
  },
  relationChipActive: {
    backgroundColor: '#FFEBEE',
    borderColor: '#E53935',
  },
  relationChipText: {
    fontSize: 13,
    color: '#555',
  },
  relationChipTextActive: {
    color: '#C62828',
    fontWeight: '700',
  },
  findDoctorCard: {
    borderRadius: 16,
    marginTop: 16,
    marginBottom: 8,
    overflow: 'hidden',
    elevation: 4,
  },
  findDoctorGradient: {
    padding: 16,
  },
  findDoctorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  findDoctorIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  findDoctorText: {
    flex: 1,
    marginLeft: 16,
  },
  findDoctorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  findDoctorSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
});

export default EmergencyScreen;
