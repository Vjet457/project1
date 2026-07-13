import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../utils/colors';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { useAuth } from '../context/AuthContext';
import { wearableService } from '../services/healthConnectService';
import { emergencyContactService } from '../services/emergencyContactService';
import api from '../services/api';

interface PersonalEmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship?: string;
}

interface MedicalRecord {
  _id?: string;
  id?: string | number;
  title: string;
  date: string;
  doctor: string;
  type: string;
  notes?: string;
}

interface MedicalRecordsApiResponse {
  success: boolean;
  count: number;
  data: MedicalRecord[];
}

const MEDICAL_RECORDS_CACHE_KEY = 'medicalRecords';

const normalizeStoredUser = (rawUser: any) => {
  if (rawUser?.data && !rawUser.firstName) {
    return rawUser.data;
  }

  return rawUser;
};

const computeBMI = (height?: number, weight?: number): number | null => {
  if (!height || !weight || height <= 0 || weight <= 0) {
    return null;
  }

  const heightInMeters = height / 100;
  const bmi = weight / (heightInMeters * heightInMeters);
  return Math.round(bmi * 10) / 10;
};

const PersonalInfoScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();
  const [latestUserData, setLatestUserData] = useState<any | null>(null);
  const [emergencyContacts, setEmergencyContacts] = useState<PersonalEmergencyContact[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      const loadLatestUserData = async () => {
        try {
          const storedUserData = await AsyncStorage.getItem('userData');
          const parsedUserData = storedUserData ? JSON.parse(storedUserData) : null;
          let resolvedUser = normalizeStoredUser(parsedUserData) || {};

          const healthConnectConnected = await AsyncStorage.getItem('healthConnectConnected');
          if (healthConnectConnected === 'true') {
            const [hcHeight, hcWeight] = await Promise.all([
              wearableService.fetchHeight(),
              wearableService.fetchWeight(),
            ]);

            const nextHeight = hcHeight > 0 ? hcHeight : Number(resolvedUser.height) || 0;
            const nextWeight = hcWeight > 0 ? hcWeight : Number(resolvedUser.weight) || 0;

            if (nextHeight > 0 || nextWeight > 0) {
              wearableService.setUserProfile({
                height: nextHeight > 0 ? nextHeight : undefined,
                weight: nextWeight > 0 ? nextWeight : undefined,
              });

              const updates: { height?: number; weight?: number } = {};
              if (nextHeight > 0 && Number(resolvedUser.height) !== nextHeight) {
                updates.height = nextHeight;
              }
              if (nextWeight > 0 && Number(resolvedUser.weight) !== nextWeight) {
                updates.weight = nextWeight;
              }

              if (Object.keys(updates).length > 0) {
                await updateUser(updates);
                resolvedUser = { ...resolvedUser, ...updates };
              }
            }
          }

          setLatestUserData(resolvedUser);

          const contacts = await emergencyContactService.fetchEmergencyContacts();
          setEmergencyContacts(contacts);

          try {
            const response = await api.get<MedicalRecordsApiResponse>('/medical-records');
            if (response.success && response.data?.success) {
              const records = response.data.data || [];
              setMedicalRecords(records);
              await AsyncStorage.setItem(MEDICAL_RECORDS_CACHE_KEY, JSON.stringify(records));
            } else {
              const cachedRecordsRaw = await AsyncStorage.getItem(MEDICAL_RECORDS_CACHE_KEY);
              setMedicalRecords(cachedRecordsRaw ? JSON.parse(cachedRecordsRaw) : []);
            }
          } catch (medicalRecordsError) {
            console.error('Failed to load medical records for profile:', medicalRecordsError);
            const cachedRecordsRaw = await AsyncStorage.getItem(MEDICAL_RECORDS_CACHE_KEY);
            setMedicalRecords(cachedRecordsRaw ? JSON.parse(cachedRecordsRaw) : []);
          }
        } catch (error) {
          console.error('Failed to load latest personal info:', error);
        }
      };

      loadLatestUserData();
    }, [updateUser])
  );

  const profileSource = latestUserData || user || {};
  const resolvedHeight = Number(profileSource?.height) > 0 ? Number(profileSource.height) : undefined;
  const resolvedWeight = Number(profileSource?.weight) > 0 ? Number(profileSource.weight) : undefined;
  const resolvedBMI = computeBMI(resolvedHeight, resolvedWeight);
  const primaryEmergencyContact = emergencyContacts[0] || null;
  const sortedMedicalRecords = [...medicalRecords].sort((a, b) => {
    const aTime = new Date(a.date).getTime();
    const bTime = new Date(b.date).getTime();
    return bTime - aTime;
  });
  const latestMedicalRecord = sortedMedicalRecords[0] || null;
  const lastUpdatedMedicalDate = latestMedicalRecord
    ? new Date(latestMedicalRecord.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'No records';

  const fullName = [profileSource?.firstName, profileSource?.lastName].filter(Boolean).join(' ').trim() || 'User';
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'U';

  const personalInfo = [
    { label: 'Full Name', value: fullName },
    { label: 'Email', value: profileSource?.email || 'Not provided' },
    { label: 'Phone', value: profileSource?.phoneNumber || 'Not provided' },
    { label: 'Date of Birth', value: profileSource?.dateOfBirth || 'Not provided' },
    { label: 'Gender', value: profileSource?.gender || 'Not provided' },
    { label: 'Blood Group', value: profileSource?.bloodGroup || profileSource?.bloodType || 'Not provided' },
    { label: 'Height', value: resolvedHeight ? `${resolvedHeight} cm` : 'Not provided' },
    { label: 'Weight', value: resolvedWeight ? `${resolvedWeight} kg` : 'Not provided' },
    { label: 'BMI', value: resolvedBMI ? `${resolvedBMI}` : 'Not provided' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={Colors.gradients.profile}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={24} color={Colors.white} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Personal Information</Text>
          
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => navigation.navigate('EditProfile' as never)}
          >
            <Icon name="pencil" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Picture */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <TouchableOpacity style={styles.changePhotoButton}>
            <Text style={styles.changePhotoText}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Info List */}
        <Card style={styles.infoCard}>
          {personalInfo.map((item, index) => (
            <React.Fragment key={index}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>{item.label}</Text>
                <Text style={styles.infoValue}>{item.value}</Text>
              </View>
              {index < personalInfo.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </Card>

        {/* Edit Button */}
        <Button
          title="Edit Information"
          onPress={() => navigation.navigate('EditProfile' as never)}
          fullWidth
          size="large"
          gradientColors={Colors.gradients.profile}
          style={styles.editButton}
        />

        {/* Medical History */}
        <Card style={styles.historyCard}>
          <View style={styles.historyHeader}>
            <Icon name="medical-bag" size={24} color={Colors.info} />
            <Text style={styles.historyTitle}>Medical History</Text>
          </View>
          
          <View style={styles.historyItem}>
            <Text style={styles.historyLabel}>Latest Record</Text>
            <Text style={styles.historyValue}>{latestMedicalRecord?.title || 'No medical records yet'}</Text>
          </View>
          
          <View style={styles.historyItem}>
            <Text style={styles.historyLabel}>Doctor / Type</Text>
            <Text style={styles.historyValue}>
              {latestMedicalRecord
                ? `${latestMedicalRecord.doctor || 'Unknown doctor'} • ${latestMedicalRecord.type || 'General'}`
                : 'No records'}
            </Text>
          </View>
          
          <View style={styles.historyItem}>
            <Text style={styles.historyLabel}>Records / Last Updated</Text>
            <Text style={styles.historyValue}>{`${medicalRecords.length} record(s) • ${lastUpdatedMedicalDate}`}</Text>
          </View>
          
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('MedicalRecords' as never)}
          >
            <Icon name="file-document-edit-outline" size={20} color={Colors.info} />
            <Text style={styles.addButtonText}>Open Medical Records</Text>
          </TouchableOpacity>
        </Card>

        {/* Emergency Contact */}
        <Card style={styles.emergencyCard}>
          <View style={styles.emergencyHeader}>
            <Icon name="account-alert" size={24} color={Colors.error} />
            <Text style={styles.emergencyTitle}>Emergency Contact</Text>
          </View>
          
          <View style={styles.emergencyInfo}>
            <Text style={styles.emergencyName}>
              {primaryEmergencyContact?.name || 'Not Set'}
            </Text>
            <Text style={styles.emergencyRelation}>
              {primaryEmergencyContact
                ? `${primaryEmergencyContact.relationship || 'Emergency contact'} • ${primaryEmergencyContact.phone}`
                : 'Add an emergency contact'}
            </Text>
          </View>

          {emergencyContacts.length > 1 && (
            <Text style={styles.emergencyRelation}>
              +{emergencyContacts.length - 1} more emergency contact(s)
            </Text>
          )}
          
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('Emergency' as never)}
          >
            <Icon name={primaryEmergencyContact ? 'pencil' : 'plus'} size={20} color={Colors.error} />
            <Text style={[styles.addButtonText, { color: Colors.error }]}>
              {primaryEmergencyContact ? 'Manage Emergency Contacts' : 'Add Emergency Contact'}
            </Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 100,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '600',
    color: Colors.white,
  },
  changePhotoButton: {
    paddingVertical: 8,
  },
  changePhotoText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  infoCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: 20,
  },
  infoItem: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  editButton: {
    marginBottom: 20,
  },
  historyCard: {
    marginBottom: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginLeft: 10,
  },
  historyItem: {
    marginBottom: 12,
  },
  historyLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  historyValue: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: Colors.info + '10',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.info,
    marginLeft: 6,
  },
  emergencyCard: {
    backgroundColor: Colors.error + '08',
    marginBottom: 16,
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  emergencyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginLeft: 10,
  },
  emergencyInfo: {
    marginBottom: 12,
  },
  emergencyName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  emergencyRelation: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});

export default PersonalInfoScreen;
