import { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Text,
  Card,
  IconButton,
  Button,
  ProgressBar,
  Portal,
  Snackbar,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

import { colors } from '../styles/theme';
import healthService from '../services/healthService';
import {
  wearableService,
  initializeHealthConnect,
  requestHealthConnectPermissions,
  isHealthConnectAvailable,
} from '../services/healthConnect';
import { useAuth } from '../context/AuthContext';
import type { User } from '../context/AuthContext';

const getVitalStatus = (value: number, type: 'heartRate' | 'bloodOxygen' | 'bloodPressure') => {
  if (value <= 0) {
    return 'No data';
  }

  if (type === 'heartRate') {
    if (value < 60) return 'Low';
    if (value > 100) return 'High';
    return 'Normal';
  }

  if (type === 'bloodOxygen') {
    if (value < 95) return 'Low';
    return 'Normal';
  }

  return 'Normal';
};

const getDisplayValue = (value: number) => {
  if (value <= 0) {
    return '--';
  }

  return `${Math.round(value)}`;
};

const { width } = Dimensions.get('window');
const DASHBOARD_HEALTH_SYNC_CACHE_KEY = 'dashboardHealthSyncCache';

const EMPTY_HEALTH_DATA = {
  heartRate: { value: 0, unit: 'bpm', status: 'No data' },
  bloodOxygen: { value: 0, unit: '%', status: 'No data' },
  bloodPressure: { systolic: 0, diastolic: 0, unit: 'mmHg', status: 'No data' },
  bodyTemp: { value: 0, unit: '°F', status: 'No data' },
  steps: { value: 0, goal: 10000 },
  calories: { value: 0, goal: 500 },
  sleep: { value: 0, goal: 8 },
  water: { value: 0, goal: 2.5 },
  bmi: { value: 0, unit: 'BMI' },
};

const mapWearableDataToHealthState = (data: any) => {
  const oxygenValue = data?.oxygenSaturation ?? 0;
  const bloodOxygen = oxygenValue > 0 && oxygenValue <= 1 ? oxygenValue * 100 : oxygenValue;
  const sleepHours = (data?.sleepDurationMinutes ?? 0) / 60;
  const heartRate = data?.heartRate ?? 0;
  const systolic = data?.bloodPressureSystolic ?? 0;
  const diastolic = data?.bloodPressureDiastolic ?? 0;
  const steps = data?.steps ?? 0;
  const calories = data?.activeCalories ?? data?.calories ?? 0;

  return {
    heartRate: {
      value: heartRate,
      unit: 'bpm',
      status: getVitalStatus(heartRate, 'heartRate'),
    },
    bloodOxygen: {
      value: bloodOxygen,
      unit: '%',
      status: getVitalStatus(bloodOxygen, 'bloodOxygen'),
    },
    bloodPressure: {
      systolic,
      diastolic,
      unit: 'mmHg',
      status: getVitalStatus(systolic, 'bloodPressure'),
    },
    bodyTemp: { value: 0, unit: '°F', status: 'No data' },
    steps: { value: steps, goal: wearableService.getStepsGoal() },
    calories: { value: calories, goal: wearableService.getCaloriesGoal() },
    sleep: { value: sleepHours, goal: wearableService.getSleepGoalHours() },
    water: { value: 0, goal: 2.5 },
    bmi: { value: data?.bmi ?? data?.basalMetabolicRate ?? 0, unit: 'BMI' },
  };
};

const HealthTrackingScreen = () => {
  const navigation = useNavigation();
  const { updateUser } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [healthData, setHealthData] = useState(EMPTY_HEALTH_DATA);

  useEffect(() => {
    AsyncStorage.getItem('healthConnectConnected').then(flag => {
      if (flag === 'true') setIsConnected(true);
    });

    AsyncStorage.getItem(DASHBOARD_HEALTH_SYNC_CACHE_KEY).then(cached => {
      if (!cached) return;
      try {
        const parsed = JSON.parse(cached);
        if (parsed?.wearableData) {
          setHealthData(mapWearableDataToHealthState(parsed.wearableData));
        }
      } catch (error) {
        console.warn('Failed to read dashboard health cache:', error);
      }
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const loadCachedDashboardSync = async () => {
        try {
          const cached = await AsyncStorage.getItem(DASHBOARD_HEALTH_SYNC_CACHE_KEY);
          if (!cached || !active) return;
          const parsed = JSON.parse(cached);
          if (parsed?.wearableData) {
            setHealthData(mapWearableDataToHealthState(parsed.wearableData));
          }
        } catch (error) {
          console.warn('Failed to apply dashboard health cache on focus:', error);
        }
      };

      void loadCachedDashboardSync();

      return () => {
        active = false;
      };
    }, [])
  );

  const connectHealthConnect = async () => {
    setSyncing(true);
    try {
      // Check availability first
      let available = false;
      try {
        available = await isHealthConnectAvailable();
      } catch (e) {
        console.warn('Health Connect check failed:', e);
        available = false;
      }
      
      if (!available) {
        setSnackbarMessage('Health Connect is not available. Please install Health Connect from Play Store.');
        setSnackbarVisible(true);
        setSyncing(false);
        return;
      }

      // Initialize
      let initialized = false;
      try {
        initialized = await initializeHealthConnect();
      } catch (e) {
        console.warn('Health Connect init failed:', e);
        initialized = false;
      }
      
      if (!initialized) {
        setSnackbarMessage('Could not initialize Health Connect. Please try again.');
        setSnackbarVisible(true);
        setSyncing(false);
        return;
      }

      // Request permissions
      let granted = false;
      try {
        granted = await requestHealthConnectPermissions();
      } catch (e) {
        console.warn('Health Connect permissions failed:', e);
        granted = false;
      }
      
      if (granted) {
        setIsConnected(true);
        await AsyncStorage.setItem('healthConnectConnected', 'true');
        setSnackbarMessage('Connected to Health Connect!');
        await syncHealthData();
      } else {
        setSnackbarMessage('Please grant permissions in Health Connect app');
      }
    } catch (error) {
      console.error('Health Connect error:', error);
      setSnackbarMessage('Connection failed. Please ensure Health Connect is installed.');
    }
    setSnackbarVisible(true);
    setSyncing(false);
  };

  const syncHealthData = async () => {
    setSyncing(true);
    
    try {
      const result = await wearableService.fetchAllHealthData();
      const data = result.data;
      setHealthData(mapWearableDataToHealthState(data));

      // Persist the latest wearable body metrics back to the shared user profile.
      // The service updates its own BMI calculation from Height/Weight; this write-back
      // ensures Profile and Personal Info receive the same values immediately.
      const hcProfile = wearableService.getUserProfile();
      const profileUpdates: Partial<User> = {};

      if (hcProfile.height && hcProfile.height > 0) {
        profileUpdates.height = hcProfile.height;
      }

      if (hcProfile.weight && hcProfile.weight > 0) {
        profileUpdates.weight = hcProfile.weight;
      }

      const bmiValue = data?.bmi ?? data?.basalMetabolicRate ?? wearableService.calculateBMI();
      if (bmiValue > 0) {
        profileUpdates.bmi = bmiValue;
      }

      if (Object.keys(profileUpdates).length > 0) {
        await updateUser(profileUpdates);
      }

      await healthService.saveDailyHealthRecord({
        date: new Date().toISOString(),
        vitals: {
          heartRate: data?.heartRate || undefined,
          bloodPressure: {
            systolic: data?.bloodPressureSystolic || undefined,
            diastolic: data?.bloodPressureDiastolic || undefined,
          },
          bloodOxygen: data?.oxygenSaturation || undefined,
          respiratoryRate: data?.respiratoryRate || undefined,
        },
        activity: {
          steps: data?.steps || undefined,
          distance: data?.distance || undefined,
          caloriesBurned: data?.activeCalories || data?.calories || undefined,
          activeMinutes: data?.activeCalories ? Math.round(data.activeCalories / 6) : undefined,
        },
        sleep: data?.sleepDurationMinutes ? { duration: data.sleepDurationMinutes / 60 } : undefined,
        body: {
          bmi: data?.bmi || undefined,
        },
        source: 'health_connect',
      });

      if (result.errors.length > 0) {
        setSnackbarMessage(`Synced with partial data: ${result.errors[0]}`);
      } else {
        setSnackbarMessage('Health data synced successfully!');
      }
    } catch (error) {
      console.error('Sync error:', error);
      setSnackbarMessage('Failed to sync data');
    }
    
    setSnackbarVisible(true);
    setSyncing(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (isConnected) {
      await syncHealthData();
    }
    setRefreshing(false);
  };

  const vitals = [
    {
      id: 1,
      title: 'Heart Rate',
      value: getDisplayValue(healthData.heartRate.value),
      unit: healthData.heartRate.value > 0 ? healthData.heartRate.unit : '',
      status: healthData.heartRate.status,
      icon: 'favorite',
      color: '#FF5252',
      bgColor: '#FFEBEE',
    },
    {
      id: 2,
      title: 'Blood Oxygen',
      value: getDisplayValue(healthData.bloodOxygen.value),
      unit: healthData.bloodOxygen.value > 0 ? healthData.bloodOxygen.unit : '',
      status: healthData.bloodOxygen.status,
      icon: 'water-drop',
      color: '#2196F3',
      bgColor: '#E3F2FD',
    },
    {
      id: 3,
      title: 'Blood Pressure',
      value:
        healthData.bloodPressure.systolic > 0 && healthData.bloodPressure.diastolic > 0
          ? `${healthData.bloodPressure.systolic}/${healthData.bloodPressure.diastolic}`
          : '--/--',
      unit:
        healthData.bloodPressure.systolic > 0 && healthData.bloodPressure.diastolic > 0
          ? healthData.bloodPressure.unit
          : '',
      status: healthData.bloodPressure.status,
      icon: 'monitor-heart',
      color: '#4CAF50',
      bgColor: '#E8F5E9',
    },
    {
      id: 4,
      title: 'Body Temp',
      value: healthData.bodyTemp.value,
      unit: healthData.bodyTemp.unit,
      status: healthData.bodyTemp.status,
      icon: 'thermostat',
      color: '#FF9800',
      bgColor: '#FFF3E0',
    },
  ];

  const dailyActivities = [
    {
      id: 1,
      title: 'Steps',
      value: healthData.steps.value,
      goal: healthData.steps.goal,
      unit: 'steps',
      icon: 'directions-walk',
      color: '#667eea',
    },
    {
      id: 2,
      title: 'Calories',
      value: healthData.calories.value,
      goal: healthData.calories.goal,
      unit: 'kcal',
      icon: 'local-fire-department',
      color: '#FF5722',
    },
    {
      id: 3,
      title: 'Sleep',
      value: healthData.sleep.value,
      goal: healthData.sleep.goal,
      unit: 'hrs',
      icon: 'bedtime',
      color: '#3F51B5',
    },
    {
      id: 4,
      title: 'BMI',
      value: healthData.bmi.value,
      goal: 24,
      unit: healthData.bmi.unit,
      icon: 'scale',
      color: '#FF9800',
    },
  ];

  const connectionHint = syncing
    ? 'Syncing health data'
    : isConnected
      ? 'Connected and ready to sync'
      : 'Tap to connect';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={colors.gradients.health} style={styles.header}>
        <View style={styles.headerContent}>
          <IconButton
            icon="arrow-left"
            iconColor="white"
            size={24}
            onPress={() => navigation.goBack()}
          />
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Health Tracking</Text>
            <Text style={styles.headerSubtitle}>Monitor your vitals</Text>
          </View>
          <IconButton
            icon="refresh"
            iconColor="white"
            size={24}
            onPress={syncHealthData}
            disabled={syncing || !isConnected}
          />
        </View>

        {/* Connection Status */}
        <Card style={styles.connectionCard}>
          <Card.Content style={styles.connectionContent}>
            <View style={styles.connectionLeft}>
              <Text style={styles.connectionStatus}>
                {isConnected ? '💚 Connected' : '📱 Not Connected'}
              </Text>
              <Text style={styles.connectionHint}>
                {isConnected ? connectionHint : 'Connect via Dashboard to enable tracking'}
              </Text>
            </View>
            {isConnected && (
              <Button
                mode="outlined"
                onPress={syncHealthData}
                loading={syncing}
                disabled={syncing}
                style={styles.connectButton}
              >
                Sync
              </Button>
            )}
          </Card.Content>
        </Card>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Vitals Section */}
        <Text style={styles.sectionTitle}>Vital Signs</Text>
        <View style={styles.vitalsGrid}>
          {vitals.map((vital) => (
            <Card key={vital.id} style={[styles.vitalCard, { backgroundColor: vital.bgColor }]}>
              <Card.Content style={styles.vitalContent}>
                <View style={[styles.vitalIcon, { backgroundColor: vital.color + '20' }]}>
                  <Icon name={vital.icon} size={24} color={vital.color} />
                </View>
                <Text style={styles.vitalTitle}>{vital.title}</Text>
                <Text style={[styles.vitalValue, { color: vital.color }]}>{vital.value}</Text>
                <Text style={styles.vitalUnit}>{vital.unit}</Text>
                <View style={[styles.statusBadge, { backgroundColor: colors.successContainer }]}>
                  <Text style={[styles.statusText, { color: colors.success }]}>{vital.status}</Text>
                </View>
              </Card.Content>
            </Card>
          ))}
        </View>

        {dailyActivities.map((activity) => (
          <Card key={activity.id} style={styles.activityCard}>
            <Card.Content style={styles.activityContent}>
              <View style={styles.activityLeft}>
                <View style={[styles.activityIcon, { backgroundColor: activity.color + '20' }]}>
                  <Icon name={activity.icon} size={24} color={activity.color} />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityTitle}>{activity.title}</Text>
                  <Text style={[styles.activityValue, { color: activity.color }]}>
                    {activity.value.toLocaleString()} <Text style={styles.activityUnit}>{activity.unit}</Text>
                  </Text>
                </View>
              </View>
              <View style={styles.activityRight}>
                <Text style={styles.goalText}>
                  {Math.round((activity.value / activity.goal) * 100)}%
                </Text>
              </View>
            </Card.Content>
            <ProgressBar
              progress={Math.min(activity.value / activity.goal, 1)}
              color={activity.color}
              style={styles.activityProgress}
            />
          </Card>
        ))}

        {/* Bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {syncing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Syncing...</Text>
        </View>
      )}

      <Portal>
        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={3000}
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
    paddingBottom: 60,
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
  connectionCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    elevation: 4,
  },
  connectionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  connectionLeft: {
    flex: 1,
  },
  connectionStatus: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.onSurface,
  },
  connectionHint: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  connectButton: {
    borderRadius: 20,
  },
  content: {
    flex: 1,
    marginTop: -30,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.onSurface,
    marginTop: 24,
    marginBottom: 12,
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  vitalCard: {
    width: (width - 44) / 2,
    borderRadius: 16,
    marginBottom: 12,
  },
  vitalContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  vitalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  vitalTitle: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
  vitalValue: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 4,
  },
  vitalUnit: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  activityCard: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  activityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityInfo: {},
  activityTitle: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  activityValue: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 2,
  },
  activityUnit: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.onSurfaceVariant,
  },
  activityRight: {
    alignItems: 'flex-end',
  },
  goalText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  activityProgress: {
    height: 4,
    backgroundColor: colors.outlineVariant,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.primary,
  },
});

export default HealthTrackingScreen;
