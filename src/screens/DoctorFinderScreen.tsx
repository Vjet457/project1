import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Linking,
} from 'react-native';
import {
  Text,
  Card,
  TextInput,
  Chip,
  Button,
  Avatar,
  IconButton,
  Portal,
  Snackbar,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';

import { colors } from '../styles/theme';
import doctorService, { type Doctor as ApiDoctor } from '../services/doctorService';

const { width } = Dimensions.get('window');

interface DoctorCard {
  id: string;
  name: string;
  specialty: string;
  hospital: string;
  rating: number;
  reviews: number;
  distance: string;
  availability: string;
  image: string | null;
  experience: string;
  fee: string;
  languages: string[];
  isAvailableNow: boolean;
  acceptsOnline: boolean;
}

const specialties = [
  { id: 1, name: 'General', icon: 'local-hospital', color: '#2196F3' },
  { id: 2, name: 'Cardiology', icon: 'favorite', color: '#F44336' },
  { id: 3, name: 'Dermatology', icon: 'face', color: '#FF9800' },
  { id: 4, name: 'Neurology', icon: 'psychology', color: '#9C27B0' },
  { id: 5, name: 'Orthopedics', icon: 'accessibility', color: '#4CAF50' },
  { id: 6, name: 'Pediatrics', icon: 'child-care', color: '#E91E63' },
  { id: 7, name: 'Psychiatry', icon: 'self-improvement', color: '#673AB7' },
  { id: 8, name: 'ENT', icon: 'hearing', color: '#00BCD4' },
];

const DoctorFinderScreen = () => {
  const navigation = useNavigation();
  const [searchText, setSearchText] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [doctors, setDoctors] = useState<DoctorCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadDoctors();
  }, []);

  const loadDoctors = async () => {
    try {
      setLoading(true);
      const response = await doctorService.searchDoctors({ limit: 50 });
      if (response.success && response.data) {
        setDoctors(response.data.map((doctor) => mapDoctorToCard(doctor)));
      } else {
        setDoctors([]);
        setSnackbarMessage(response.error || 'No doctors found');
        setSnackbarVisible(true);
      }
    } catch (error) {
      console.error('Failed to load doctors:', error);
      setDoctors([]);
      setSnackbarMessage('Failed to load doctors');
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const mapDoctorToCard = (doctor: ApiDoctor): DoctorCard => ({
    id: doctor.id,
    name: doctor.name,
    specialty: doctor.specialization,
    hospital: doctor.hospital,
    rating: doctor.rating,
    reviews: doctor.reviewCount,
    distance: typeof doctor.distance === 'number' ? `${doctor.distance.toFixed(1)} km` : 'Nearby',
    availability: doctorService.getLiveAvailabilityLabel(doctor),
    image: doctor.profilePhoto || null,
    experience: `${doctor.experience}+ years`,
    fee: doctor.consultationFee ? `₹${doctor.consultationFee}` : 'Varies',
    languages: doctor.languages,
    isAvailableNow: doctor.isAvailableNow,
    acceptsOnline: doctor.acceptsOnline,
  });

  const filteredDoctors = useMemo(() => {
    return doctors.filter(doctor => {
      const matchesSearch = doctor.name.toLowerCase().includes(searchText.toLowerCase()) ||
        doctor.specialty.toLowerCase().includes(searchText.toLowerCase());
      const matchesSpecialty = !selectedSpecialty || doctor.specialty.toLowerCase().includes(selectedSpecialty.toLowerCase());
      return matchesSearch && matchesSpecialty;
    });
  }, [doctors, searchText, selectedSpecialty]);

  const handleSpecialtySelect = (specialty: typeof specialties[0]) => {
    if (selectedSpecialty === specialty.name) {
      setSelectedSpecialty(null);
    } else {
      setSelectedSpecialty(specialty.name);
    }
  };

  const handleBookAppointment = (doctor: DoctorCard) => {
    setSnackbarMessage(`Booking appointment with ${doctor.name}...`);
    setSnackbarVisible(true);
    // TODO: Navigate to booking screen
  };

  const handleCallDoctor = (doctor: DoctorCard) => {
    Linking.openURL('tel:+911234567890');
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Icon key={i} name="star" size={16} color="#FFD700" />);
    }
    if (hasHalf) {
      stars.push(<Icon key="half" name="star-half" size={16} color="#FFD700" />);
    }
    return stars;
  };

  const renderDoctorCard = ({ item }: { item: DoctorCard }) => (
    <Card style={styles.doctorCard} mode="elevated">
      <Card.Content style={styles.doctorCardContent}>
        <View style={styles.doctorHeader}>
          <Avatar.Text
            size={60}
            label={item.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            style={styles.doctorAvatar}
          />
          <View style={styles.doctorInfo}>
            <Text style={styles.doctorName}>{item.name}</Text>
            <Text style={styles.doctorSpecialty}>{item.specialty}</Text>
            <Text style={styles.doctorHospital}>{item.hospital}</Text>
            <View style={styles.ratingRow}>
              {renderStars(item.rating)}
              <Text style={styles.ratingText}>{item.rating}</Text>
              <Text style={styles.reviewsText}>({item.reviews} reviews)</Text>
            </View>
          </View>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.doctorMeta}>
          <View style={styles.metaItem}>
            <Icon name="location-on" size={16} color={colors.primary} />
            <Text style={styles.metaText}>{item.distance}</Text>
          </View>
          <View style={styles.metaItem}>
            <Icon name="access-time" size={16} color={colors.success} />
            <Text style={[styles.metaText, { color: item.isAvailableNow ? colors.success : colors.warning }]}>{item.availability}</Text>
          </View>
        </View>

        <View style={styles.availabilityPills}>
          <View style={[styles.badge, item.isAvailableNow ? styles.badgeLive : styles.badgeScheduled]}>
            <Text style={[styles.badgeText, item.isAvailableNow ? styles.badgeLiveText : styles.badgeScheduledText]}>
              {item.isAvailableNow ? 'Available now' : 'Scheduled availability'}
            </Text>
          </View>
          {item.acceptsOnline && (
            <View style={[styles.badge, styles.badgeOnline]}>
              <Icon name="videocam" size={12} color="#0F766E" />
              <Text style={[styles.badgeText, styles.badgeOnlineText]}>Online consult</Text>
            </View>
          )}
        </View>

        <View style={styles.doctorDetails}>
          <View style={[styles.badge, styles.badgeInfo]}>
            <Icon name="work" size={12} color="#1D4ED8" />
            <Text style={[styles.badgeText, styles.badgeInfoText]}>{item.experience}</Text>
          </View>
          <View style={[styles.badge, styles.badgeInfo]}>
            <Icon name="payments" size={12} color="#1D4ED8" />
            <Text style={[styles.badgeText, styles.badgeInfoText]}>{item.fee}</Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <Button
            mode="outlined"
            icon="phone"
            onPress={() => handleCallDoctor(item)}
            style={styles.callButton}
          >
            Call
          </Button>
          <Button
            mode="contained"
            icon="calendar-today"
            onPress={() => handleBookAppointment(item)}
            style={styles.bookButton}
          >
            Book Now
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={colors.gradients.primary} style={styles.header}>
        <View style={styles.headerContent}>
          <IconButton
            icon="arrow-left"
            iconColor="white"
            size={24}
            onPress={() => navigation.goBack()}
          />
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Find a Doctor</Text>
            <Text style={styles.headerSubtitle}>Book appointments with top doctors</Text>
          </View>
          <IconButton
            icon="filter-variant"
            iconColor="white"
            size={24}
            onPress={() => setSnackbarMessage('Filters coming soon!')}
          />
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            mode="outlined"
            placeholder="Search doctors, specialties..."
            value={searchText}
            onChangeText={setSearchText}
            left={<TextInput.Icon icon="magnify" />}
            style={styles.searchInput}
            outlineStyle={styles.searchOutline}
          />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading live doctor availability...</Text>
          </View>
        ) : null}

        {/* Specialties */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.specialtiesContainer}>
          {specialties.map((specialty) => (
            <TouchableOpacity
              key={specialty.id}
              style={[
                styles.specialtyCard,
                selectedSpecialty === specialty.name && styles.specialtyCardSelected
              ]}
              onPress={() => handleSpecialtySelect(specialty)}
              activeOpacity={0.7}
            >
              <View style={[styles.specialtyIcon, { backgroundColor: specialty.color + '20' }]}>
                <Icon name={specialty.icon} size={24} color={specialty.color} />
              </View>
              <Text style={[
                styles.specialtyName,
                selectedSpecialty === specialty.name && { color: colors.primary }
              ]}>
                {specialty.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Results Count */}
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>
            {filteredDoctors.length} doctors found
          </Text>
          {selectedSpecialty && (
            <Chip
              onClose={() => setSelectedSpecialty(null)}
              style={styles.filterChip}
              textStyle={{ color: colors.primary }}
            >
              {selectedSpecialty}
            </Chip>
          )}
        </View>

        {/* Doctors List */}
        <FlatList
          data={filteredDoctors}
          renderItem={renderDoctorCard}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="search-off" size={64} color={colors.outlineVariant} />
              <Text style={styles.emptyText}>No doctors found</Text>
              <Text style={styles.emptySubtext}>Try adjusting your search filters</Text>
            </View>
          }
        />
      </View>

      <Portal>
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
  availabilityPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  statusChip: {
    height: 28,
  },
  badge: {
    minHeight: 30,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
  },
  badgeLive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  badgeScheduled: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
  },
  badgeOnline: {
    backgroundColor: '#ECFEFF',
    borderColor: '#99F6E4',
  },
  badgeInfo: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  badgeLiveText: {
    color: '#166534',
  },
  badgeScheduledText: {
    color: '#92400E',
  },
  badgeOnlineText: {
    color: '#0F766E',
  },
  badgeInfoText: {
    color: '#1D4ED8',
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  searchInput: {
    backgroundColor: colors.surface,
  },
  searchOutline: {
    borderRadius: 12,
    borderColor: colors.outline,
  },
  loadingContainer: {
    paddingTop: 48,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: colors.onSurfaceVariant,
  },
  specialtiesContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
    maxHeight: 100,
  },
  specialtyCard: {
    alignItems: 'center',
    marginRight: 16,
    padding: 8,
    borderRadius: 12,
    backgroundColor: colors.surface,
    minWidth: 80,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  specialtyCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryContainer,
  },
  specialtyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  specialtyName: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  resultsCount: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  filterChip: {
    backgroundColor: colors.primaryContainer,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  doctorCard: {
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
  },
  doctorCardContent: {
    backgroundColor: colors.surface,
  },
  doctorHeader: {
    flexDirection: 'row',
  },
  doctorAvatar: {
    backgroundColor: colors.primary,
  },
  doctorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
  },
  doctorSpecialty: {
    fontSize: 14,
    color: colors.primary,
    marginTop: 2,
    fontWeight: '600',
  },
  doctorHospital: {
    fontSize: 12,
    color: colors.onSurface,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurface,
    marginLeft: 4,
  },
  reviewsText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginLeft: 4,
  },
  divider: {
    marginVertical: 12,
  },
  doctorMeta: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: colors.onSurface,
    marginLeft: 4,
    fontWeight: '500',
  },
  doctorDetails: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  callButton: {
    flex: 1,
    borderRadius: 8,
  },
  bookButton: {
    flex: 2,
    borderRadius: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.onSurface,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
});

export default DoctorFinderScreen;
