import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Card,
  Button,
  Avatar,
  ProgressBar,
  Chip,
  FAB,
} from 'react-native-paper';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { colors } from '../styles/theme';
import { MainStackParamList, TabParamList } from '../types';
import {
  calculatePhysicalHealthScore,
  type PhysicalHealthInput,
} from '../services/aiHealthService';
import healthService from '../services/healthService';
import mentalHealthService from '../services/mentalHealthService';
import { wearableService, isHealthConnectAvailable, initializeHealthConnect, requestHealthConnectPermissions } from '../services/healthConnect';
import {
  getMLModelManager,
  loadMLModels,
  type MentalHealthInput as MLMentalHealthInput,
} from '../ml';
import { useAuth } from '../context/AuthContext';
import { geolocationService } from '../services/geolocationService';
import { emergencyContactService } from '../services/emergencyContactService';
import { emergencyService } from '../services/emergencyService';

const { width } = Dimensions.get('window');
const MENTAL_ASSESSMENT_STORAGE_KEY = 'mentalAssessmentData';
const DASHBOARD_HEALTH_SYNC_CACHE_KEY = 'dashboardHealthSyncCache';
const PHYSICAL_SCORE_CACHE_KEY = 'latestPhysicalModuleScore';
const MENTAL_SCORE_CACHE_KEY = 'latestMentalModuleScore';

const normalizeStoredUser = (rawUser: any) => {
  if (rawUser?.data && !rawUser.firstName) {
    return rawUser.data;
  }

  return rawUser;
};

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'DashboardTab'>,
  NativeStackNavigationProp<MainStackParamList>
>;

const DashboardScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { logout, updateUser, user: authUser } = useAuth();
  const lastHealthAlertBucket = useRef<string | null>(null);
  const emergencyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [userName, setUserName] = useState('User');
  const [greeting, setGreeting] = useState('Good Day');
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const [physicalScore, setPhysicalScore] = useState<number | null>(null);
  const [mentalScore, setMentalScore] = useState<number | null>(null);
  const [scoreGrade, setScoreGrade] = useState<string | null>(null);
  const [hasHealthConnectData, setHasHealthConnectData] = useState(false);
  const [hasMentalData, setHasMentalData] = useState(false);
  const [hcConnecting, setHcConnecting] = useState(false);
  const [hcConnected, setHcConnected] = useState(false);
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [emergencyAlertDispatched, setEmergencyAlertDispatched] = useState(false);
  const [emergencyLocation, setEmergencyLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [healthStats, setHealthStats] = useState({
    dailySteps: 0,
    stepGoal: 10000,
    waterIntake: 0,
    waterGoal: 8,
    sleepHours: 0,
    sleepGoal: 8,
    moodScore: 0,
    heartRate: 0,
    healthScore: 0,
  });

  useEffect(() => {
    loadUserData();
    updateGreeting();
    checkReadinessAndCalculate();

    return () => {
      if (emergencyTimerRef.current) {
        clearTimeout(emergencyTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const resolvedName = [authUser?.firstName, authUser?.lastName].filter(Boolean).join(' ').trim();
    if (resolvedName) {
      setUserName(resolvedName);
    }
  }, [authUser]);

  useFocusEffect(
    useCallback(() => {
      checkReadinessAndCalculate();
    }, [])
  );

  const checkReadinessAndCalculate = async () => {
    try {
      // Use persistent flags set when user explicitly connects / completes mental health
      const hcFlag = await AsyncStorage.getItem('healthConnectConnected');
      const mentalFlag = await AsyncStorage.getItem('mentalHealthCompleted');
      const hcConn = hcFlag === 'true';
      const mentalDone = mentalFlag === 'true';
      setHasHealthConnectData(hcConn);
      setHasMentalData(mentalDone);
      setHcConnected(hcConn);

      if (hcConn && mentalDone) {
        await calculateOverallScore();
      }
    } catch (error) {
      console.error('Error checking readiness:', error);
    }
  };

  const connectHealthConnect = async () => {
    setHcConnecting(true);
    try {
      let available = false;
      try { available = await isHealthConnectAvailable(); } catch { available = false; }
      if (!available) {
        Alert.alert('Health Connect', 'Health Connect is not available. Please install it from Play Store.');
        setHcConnecting(false);
        return;
      }
      let initialized = false;
      try { initialized = await initializeHealthConnect(); } catch { initialized = false; }
      if (!initialized) {
        Alert.alert('Health Connect', 'Could not initialize Health Connect. Please try again.');
        setHcConnecting(false);
        return;
      }
      let granted = false;
      try { granted = await requestHealthConnectPermissions(); } catch { granted = false; }
      if (granted) {
        await AsyncStorage.setItem('healthConnectConnected', 'true');
        setHcConnected(true);
        setHasHealthConnectData(true);

        try {
          const healthConnectResult = await wearableService.fetchAllHealthData();
          const wearableData = healthConnectResult.data;
          await AsyncStorage.setItem(
            DASHBOARD_HEALTH_SYNC_CACHE_KEY,
            JSON.stringify({
              syncedAt: new Date().toISOString(),
              wearableData,
            })
          );

          const hcProfile = wearableService.getUserProfile();
          if (hcProfile.height || hcProfile.weight) {
            const profileUpdates: { height?: number; weight?: number } = {};
            if (hcProfile.height) profileUpdates.height = hcProfile.height;
            if (hcProfile.weight) profileUpdates.weight = hcProfile.weight;
            await updateUser(profileUpdates);
          }
        } catch (syncError) {
          console.warn('Initial Health Connect sync on connect failed:', syncError);
        }

        Alert.alert('Health Connect', 'Connected successfully! Your health data will now sync.');
        await checkReadinessAndCalculate();
      } else {
        Alert.alert('Health Connect', 'Please grant permissions in Health Connect app.');
      }
    } catch (error) {
      console.error('Health Connect error:', error);
      Alert.alert('Health Connect', 'Connection failed. Please ensure Health Connect is installed.');
    }
    setHcConnecting(false);
  };

  const calculateOverallScore = async () => {
    try {
      const healthConnectResult = await wearableService.fetchAllHealthData();
      const wearableData = healthConnectResult.data;

      const hcProfile = wearableService.getUserProfile();
      if (hcProfile.height || hcProfile.weight) {
        const profileUpdates: { height?: number; weight?: number } = {};
        if (hcProfile.height) profileUpdates.height = hcProfile.height;
        if (hcProfile.weight) profileUpdates.weight = hcProfile.weight;
        await updateUser(profileUpdates);
      }

      const sleepHours = (wearableData.sleepDurationMinutes ?? 0) / 60;
      const dailySteps = wearableData.steps ?? 0;
      const heartRate = wearableData.heartRate ?? 0;
      const oxygenSaturationRaw = wearableData.oxygenSaturation ?? 0;
      const bloodOxygen = oxygenSaturationRaw > 0 && oxygenSaturationRaw <= 1
        ? oxygenSaturationRaw * 100
        : oxygenSaturationRaw;

      const userRaw = (await AsyncStorage.getItem('userData')) || (await AsyncStorage.getItem('user'));
      const user = userRaw ? JSON.parse(userRaw) : {};

      await healthService.saveDailyHealthRecord({
        date: new Date().toISOString(),
        vitals: {
          heartRate: heartRate > 0 ? heartRate : undefined,
          bloodPressure: {
            systolic: wearableData.bloodPressureSystolic || undefined,
            diastolic: wearableData.bloodPressureDiastolic || undefined,
          },
          bloodOxygen: bloodOxygen > 0 ? bloodOxygen : undefined,
        },
        activity: {
          steps: dailySteps,
          caloriesBurned: wearableData.activeCalories || undefined,
          activeMinutes: Math.round((wearableData.activeCalories ?? 0) / 6),
          distance: wearableData.distance || undefined,
        },
        sleep: sleepHours > 0 ? { duration: sleepHours } : undefined,
        body: {
          bmi: user?.bmi,
        },
        source: 'health_connect',
      });

      const physicalInput: PhysicalHealthInput = {
        heartRate: heartRate > 0 ? heartRate : undefined,
        bloodPressureSystolic: wearableData.bloodPressureSystolic || undefined,
        bloodPressureDiastolic: wearableData.bloodPressureDiastolic || undefined,
        bloodOxygen: bloodOxygen > 0 ? bloodOxygen : undefined,
        bodyTemperature: 98.6,
        dailySteps,
        activeMinutes: Math.round((wearableData.activeCalories ?? 0) / 6),
        caloriesBurned: wearableData.activeCalories,
        sleepHours,
        sleepQuality: sleepHours >= 7 ? 4 : sleepHours >= 6 ? 3 : sleepHours > 0 ? 2 : undefined,
        bmi: user?.bmi,
        bodyFatPercentage: user?.bodyFatPercentage,
        waterIntake: user?.waterIntakeLiters,
        age: user?.age,
        gender: user?.gender,
      };

      const moodHistoryResponse = await mentalHealthService.getMoodHistory(
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        new Date().toISOString()
      );
      const moodHistoryFromApi = (moodHistoryResponse.data || [])
        .map(entry => entry.moodScore)
        .filter((value): value is number => Boolean(value));
      const mentalAssessmentRaw = await AsyncStorage.getItem(MENTAL_ASSESSMENT_STORAGE_KEY);
      const savedAssessment = mentalAssessmentRaw ? JSON.parse(mentalAssessmentRaw) : null;
      const savedMoodHistory = Array.isArray(savedAssessment?.moodHistory)
        ? savedAssessment.moodHistory.filter((value: number) => value >= 1 && value <= 5)
        : [];
      const moodHistory = moodHistoryFromApi.length > 0 ? moodHistoryFromApi : savedMoodHistory;

      const latestMood = savedAssessment?.currentMoodValue
        ? savedAssessment.currentMoodValue
        : moodHistory.length > 0
          ? moodHistory[moodHistory.length - 1]
          : 3;
      const averageMood = moodHistory.length > 0
        ? moodHistory.reduce((sum: number, mood: number) => sum + mood, 0) / moodHistory.length
        : latestMood;
      const exerciseFrequency =
        dailySteps >= 10000 ? 4 :
        dailySteps >= 7500 ? 3 :
        dailySteps >= 4000 ? 2 :
        dailySteps > 0 ? 1 : 0;
      const socialInteraction =
        moodHistory.length >= 5 ? 3 :
        moodHistory.length >= 3 ? 2 :
        moodHistory.length >= 1 ? 1 : 0;
      const derivedStressLevel =
        averageMood <= 1.5 ? 5 :
        averageMood <= 2.5 ? 4 :
        averageMood <= 3.2 ? 3 :
        2;
      const derivedAnxietyLevel = sleepHours < 5.5 ? Math.min(5, derivedStressLevel + 1) : derivedStressLevel;
      const derivedEnergyLevel =
        sleepHours >= 8 ? 5 :
        sleepHours >= 7 ? 4 :
        sleepHours >= 6 ? 3 :
        sleepHours > 0 ? 2 : 3;
      const derivedMotivationLevel =
        dailySteps >= 10000 ? 5 :
        dailySteps >= 7000 ? 4 :
        dailySteps >= 4000 ? 3 :
        dailySteps > 0 ? 2 : 3;

      const normalizedSocialInteraction =
        savedAssessment?.socialInteraction === 'active' ? 3 :
        savedAssessment?.socialInteraction === 'moderate' ? 2 :
        savedAssessment?.socialInteraction === 'minimal' ? 1 :
        savedAssessment?.socialInteraction === 'isolated' ? 0 :
        socialInteraction;

      const clampLikert = (value: number) => Math.max(1, Math.min(5, Math.round(value))) as 1 | 2 | 3 | 4 | 5;
      const blendLikert = (assessmentValue: number | undefined, wearableValue: number, wearableWeight: number) => {
        if (!assessmentValue || assessmentValue < 1 || assessmentValue > 5) {
          return clampLikert(wearableValue);
        }
        return clampLikert(assessmentValue * (1 - wearableWeight) + wearableValue * wearableWeight);
      };

      const stressLevel = blendLikert(savedAssessment?.stressLevel, derivedStressLevel, 0.4);
      const anxietyLevel = blendLikert(savedAssessment?.anxietyLevel, derivedAnxietyLevel, 0.35);
      const energyLevel = blendLikert(savedAssessment?.energyLevel, derivedEnergyLevel, 0.45);
      const motivationLevel = energyLevel > 0 ? energyLevel : derivedMotivationLevel;

      const mentalInput: MLMentalHealthInput = {
        currentMood: Math.max(1, Math.min(5, Math.round(latestMood))) as 1 | 2 | 3 | 4 | 5,
        stressLevel: Math.max(1, Math.min(5, Math.round(stressLevel))) as 1 | 2 | 3 | 4 | 5,
        anxietyLevel: Math.max(1, Math.min(5, Math.round(anxietyLevel))) as 1 | 2 | 3 | 4 | 5,
        energyLevel: Math.max(1, Math.min(5, Math.round(energyLevel))) as 1 | 2 | 3 | 4 | 5,
        motivationLevel: Math.max(1, Math.min(5, Math.round(motivationLevel))) as 1 | 2 | 3 | 4 | 5,
        sleepQuality: sleepHours >= 8 ? 5 : sleepHours >= 7 ? 4 : sleepHours >= 6 ? 3 : sleepHours > 0 ? 2 : 3,
        sleepHours: sleepHours || 7,
        socialInteraction: normalizedSocialInteraction,
        exerciseFrequency,
        meditationPractice: user?.meditationPractice ?? false,
        workLifeBalance: Math.max(1, Math.min(5, Math.round(user?.workLifeBalance ?? averageMood))) as 1 | 2 | 3 | 4 | 5,
        appetiteChanges: false,
        concentrationIssues: false,
        negativeThoughts: averageMood <= 2,
        recentLifeEvent: false,
      };

      const physicalResult = await calculatePhysicalHealthScore(physicalInput);
      await loadMLModels();
      const mlManager = getMLModelManager();
      const mentalResult = mlManager.predictMentalHealth(mentalInput);

      let dashboardPhysicalScore = physicalResult.overallScore;
      let dashboardMentalScore = mentalResult.score;

      try {
        const [cachedPhysicalRaw, cachedMentalRaw] = await Promise.all([
          AsyncStorage.getItem(PHYSICAL_SCORE_CACHE_KEY),
          AsyncStorage.getItem(MENTAL_SCORE_CACHE_KEY),
        ]);

        if (cachedPhysicalRaw) {
          const cachedPhysical = JSON.parse(cachedPhysicalRaw);
          if (typeof cachedPhysical?.score === 'number') {
            dashboardPhysicalScore = cachedPhysical.score;
          }
        }

        if (cachedMentalRaw) {
          const cachedMental = JSON.parse(cachedMentalRaw);
          if (typeof cachedMental?.score === 'number') {
            dashboardMentalScore = cachedMental.score;
          }
        }
      } catch (cacheError) {
        console.warn('Failed to read module score cache:', cacheError);
      }

      setPhysicalScore(dashboardPhysicalScore);
      setMentalScore(dashboardMentalScore);

      // Calculate weighted overall score (physical 50%, mental 50%)
      const overall = Math.round((dashboardPhysicalScore + dashboardMentalScore) / 2);
      setOverallScore(overall);

      await healthService.saveDailyHealthRecord({
        date: new Date().toISOString(),
        vitals: {
          heartRate: heartRate > 0 ? heartRate : undefined,
          bloodPressure: {
            systolic: wearableData.bloodPressureSystolic || undefined,
            diastolic: wearableData.bloodPressureDiastolic || undefined,
          },
          bloodOxygen: bloodOxygen > 0 ? bloodOxygen : undefined,
        },
        activity: {
          steps: dailySteps,
          caloriesBurned: wearableData.activeCalories || undefined,
          activeMinutes: Math.round((wearableData.activeCalories ?? 0) / 6),
          distance: wearableData.distance || undefined,
        },
        sleep: sleepHours > 0 ? { duration: sleepHours } : undefined,
        body: {
          bmi: user?.bmi,
        },
        healthScore: {
          overall,
        },
        source: 'health_connect',
      });

      await AsyncStorage.setItem(
        DASHBOARD_HEALTH_SYNC_CACHE_KEY,
        JSON.stringify({
          syncedAt: new Date().toISOString(),
          wearableData,
        })
      );

      setHealthStats({
        dailySteps,
        stepGoal: 10000,
        waterIntake: user?.waterIntakeGlasses ?? 0,
        waterGoal: 8,
        sleepHours,
        sleepGoal: 8,
        moodScore: Math.round((latestMood / 5) * 10),
        heartRate,
        healthScore: overall,
      });

      // Determine grade
      if (overall >= 90) setScoreGrade('A+');
      else if (overall >= 80) setScoreGrade('A');
      else if (overall >= 70) setScoreGrade('B');
      else if (overall >= 60) setScoreGrade('C');
      else setScoreGrade('D');

      const alertBucket = overall >= 80 ? null : overall >= 60 ? 'warning' : 'critical';
      if (alertBucket && lastHealthAlertBucket.current !== alertBucket) {
        lastHealthAlertBucket.current = alertBucket;

        Alert.alert(
          alertBucket === 'warning' ? 'Health Notice' : 'Health Alert',
          `Your overall health score is ${overall}. ${alertBucket === 'warning'
            ? 'Stay consistent with rest, activity, and hydration to improve it.'
            : 'Please review your health insights and consider support if needed.'}`
        );
      }

      // If score is critical (< 40), trigger emergency after 15 seconds
      if (overall < 40) {
        scheduleEmergencyDispatch(overall);
      } else {
        // Clear timer if score is no longer critical
        if (emergencyTimerRef.current) {
          clearTimeout(emergencyTimerRef.current);
          emergencyTimerRef.current = null;
        }
        setEmergencyActive(false);
        setEmergencyAlertDispatched(false);
      }
    } catch (error) {
      console.error('Error calculating overall score:', error);
    }
  };


  const loadUserData = async () => {
    try {
      const userData = (await AsyncStorage.getItem('userData')) || (await AsyncStorage.getItem('user'));
      if (userData) {
        const user = normalizeStoredUser(JSON.parse(userData));
        const resolvedName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
        setUserName(resolvedName || 'User');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const updateGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  };

  const scheduleEmergencyDispatch = (score: number) => {
    if (emergencyTimerRef.current) {
      clearTimeout(emergencyTimerRef.current);
    }

    setEmergencyActive(true);
    setEmergencyAlertDispatched(false);

    emergencyTimerRef.current = setTimeout(() => {
      emergencyTimerRef.current = null;

      void (async () => {
        try {
          const notified = await triggerEmergencyAlert(score);
          setEmergencyAlertDispatched(notified);

          if (notified) {
            Alert.alert('Emergency Alert Sent', 'Emergency contacts notified.');
          } else {
            Alert.alert('Emergency Alert', 'Message could not be sent to emergency contacts.');
          }
        } catch (error) {
          console.error('Failed to dispatch emergency alert after countdown:', error);
        } finally {
          setEmergencyActive(false);
        }
      })();
    }, 15000);
  };

  const quickActions = [
    {
      title: 'Health History',
      icon: 'history',
      color: '#00BCD4',
      bgColor: '#E0F7FA',
      onPress: () => navigation.navigate('HealthHistory'),
    },
    {
      title: 'Analytics',
      icon: 'insights',
      color: colors.tertiary,
      bgColor: colors.tertiaryContainer,
      onPress: () => navigation.navigate('HealthScoreAnalytics'),
    },
    {
      title: 'Check Symptoms',
      icon: 'psychology',
      color: colors.primary,
      bgColor: colors.primaryContainer,
      onPress: () => navigation.navigate('SymptomChecker'),
    },
    {
      title: 'Physical Health',
      icon: 'fitness-center',
      color: colors.secondary,
      bgColor: colors.secondaryContainer,
      onPress: () => navigation.navigate('PhysicalHealth'),
    },
    {
      title: 'Mental Health',
      icon: 'self-improvement',
      color: colors.tertiary,
      bgColor: colors.tertiaryContainer,
      onPress: () => navigation.navigate('MentalTab'),
    },
    {
      title: 'Emergency',
      icon: 'emergency',
      color: colors.error,
      bgColor: colors.errorContainer,
      onPress: () => navigation.navigate('Emergency'),
    },
  ];

  const handleEmergencySOS = () => {
    Alert.alert(
      'Emergency SOS',
      'Are you in immediate danger? This will contact emergency services and your emergency contacts.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Call Emergency', 
          style: 'destructive',
          onPress: () => navigation.navigate('Emergency')
        },
      ]
    );
  };

  const handleGoToLogin = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleTestCriticalScore = async () => {
    Alert.alert('Test Critical Score', 'Simulating critical health score.\nCancel within 15 seconds to stop emergency messaging.\nIf not cancelled, emergency contacts will be notified with your location.');
    setOverallScore(25);
    setScoreGrade('F');
    lastHealthAlertBucket.current = null;

    scheduleEmergencyDispatch(25);
  };

  const handleCancelEmergency = () => {
    Alert.alert('Cancel Emergency', 'Are you sure you want to cancel the emergency alert?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          if (emergencyTimerRef.current) {
            clearTimeout(emergencyTimerRef.current);
            emergencyTimerRef.current = null;
          }
          setEmergencyActive(false);
          setOverallScore(null);
          setScoreGrade(null);
          lastHealthAlertBucket.current = null;

          // Notify emergency contacts only if alert was already dispatched.
          if (emergencyAlertDispatched) {
            try {
              await emergencyContactService.sendEmergencyCancellation(userName);
            } catch (error) {
              console.error('Failed to notify contacts of cancellation:', error);
            }
          }

          setEmergencyAlertDispatched(false);
        },
      },
    ]);
  };

  const triggerEmergencyAlert = async (score: number): Promise<boolean> => {
    try {
      // Request location permission
      const hasPermission = await geolocationService.requestLocationPermission();
      
      if (hasPermission) {
        // Get current location
        const location = await geolocationService.getCurrentLocation();
        setEmergencyLocation({
          latitude: location.latitude,
          longitude: location.longitude,
        });

        const mapsUrl = geolocationService.getGoogleMapsUrl(
          location.latitude,
          location.longitude
        );

        // Send emergency alerts to contacts with location
        const notifications = await emergencyContactService.sendEmergencyAlert(
          location,
          mapsUrl,
          userName,
          score
        );

        const delivered = notifications.some(notification => notification.status === 'sent');

        // Fallback: if provider delivery failed, open SMS composer with live location.
        if (!delivered) {
          const contacts = await emergencyService.getEmergencyContacts();
          const phoneNumbers = (contacts.data || []).map(contact => contact.phoneNumber);
          await emergencyService.shareLocationViaSMSBulk(
            phoneNumbers,
            location.latitude,
            location.longitude
          );
          return true;
        }

        console.log('Emergency alerts sent to emergency contacts with location');
        return true;
      } else {
        console.warn('Location permission denied, attempting to send alerts without location');
        const notifications = await emergencyContactService.sendEmergencyAlert(
          { latitude: 0, longitude: 0, accuracy: 0, timestamp: Date.now() },
          '',
          userName,
          score
        );

        return notifications.some(notification => notification.status === 'sent');
      }
    } catch (error) {
      console.error('Error triggering emergency alert:', error);
      return false;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Welcome Header */}
        <LinearGradient
          colors={colors.gradients.primary}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.welcomeText}>{greeting}! 👋</Text>
              <Text style={styles.nameText}>{userName}</Text>
              <Text style={styles.subtitleText}>How are you feeling today?</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.loginButton} onPress={handleGoToLogin}>
                <Text style={styles.loginButtonText}>Login</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('PersonalInfo')}>
                <Avatar.Icon
                  size={60}
                  icon="account"
                  style={styles.avatar}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Health Score Card */}
          <Card style={styles.healthScoreCard}>
            <Card.Content style={styles.healthScoreContent}>
              {overallScore !== null ? (
                <>
                  <View style={styles.healthScoreLeft}>
                    <Text style={styles.healthScoreLabel}>Overall Health Score</Text>
                    <View style={styles.scoreRow}>
                      <Text style={styles.healthScoreValue}>{overallScore}</Text>
                      <View style={styles.gradeBadge}>
                        <Text style={styles.gradeText}>{scoreGrade}</Text>
                      </View>
                    </View>
                    <Chip
                      icon="trending-up"
                      style={styles.trendChip}
                      textStyle={styles.trendText}
                    >
                      AI-Powered Analysis
                    </Chip>
                  </View>
                  <View style={styles.healthScoreRight}>
                    <View style={styles.circleProgress}>
                      <Text style={styles.circleText}>{overallScore}%</Text>
                    </View>
                    <View style={styles.subscores}>
                      <View style={styles.subscoreItem}>
                        <Icon name="fitness-center" size={14} color={colors.secondary} />
                        <Text style={styles.subscoreText}>{physicalScore}</Text>
                      </View>
                      <View style={styles.subscoreItem}>
                        <Icon name="psychology" size={14} color={colors.tertiary} />
                        <Text style={styles.subscoreText}>{mentalScore}</Text>
                      </View>
                    </View>
                  </View>
                </>
              ) : (
                <View style={{ flex: 1 }}>
                  <Text style={styles.healthScoreLabel}>Overall Health Score</Text>
                  <Text style={[styles.healthScoreValue, { fontSize: 16, marginTop: 6 }]}>Not available yet</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4 }}>
                    Complete the steps below to see your score:
                  </Text>
                  <Text style={{ color: !hasHealthConnectData ? '#FFD54F' : 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4 }}>
                    {!hasHealthConnectData ? '⚠ ' : '✓ '}Connect Health Tracking
                  </Text>
                  <Text style={{ color: !hasMentalData ? '#FFD54F' : 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 }}>
                    {!hasMentalData ? '⚠ ' : '✓ '}Log Mood or Complete Mental Assessment
                  </Text>
                </View>
              )}
            </Card.Content>
          </Card>
        </LinearGradient>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.quickActionCard, { backgroundColor: action.bgColor }]}
                onPress={action.onPress}
                activeOpacity={0.8}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: action.color + '20' }]}>
                  <Icon name={action.icon} size={28} color={action.color} />
                </View>
                <Text style={[styles.quickActionTitle, { color: action.color }]}>
                  {action.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Health Stats Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Health</Text>
          
          {/* Steps Card */}
          <Card style={styles.statCard}>
            <Card.Content>
              <View style={styles.statHeader}>
                <View>
                  <Text style={styles.statTitle}>Daily Steps</Text>
                  <Text style={styles.statValue}>
                    {healthStats.dailySteps.toLocaleString()}
                  </Text>
                  <Text style={styles.statSubtitle}>
                    Goal: {healthStats.stepGoal.toLocaleString()}
                  </Text>
                </View>
                <View style={[styles.statIcon, { backgroundColor: colors.primaryContainer }]}>
                  <Icon name="directions-walk" size={28} color={colors.primary} />
                </View>
              </View>
              <ProgressBar
                progress={healthStats.dailySteps / healthStats.stepGoal}
                color={colors.primary}
                style={styles.progressBar}
              />
              <Text style={styles.progressText}>
                {Math.round((healthStats.dailySteps / healthStats.stepGoal) * 100)}% of goal
              </Text>
            </Card.Content>
          </Card>

          {/* Water & Sleep Row */}
          <View style={styles.statRow}>
            <Card style={styles.halfCard}>
              <Card.Content style={styles.halfCardContent}>
                <Icon name="water-drop" size={24} color={colors.info} />
                <Text style={styles.halfCardTitle}>Water</Text>
                <Text style={styles.halfCardValue}>
                  {healthStats.waterIntake}/{healthStats.waterGoal}
                </Text>
                <Text style={styles.halfCardUnit}>glasses</Text>
                <ProgressBar
                  progress={healthStats.waterIntake / healthStats.waterGoal}
                  color={colors.info}
                  style={styles.miniProgressBar}
                />
              </Card.Content>
            </Card>
            
            <Card style={styles.halfCard}>
              <Card.Content style={styles.halfCardContent}>
                <Icon name="bedtime" size={24} color={colors.tertiary} />
                <Text style={styles.halfCardTitle}>Sleep</Text>
                <Text style={styles.halfCardValue}>
                  {healthStats.sleepHours}
                </Text>
                <Text style={styles.halfCardUnit}>hours</Text>
                <ProgressBar
                  progress={healthStats.sleepHours / healthStats.sleepGoal}
                  color={colors.tertiary}
                  style={styles.miniProgressBar}
                />
              </Card.Content>
            </Card>
          </View>

          {/* Heart Rate & Mood Row */}
          <View style={styles.statRow}>
            <Card style={styles.halfCard}>
              <Card.Content style={styles.halfCardContent}>
                <Icon name="favorite" size={24} color={colors.error} />
                <Text style={styles.halfCardTitle}>Heart Rate</Text>
                <Text style={styles.halfCardValue}>{healthStats.heartRate}</Text>
                <Text style={styles.halfCardUnit}>bpm</Text>
                <Chip 
                  style={[styles.statusChip, { backgroundColor: colors.successContainer }]}
                  textStyle={{ color: colors.success, fontSize: 10 }}
                >
                  Normal
                </Chip>
              </Card.Content>
            </Card>
            
            <Card style={styles.halfCard}>
              <Card.Content style={styles.halfCardContent}>
                <Text style={styles.moodEmoji}>😊</Text>
                <Text style={styles.halfCardTitle}>Mood</Text>
                <Text style={styles.halfCardValue}>{healthStats.moodScore}/10</Text>
                <Text style={styles.halfCardUnit}>feeling good</Text>
              </Card.Content>
            </Card>
          </View>
        </View>

        {/* Health Connect Setup */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Health Data Source</Text>
          <Card style={styles.statCard}>
            <Card.Content>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.statTitle, { fontSize: 15 }]}>
                    {hcConnected ? '💚 Health Connect' : '📱 Health Connect'}
                  </Text>
                  <Text style={[styles.statSubtitle, { marginTop: 2 }]}>
                    {hcConnected ? 'Connected — data syncing' : 'Connect to track your physical health'}
                  </Text>
                </View>
                <Button
                  mode={hcConnected ? 'outlined' : 'contained'}
                  onPress={hcConnected ? checkReadinessAndCalculate : connectHealthConnect}
                  loading={hcConnecting}
                  disabled={hcConnecting}
                  style={{ borderRadius: 20 }}
                >
                  {hcConnected ? 'Sync' : 'Connect'}
                </Button>
              </View>
            </Card.Content>
          </Card>
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Emergency FAB */}
      <FAB
        icon="phone-alert"
        style={styles.fab}
        color="white"
        onPress={handleEmergencySOS}
      />

      {/* Dev Test Button for Critical Score */}
      <TouchableOpacity
        style={styles.testButton}
        onPress={handleTestCriticalScore}
      >
        <Icon name="error" size={32} color="white" />
        <Text style={styles.testButtonText}>TEST</Text>
      </TouchableOpacity>

      {/* Emergency Cancel Button - Shows when emergency is active */}
      {emergencyActive && (
        <TouchableOpacity
          style={styles.cancelEmergencyButton}
          onPress={handleCancelEmergency}
        >
          <Icon name="close" size={28} color="white" />
          <Text style={styles.cancelButtonText}>CANCEL</Text>
        </TouchableOpacity>
      )}
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 60,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  welcomeText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  nameText: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginTop: 4,
  },
  subtitleText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  loginButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
  },
  avatar: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  healthScoreCard: {
    marginTop: 20,
    borderRadius: 20,
    elevation: 4,
  },
  healthScoreContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
  },
  healthScoreLeft: {
    flex: 1,
  },
  healthScoreLabel: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  healthScoreValue: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.primary,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  gradeBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gradeText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  trendChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.successContainer,
    marginTop: 8,
  },
  trendText: {
    color: colors.success,
    fontSize: 12,
  },
  healthScoreRight: {
    alignItems: 'center',
  },
  circleProgress: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primaryContainer,
  },
  circleText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  subscores: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  subscoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  subscoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurface,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.onSurface,
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: (width - 48) / 2,
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  statCard: {
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  statTitle: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.onSurface,
    marginTop: 4,
  },
  statSubtitle: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  statIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.outlineVariant,
  },
  progressText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 8,
    textAlign: 'right',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  halfCard: {
    width: (width - 44) / 2,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  halfCardContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  halfCardTitle: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 8,
  },
  halfCardValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.onSurface,
    marginTop: 4,
  },
  halfCardUnit: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  miniProgressBar: {
    height: 4,
    borderRadius: 2,
    width: '80%',
    marginTop: 8,
    backgroundColor: colors.outlineVariant,
  },
  statusChip: {
    marginTop: 8,
    height: 24,
  },
  moodEmoji: {
    fontSize: 28,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    backgroundColor: colors.error,
  },
  testButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 75,
    height: 75,
    borderRadius: 37.5,
    backgroundColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    borderWidth: 3,
    borderColor: '#FFB74D',
  },
  testButtonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  cancelEmergencyButton: {
    position: 'absolute',
    left: 20,
    bottom: 20,
    width: 75,
    height: 75,
    borderRadius: 37.5,
    backgroundColor: '#F44336',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#F44336',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    borderWidth: 3,
    borderColor: '#EF5350',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 4,
  },
});

export default DashboardScreen;
