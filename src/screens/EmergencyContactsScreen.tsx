import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  Card,
  Button,
  Dialog,
  Portal,
  TextInput,
  FAB,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors } from '../styles/theme';
import { MainStackParamList } from '../types';
import { emergencyContactService } from '../services/emergencyContactService';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  relationship?: string;
}

const { width } = Dimensions.get('window');

const EmergencyContactsScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    relationship: '',
  });

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const fetchedContacts = await emergencyContactService.fetchEmergencyContacts();
      setContacts(fetchedContacts);
    } catch (error) {
      console.error('Failed to load emergency contacts:', error);
      Alert.alert('Error', 'Failed to load emergency contacts');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', phone: '', email: '', relationship: '' });
    setEditingContact(null);
  };

  const openDialog = (contact?: EmergencyContact) => {
    if (contact) {
      setEditingContact(contact);
      setFormData({
        name: contact.name,
        phone: contact.phone,
        email: contact.email || '',
        relationship: contact.relationship || '',
      });
    } else {
      resetForm();
    }
    setDialogVisible(true);
  };

  const closeDialog = () => {
    setDialogVisible(false);
    resetForm();
  };

  const handleSaveContact = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      Alert.alert('Validation Error', 'Name and phone number are required');
      return;
    }

    try {
      if (editingContact) {
        await emergencyContactService.updateEmergencyContact(editingContact.id, {
          name: formData.name,
          phone: formData.phone,
          email: formData.email || undefined,
          relationship: formData.relationship || undefined,
        });
        Alert.alert('Success', 'Emergency contact updated');
      } else {
        await emergencyContactService.saveEmergencyContact({
          id: Date.now().toString(),
          name: formData.name,
          phone: formData.phone,
          email: formData.email || undefined,
          relationship: formData.relationship || undefined,
        });
        Alert.alert('Success', 'Emergency contact added');
      }
      closeDialog();
      await loadContacts();
    } catch (error) {
      console.error('Failed to save contact:', error);
      Alert.alert('Error', 'Failed to save emergency contact');
    }
  };

  const handleDeleteContact = (contactId: string, contactName: string) => {
    Alert.alert(
      'Delete Contact',
      `Are you sure you want to delete ${contactName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await emergencyContactService.deleteEmergencyContact(contactId);
              Alert.alert('Success', 'Emergency contact deleted');
              await loadContacts();
            } catch (error) {
              console.error('Failed to delete contact:', error);
              Alert.alert('Error', 'Failed to delete emergency contact');
            }
          },
        },
      ]
    );
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (index: number): string => {
    const colors_array = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4'];
    return colors_array[index % colors_array.length];
  };

  const contactIcons = ['🏥', '👨‍👩‍👧', '👩‍⚕️', '🚑', '👨‍⚕️', '📱'];

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={28} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Emergency Contacts</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Info Card */}
        <Card style={styles.infoCard}>
          <Card.Content style={styles.infoContent}>
            <Icon name="information" size={24} color={colors.primary} />
            <Text style={styles.infoText}>
              Add trusted contacts who will be notified with your real-time location during emergencies.
            </Text>
          </Card.Content>
        </Card>

        {/* Contacts List */}
        {contacts.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="account-multiple-plus" size={64} color={colors.outlineVariant} />
            <Text style={styles.emptyText}>No emergency contacts added yet</Text>
            <Text style={styles.emptySubtext}>
              Add contacts who will receive emergency alerts with your location
            </Text>
          </View>
        ) : (
          <View style={styles.contactsList}>
            {contacts.map((contact, index) => (
              <Card key={contact.id} style={styles.contactCard}>
                <Card.Content style={styles.contactContent}>
                  <View style={[styles.avatar, { backgroundColor: getAvatarColor(index) }]}>
                    <Text style={styles.avatarText}>{getInitials(contact.name)}</Text>
                    <Text style={styles.avatarIcon}>{contactIcons[index]}</Text>
                  </View>

                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    {contact.relationship && (
                      <Text style={styles.relationship}>{contact.relationship}</Text>
                    )}
                    <View style={styles.contactDetails}>
                      <Icon name="phone" size={14} color={colors.secondary} />
                      <Text style={styles.phoneText}>{contact.phone}</Text>
                    </View>
                    {contact.email && (
                      <View style={styles.contactDetails}>
                        <Icon name="email" size={14} color={colors.tertiary} />
                        <Text style={styles.emailText}>{contact.email}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => openDialog(contact)}
                    >
                      <Icon name="pencil" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDeleteContact(contact.id, contact.name)}
                    >
                      <Icon name="delete" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </Card.Content>
              </Card>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Contact FAB */}
      <FAB
        icon="plus"
        style={styles.fab}
        color="white"
        onPress={() => openDialog()}
      />

      {/* Add/Edit Contact Dialog */}
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={closeDialog} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>
            {editingContact ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
          </Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            <TextInput
              label="Name *"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              mode="outlined"
              style={styles.input}
              placeholder="Enter contact name"
            />
            <TextInput
              label="Phone Number *"
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              mode="outlined"
              style={styles.input}
              placeholder="+1 (555) 123-4567"
              keyboardType="phone-pad"
            />
            <TextInput
              label="Email (Optional)"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              mode="outlined"
              style={styles.input}
              placeholder="email@example.com"
              keyboardType="email-address"
            />
            <TextInput
              label="Relationship (Optional)"
              value={formData.relationship}
              onChangeText={(text) => setFormData({ ...formData, relationship: text })}
              mode="outlined"
              style={styles.input}
              placeholder="e.g., Mother, Doctor, Friend"
            />
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button onPress={closeDialog} textColor={colors.primary}>
              Cancel
            </Button>
            <Button
              onPress={handleSaveContact}
              mode="contained"
              buttonColor={colors.primary}
            >
              {editingContact ? 'Update' : 'Add'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.onSurface,
  },
  infoCard: {
    margin: 16,
    backgroundColor: colors.primaryContainer,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.onSurface,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 8,
    paddingHorizontal: 32,
    textAlign: 'center',
  },
  contactsList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  contactCard: {
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  contactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  avatarIcon: {
    fontSize: 24,
    position: 'absolute',
    bottom: -4,
    right: -4,
  },
  contactInfo: {
    flex: 1,
    gap: 4,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
  },
  relationship: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  contactDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  phoneText: {
    fontSize: 12,
    color: colors.secondary,
    fontWeight: '500',
  },
  emailText: {
    fontSize: 12,
    color: colors.tertiary,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: colors.errorContainer,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: colors.primary,
  },
  dialog: {
    backgroundColor: colors.surface,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
  },
  dialogContent: {
    gap: 12,
  },
  input: {
    marginBottom: 8,
    backgroundColor: colors.background,
  },
  dialogActions: {
    justifyContent: 'flex-end',
    gap: 8,
    paddingRight: 8,
  },
});

export default EmergencyContactsScreen;
