import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../utils/colors';
import Card from '../components/common/Card';
import api from '../services/api';

interface MedicalRecord {
  _id?: string;
  id?: string | number;
  title: string;
  date: string;
  doctor: string;
  type: string;
  icon?: string;
  fileUrl?: string;
  notes?: string;
}

interface MedicalRecordsApiResponse {
  success: boolean;
  count: number;
  data: MedicalRecord[];
}

const MEDICAL_RECORDS_CACHE_KEY = 'medicalRecords';

const RECORD_TYPES = ['Lab Report', 'Imaging', 'Prescription', 'Checkup', 'Other'];

const TYPE_ICONS: Record<string, string> = {
  'Lab Report': 'test-tube',
  'Imaging': 'radiology-box-outline',
  'Prescription': 'pill',
  'Checkup': 'stethoscope',
  'Other': 'file-document-outline',
};

const MedicalRecordsScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    doctor: '',
    date: new Date().toISOString().split('T')[0],
    type: 'Other',
    notes: '',
  });

  const formatDate = (dateValue: string) => {
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) {
      return dateValue;
    }
    return parsed.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const loadMedicalRecords = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get<MedicalRecordsApiResponse>('/medical-records');

      if (response.success && response.data?.success) {
        const fetchedRecords = response.data.data || [];
        setRecords(fetchedRecords);
        await AsyncStorage.setItem(MEDICAL_RECORDS_CACHE_KEY, JSON.stringify(fetchedRecords));
        return;
      }

      const cachedRecordsRaw = await AsyncStorage.getItem(MEDICAL_RECORDS_CACHE_KEY);
      if (cachedRecordsRaw) {
        setRecords(JSON.parse(cachedRecordsRaw));
      } else {
        setRecords([]);
      }
    } catch (error) {
      console.error('Failed to load medical records:', error);
      try {
        const cachedRecordsRaw = await AsyncStorage.getItem(MEDICAL_RECORDS_CACHE_KEY);
        setRecords(cachedRecordsRaw ? JSON.parse(cachedRecordsRaw) : []);
      } catch {
        setRecords([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const openAddModal = () => {
    setForm({
      title: '',
      doctor: '',
      date: new Date().toISOString().split('T')[0],
      type: 'Other',
      notes: '',
    });
    setModalVisible(true);
  };

  const saveRecord = async () => {
    if (!form.title.trim()) {
      Alert.alert('Validation', 'Title is required');
      return;
    }
    if (!form.doctor.trim()) {
      Alert.alert('Validation', 'Doctor name is required');
      return;
    }
    try {
      setSaving(true);
      const response = await api.post<MedicalRecordsApiResponse>('/medical-records', {
        title: form.title.trim(),
        doctor: form.doctor.trim(),
        date: form.date,
        type: form.type,
        notes: form.notes.trim(),
        icon: TYPE_ICONS[form.type] || 'file-document-outline',
      });
      if (response.success && response.data?.success) {
        setModalVisible(false);
        await loadMedicalRecords();
      } else {
        Alert.alert('Error', 'Failed to save record. Please try again.');
      }
    } catch (err) {
      Alert.alert('Error', 'Could not connect to server.');
    } finally {
      setSaving(false);
    }
  };

  const deleteRecord = (record: MedicalRecord) => {
    Alert.alert(
      'Delete Record',
      `Delete "${record.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const id = record._id || record.id;
              await api.delete(`/medical-records/${id}`);
              await loadMedicalRecords();
            } catch {
              Alert.alert('Error', 'Failed to delete record.');
            }
          },
        },
      ]
    );
  };

  useFocusEffect(
    useCallback(() => {
      loadMedicalRecords();
    }, [loadMedicalRecords])
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#4CAF50', '#2E7D32']}
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
          
          <Text style={styles.headerTitle}>Medical Records</Text>
          
          <TouchableOpacity style={styles.headerButton} onPress={openAddModal}>
            <Icon name="plus" size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading medical records...</Text>
          </View>
        ) : (
          <>
            {records.map((record, index) => (
              <Card key={record._id || record.id || `record-${index}`} style={styles.recordCard}>
                <View style={styles.recordHeader}>
                  <View style={styles.iconContainer}>
                    <Icon name={record.icon || 'file-document-outline'} size={28} color="#4CAF50" />
                  </View>
                  <View style={styles.recordInfo}>
                    <Text style={styles.recordTitle}>{record.title || 'Untitled Record'}</Text>
                    <Text style={styles.recordDate}>{formatDate(record.date)}</Text>
                  </View>
                  <TouchableOpacity style={styles.actionButton} onPress={() => deleteRecord(record)}>
                    <Icon name="delete-outline" size={24} color="#E53935" />
                  </TouchableOpacity>
                </View>
                <View style={styles.divider} />
                <View style={styles.recordFooter}>
                  <Text style={styles.recordDoctor}>
                    <Icon name="doctor" size={14} /> {record.doctor || 'Unknown doctor'}
                  </Text>
                  <View style={styles.tagContainer}>
                    <Text style={styles.tagText}>{record.type || 'Other'}</Text>
                  </View>
                </View>
              </Card>
            ))}

            {records.length === 0 && (
              <View style={styles.emptyState}>
                <Icon name="folder-open-outline" size={64} color={Colors.textSecondary} />
                <Text style={styles.emptyText}>No medical records found</Text>
                <Text style={styles.emptySubtext}>Records will appear here once available</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Add Record Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Medical Record</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Blood Test Report"
                placeholderTextColor={Colors.textSecondary}
                value={form.title}
                onChangeText={v => setForm(f => ({ ...f, title: v }))}
              />

              <Text style={styles.inputLabel}>Doctor *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Dr. Smith"
                placeholderTextColor={Colors.textSecondary}
                value={form.doctor}
                onChangeText={v => setForm(f => ({ ...f, doctor: v }))}
              />

              <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textSecondary}
                value={form.date}
                onChangeText={v => setForm(f => ({ ...f, date: v }))}
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Type</Text>
              <View style={styles.typeRow}>
                {RECORD_TYPES.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeChip, form.type === t && styles.typeChipActive]}
                    onPress={() => setForm(f => ({ ...f, type: t }))}
                  >
                    <Text style={[styles.typeChipText, form.type === t && styles.typeChipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="Additional notes (optional)"
                placeholderTextColor={Colors.textSecondary}
                value={form.notes}
                onChangeText={v => setForm(f => ({ ...f, notes: v }))}
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={saveRecord}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Record</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    color: Colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  recordCard: {
    marginBottom: 16,
    padding: 16,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  recordInfo: {
    flex: 1,
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  recordDate: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  actionButton: {
    padding: 8,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 12,
  },
  recordFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recordDoctor: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  tagContainer: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 50,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 15,
    color: Colors.textPrimary,
    backgroundColor: '#FAFAFA',
  },
  inputMultiline: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#F5F5F5',
    marginRight: 6,
    marginBottom: 6,
  },
  typeChipActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  typeChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  typeChipTextActive: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default MedicalRecordsScreen;