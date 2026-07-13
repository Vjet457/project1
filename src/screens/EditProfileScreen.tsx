import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../utils/colors';
import { wearableService } from '../services/healthConnectService';
import api from '../services/api';

const normalizeStoredUser = (rawUser: any) => {
  if (rawUser?.data && !rawUser.firstName) {
    return rawUser.data;
  }

  return rawUser;
};

const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    dob: '',
    gender: '',
    bloodGroup: '',
    height: '',
    weight: '',
  });

  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [])
  );

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      
      // Auto-fetch latest height and weight from Health Connect
      let healthConnectHeight = 0;
      let healthConnectWeight = 0;
      try {
        await wearableService.ensurePermissions(); // Ensure permissions are granted
        healthConnectHeight = await wearableService.fetchHeight();
        healthConnectWeight = await wearableService.fetchWeight();
      } catch (hcError) {
        console.warn('Could not auto-fetch from Health Connect:', hcError);
      }

      if (userData) {
        const user = normalizeStoredUser(JSON.parse(userData));
        setFormData({
          fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          email: user.email || '',
          phone: user.phoneNumber || '',
          dob: user.dateOfBirth || '',
          gender: user.gender || '',
          bloodGroup: user.bloodGroup || '',
          height: (healthConnectHeight || user.height)?.toString() || '',
          weight: (healthConnectWeight || user.weight)?.toString() || '',
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setSnackbarMessage('Error loading profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const height = parseInt(formData.height) || 0;
      const weight = parseInt(formData.weight) || 0;

      // Validate inputs
      if (!formData.fullName.trim() || !formData.email.trim()) {
        setSnackbarMessage('Name and email are required');
        setSaving(false);
        return;
      }

      // Update wearable service for BMI calculation
      wearableService.setUserProfile({
        height,
        weight,
      });

      // Get current user data
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = normalizeStoredUser(JSON.parse(userData));
        const [firstName, ...lastNameParts] = formData.fullName.split(' ');
        const lastName = lastNameParts.join(' ');

        const updatedUser = {
          ...user,
          firstName: firstName || '',
          lastName: lastName || '',
          email: formData.email,
          phoneNumber: formData.phone,
          dateOfBirth: formData.dob,
          ...(formData.gender && { gender: formData.gender }),
          ...(formData.bloodGroup && { bloodGroup: formData.bloodGroup }),
          height,
          weight,
        };

        // Save to local storage
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));

        // Try to sync with backend if available
        try {
          const backendPayload: any = {
            firstName,
            lastName,
            phoneNumber: formData.phone,
            dateOfBirth: formData.dob,
            height,
            weight,
          };
          
          // Only include optional fields if they're not empty
          if (formData.gender) {
            backendPayload.gender = formData.gender;
          }
          if (formData.bloodGroup) {
            backendPayload.bloodGroup = formData.bloodGroup;
          }

          const response = await api.put('users/profile', backendPayload);

          if (!response.success) {
            console.warn('Backend sync failed, saved locally');
          }
        } catch (backendError) {
          console.warn('Could not sync with backend:', backendError);
        }

        setSnackbarMessage('Profile updated successfully!');
        setTimeout(() => {
          navigation.goBack();
        }, 1000);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setSnackbarMessage('Error saving profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <LinearGradient
          colors={Colors.gradients.profile || ['#673AB7', '#512DA8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 16 }]}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.goBack()}
              disabled={saving}
            >
              <Icon name="arrow-left" size={24} color={'#fff'} />
            </TouchableOpacity>
            
            <Text style={styles.headerTitle}>Edit Profile</Text>
            
            <TouchableOpacity 
              style={styles.headerButton} 
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Icon name="check" size={24} color={'#fff'} />
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={formData.fullName}
              onChangeText={(text) => handleChange('fullName', text)}
              placeholder="Enter your full name"
              editable={!saving}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              keyboardType="email-address"
              onChangeText={(text) => handleChange('email', text)}
              placeholder="Enter your email"
              autoCapitalize="none"
              editable={!saving}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={formData.phone}
              keyboardType="phone-pad"
              onChangeText={(text) => handleChange('phone', text)}
              placeholder="Enter your phone number"
              editable={!saving}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date of Birth</Text>
            <TextInput
              style={styles.input}
              value={formData.dob}
              onChangeText={(text) => handleChange('dob', text)}
              placeholder="e.g., January 15, 1995"
              editable={!saving}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Gender</Text>
              <TextInput
                style={styles.input}
                value={formData.gender}
                onChangeText={(text) => handleChange('gender', text)}
                placeholder="Male/Female"
                editable={!saving}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Blood Group</Text>
              <TextInput
                style={styles.input}
                value={formData.bloodGroup}
                onChangeText={(text) => handleChange('bloodGroup', text)}
                placeholder="O+, A-, etc"
                editable={!saving}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Height (cm)</Text>
              <TextInput
                style={styles.input}
                value={formData.height}
                keyboardType="numeric"
                onChangeText={(text) => handleChange('height', text)}
                editable={!saving}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Weight (kg)</Text>
              <TextInput
                style={styles.input}
                value={formData.weight}
                keyboardType="numeric"
                onChangeText={(text) => handleChange('weight', text)}
                editable={!saving}
              />
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>

          {snackbarMessage ? (
            <View style={styles.snackbar}>
              <Text style={styles.snackbarText}>{snackbarMessage}</Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonDisabled: {
    backgroundColor: '#A5D6A7',
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  snackbar: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  snackbarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default EditProfileScreen;
