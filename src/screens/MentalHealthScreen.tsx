import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  Text,
  Card,
  IconButton,
  Chip,
  Button,
  Portal,
  Snackbar,
  Modal,
  ProgressBar,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { colors } from '../styles/theme';
import {
  type MentalHealthInput,
} from '../services/aiHealthService';
import { loadMLModels, type MentalHealthResult } from '../ml';
import { getMLMentalHealthScore } from '../services/mlHealthBridge';
import mentalHealthService from '../services/mentalHealthService';
import { wearableService } from '../services/healthConnect';

const { width } = Dimensions.get('window');

const affirmations = [
  { text: "I am worthy of love and respect", emoji: "💖" },
  { text: "I embrace my uniqueness and individuality", emoji: "✨" },
  { text: "I choose peace and calm over worry", emoji: "🌸" },
  { text: "I am stronger than my challenges", emoji: "💪" },
  { text: "Today I choose happiness and joy", emoji: "☀️" },
  { text: "I am grateful for all that I have", emoji: "🙏" },
  { text: "I trust in my ability to succeed", emoji: "🌟" },
  { text: "I am confident and capable", emoji: "🦋" },
  { text: "I deserve to feel good about myself", emoji: "🌈" },
  { text: "I am in control of my thoughts", emoji: "🧘" }
];

const moods = [
  { id: 1, emoji: '😊', label: 'Happy', value: 5, color: '#4CAF50' },
  { id: 2, emoji: '😌', label: 'Calm', value: 4, color: '#2196F3' },
  { id: 3, emoji: '😐', label: 'Neutral', value: 3, color: '#FF9800' },
  { id: 4, emoji: '😔', label: 'Sad', value: 2, color: '#9C27B0' },
  { id: 5, emoji: '😰', label: 'Anxious', value: 1, color: '#F44336' }
];

const weekDayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

interface MoodEntry {
  value: number;
  date: string; // YYYY-MM-DD in local time
}

const getDateKey = (input?: Date | string) => {
  const date = input ? new Date(input) : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCurrentWeekDateKeys = () => {
  const today = new Date();
  const mondayOffset = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(today.getDate() - mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    return getDateKey(day);
  });
};

const getMoodEmojiFromValue = (value?: number) => {
  if (!value) return '•';
  if (value >= 5) return '😊';
  if (value === 4) return '😌';
  if (value === 3) return '😐';
  if (value === 2) return '😔';
  return '😰';
};

const recommendedActivities = [
  {
    id: 1,
    title: 'Guided Meditation',
    duration: '10 min',
    icon: '🧘',
    color: colors.tertiary,
    bgColor: colors.tertiaryContainer
  },
  {
    id: 2,
    title: 'Breathing Exercise',
    duration: '5 min',
    icon: '🌬️',
    color: colors.primary,
    bgColor: colors.primaryContainer
  },
  {
    id: 3,
    title: 'Gratitude Journal',
    duration: '3 min',
    icon: '📝',
    color: colors.secondary,
    bgColor: colors.secondaryContainer
  },
  {
    id: 4,
    title: 'Calming Sounds',
    duration: '15 min',
    icon: '🎵',
    color: '#7E57C2',
    bgColor: '#EDE7F6'
  }
];

const MENTAL_ASSESSMENT_STORAGE_KEY = 'mentalAssessmentData';
const LEGACY_DEFAULT_MOOD_HISTORY = [4, 4, 4, 4, 3, 4, 4];
const MENTAL_SCORE_CACHE_KEY = 'latestMentalModuleScore';

const MentalHealthScreen = () => {
  const navigation = useNavigation();
  const [selectedMood, setSelectedMood] = useState<typeof moods[0] | null>(null);
  const [currentAffirmation, setCurrentAffirmation] = useState(0);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [mentalHealthResult, setMentalHealthResult] = useState<MentalHealthResult | null>(null);
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [moodHistory, setMoodHistory] = useState<number[]>([]); // Last 7 entries
  const [scoringSource, setScoringSource] = useState<'assessment' | 'blended'>('assessment');
  
  // Assessment inputs
  const [stressLevel, setStressLevel] = useState<1|2|3|4|5>(2);
  const [anxietyLevel, setAnxietyLevel] = useState<1|2|3|4|5>(2);
  const [energyLevel, setEnergyLevel] = useState<1|2|3|4|5>(4);
  const [socialInteraction, setSocialInteraction] = useState<'isolated'|'minimal'|'moderate'|'active'>('moderate');
  const [hasNegativeThoughts, setHasNegativeThoughts] = useState<boolean>(false);
  const [hasConcentrationIssues, setHasConcentrationIssues] = useState<boolean>(false);
  const [hasSelfHarmThoughts, setHasSelfHarmThoughts] = useState<boolean>(false);

  const streak = moodEntries.length;
  const weekDateKeys = getCurrentWeekDateKeys();
  const moodByDate = moodEntries.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.date] = entry.value;
    return acc;
  }, {});
  const weekMoodValues = weekDateKeys.map(dateKey => moodByDate[dateKey]);

  useEffect(() => {
    const loadSavedAssessment = async () => {
      try {
        const savedData = await AsyncStorage.getItem(MENTAL_ASSESSMENT_STORAGE_KEY);
        if (!savedData) return;

        const parsed = JSON.parse(savedData);

        if (parsed?.stressLevel >= 1 && parsed?.stressLevel <= 5) {
          setStressLevel(parsed.stressLevel);
        }
        if (parsed?.anxietyLevel >= 1 && parsed?.anxietyLevel <= 5) {
          setAnxietyLevel(parsed.anxietyLevel);
        }
        if (parsed?.energyLevel >= 1 && parsed?.energyLevel <= 5) {
          setEnergyLevel(parsed.energyLevel);
        }
        if (['isolated', 'minimal', 'moderate', 'active'].includes(parsed?.socialInteraction)) {
          setSocialInteraction(parsed.socialInteraction);
        }
        if (typeof parsed?.hasNegativeThoughts === 'boolean') setHasNegativeThoughts(parsed.hasNegativeThoughts);
        if (typeof parsed?.hasConcentrationIssues === 'boolean') setHasConcentrationIssues(parsed.hasConcentrationIssues);
        if (typeof parsed?.hasSelfHarmThoughts === 'boolean') setHasSelfHarmThoughts(parsed.hasSelfHarmThoughts);
        if (Array.isArray(parsed?.moodEntries) && parsed.moodEntries.length > 0) {
          const normalizedEntries = parsed.moodEntries
            .map((entry: any) => ({
              value: Number(entry?.value),
              date: typeof entry?.date === 'string' ? getDateKey(entry.date) : '',
            }))
            .filter((entry: MoodEntry) => entry.value >= 1 && entry.value <= 5 && entry.date);

          setMoodEntries(normalizedEntries);
          setMoodHistory(normalizedEntries.map((entry: MoodEntry) => entry.value).slice(-7));
        } else if (Array.isArray(parsed?.moodHistory) && parsed.moodHistory.length > 0) {
          const savedHistory = parsed.moodHistory.slice(-7);
          const isLegacySeededHistory =
            savedHistory.length === LEGACY_DEFAULT_MOOD_HISTORY.length &&
            savedHistory.every((value: number, index: number) => value === LEGACY_DEFAULT_MOOD_HISTORY[index]);

          if (isLegacySeededHistory) {
            setMoodHistory([]);
            setMoodEntries([]);
          } else {
            const today = new Date();
            const fallbackEntries: MoodEntry[] = savedHistory.map((value: number, index: number) => {
              const date = new Date(today);
              date.setDate(today.getDate() - (savedHistory.length - 1 - index));
              return { value, date: getDateKey(date) };
            });
            setMoodEntries(fallbackEntries);
            setMoodHistory(savedHistory);
          }
        }
        if (parsed?.currentMoodValue >= 1 && parsed?.currentMoodValue <= 5) {
          const matchedMood = moods.find(mood => mood.value === parsed.currentMoodValue) || null;
          setSelectedMood(matchedMood);
        }
      } catch (error) {
        console.error('Load saved mental assessment error:', error);
      }
    };

    loadSavedAssessment();
  }, []);

  const persistAssessmentData = async (
    moodValue?: number,
    updatedMoodHistory?: number[],
    updatedMoodEntries?: MoodEntry[]
  ) => {
    try {
      const resolvedMoodValue = moodValue ?? selectedMood?.value;
      const entriesToPersist = updatedMoodEntries ?? moodEntries;
      await AsyncStorage.setItem(
        MENTAL_ASSESSMENT_STORAGE_KEY,
        JSON.stringify({
          currentMoodValue: resolvedMoodValue,
          stressLevel,
          anxietyLevel,
          energyLevel,
          socialInteraction,
          hasNegativeThoughts,
          hasConcentrationIssues,
          hasSelfHarmThoughts,
          moodHistory: updatedMoodHistory ?? moodHistory,
          moodEntries: entriesToPersist,
          updatedAt: new Date().toISOString(),
        })
      );
      await AsyncStorage.setItem('mentalHealthCompleted', 'true');
    } catch (error) {
      console.error('Persist mental assessment error:', error);
    }
  };

  const persistDailyMentalHealthRecord = async (moodValue?: number, notes?: string) => {
    try {
      const resolvedMoodValue = moodValue ?? selectedMood?.value ?? moodEntries[moodEntries.length - 1]?.value ?? 3;
      await mentalHealthService.saveDailyMentalHealthRecord({
        date: new Date().toISOString(),
        mood: {
          overall: resolvedMoodValue,
          notes,
        },
        stressLevel,
        anxietyLevel,
        energyLevel,
        motivationLevel: energyLevel,
        socialInteraction,
        notes,
      });
    } catch (error) {
      console.error('Persist daily mental health record error:', error);
    }
  };

  const calculateScore = async () => {
        const resolvedMoodValue = selectedMood?.value ?? moodEntries[moodEntries.length - 1]?.value;
        if (!resolvedMoodValue) {
          setMentalHealthResult(null);
          return;
        }

    const clampLikert = (value: number) => Math.max(1, Math.min(5, Math.round(value))) as 1 | 2 | 3 | 4 | 5;
    const blendLikert = (assessmentValue: number, wearableValue: number, wearableWeight: number) => {
      return clampLikert(assessmentValue * (1 - wearableWeight) + wearableValue * wearableWeight);
    };

    let wearableStress = 3;
    let wearableAnxiety = 3;
    let wearableEnergy = 3;
    let wearableSleepQuality: 1 | 2 | 3 | 4 | 5 | undefined;
    let wearableSleepHours: number | undefined;
    let wearableExerciseFrequency: 'none' | 'rarely' | 'weekly' | 'daily' = 'weekly';
    let hasRealtimeSignal = false;

    try {
      const wearableResult = await wearableService.fetchAllHealthData();
      const data = wearableResult.data;

      const sleepHours = (data.sleepDurationMinutes ?? 0) / 60;
      const steps = data.steps ?? 0;
      const heartRate = data.heartRate ?? 0;

      if (sleepHours > 0) {
        wearableSleepHours = sleepHours;
        wearableSleepQuality =
          sleepHours >= 8 ? 5 :
          sleepHours >= 7 ? 4 :
          sleepHours >= 6 ? 3 :
          2;
        hasRealtimeSignal = true;
      }

      if (steps >= 10000) wearableExerciseFrequency = 'daily';
      else if (steps >= 6000) wearableExerciseFrequency = 'weekly';
      else if (steps >= 2500) wearableExerciseFrequency = 'rarely';
      else wearableExerciseFrequency = 'none';

      if (steps > 0) {
        hasRealtimeSignal = true;
      }

      wearableStress =
        sleepHours < 5.5 ? 5 :
        sleepHours < 6.5 ? 4 :
        sleepHours < 7.5 ? 3 : 2;

      wearableAnxiety = heartRate >= 95 ? 4 : heartRate >= 85 ? 3 : 2;
      wearableEnergy =
        sleepHours >= 8 && steps >= 8000 ? 5 :
        sleepHours >= 7 && steps >= 5000 ? 4 :
        sleepHours >= 6 ? 3 : 2;

      if (heartRate > 0) {
        hasRealtimeSignal = true;
      }
    } catch (error) {
      console.warn('Wearable fetch failed for mental scoring:', error);
    }

    const mergedStress = hasRealtimeSignal ? blendLikert(stressLevel, wearableStress, 0.4) : stressLevel;
    const mergedAnxiety = hasRealtimeSignal ? blendLikert(anxietyLevel, wearableAnxiety, 0.35) : anxietyLevel;
    const mergedEnergy = hasRealtimeSignal ? blendLikert(energyLevel, wearableEnergy, 0.45) : energyLevel;

    const input: MentalHealthInput = {
      currentMood: resolvedMoodValue as 1|2|3|4|5,
      moodHistory: moodEntries.map(entry => entry.value).slice(-7),
      stressLevel: mergedStress,
      anxietyLevel: mergedAnxiety,
      energyLevel: mergedEnergy,
      motivationLevel: mergedEnergy,
      sleepQuality: wearableSleepQuality,
      sleepHours: wearableSleepHours,
      socialInteraction: socialInteraction,
      exerciseFrequency: wearableExerciseFrequency,
      meditationPractice: false,
      hasNegativeThoughts: hasNegativeThoughts,
      hasConcentrationIssues: hasConcentrationIssues,
      hasSelfHarmThoughts: hasSelfHarmThoughts,
    };

    await loadMLModels();
    const result = getMLMentalHealthScore(input);
    setMentalHealthResult(result);
    setScoringSource(hasRealtimeSignal ? 'blended' : 'assessment');
    await AsyncStorage.setItem(
      MENTAL_SCORE_CACHE_KEY,
      JSON.stringify({
        score: result.score,
        updatedAt: new Date().toISOString(),
      })
    );
  };

  const handleMoodSelect = (mood: typeof moods[0]) => {
    setSelectedMood(mood);
    // Update mood history
    const todayKey = getDateKey();
    const newEntries = [
      ...moodEntries.filter(entry => entry.date !== todayKey),
      { value: mood.value, date: todayKey },
    ]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);
    setMoodEntries(newEntries);

    const newHistory = newEntries.map(entry => entry.value).slice(-7);
    setMoodHistory(newHistory);
    persistAssessmentData(mood.value, newHistory, newEntries);
    void persistDailyMentalHealthRecord(mood.value, `Mood logged: ${mood.label}`);
    void calculateScore();
    setSnackbarMessage(`Mood logged: ${mood.label}`);
    setSnackbarVisible(true);
  };

  const handleNextAffirmation = () => {
    setCurrentAffirmation((prev) => (prev + 1) % affirmations.length);
  };

  const handleActivityPress = (activity: typeof recommendedActivities[0]) => {
    setSnackbarMessage(`Starting ${activity.title}...`);
    setSnackbarVisible(true);
  };

  const handleTakeAssessment = () => {
    setShowAssessmentModal(true);
  };

  const handleSubmitAssessment = () => {
    void calculateScore();
    persistAssessmentData();
    void persistDailyMentalHealthRecord(undefined, 'Assessment completed');
    setShowAssessmentModal(false);
    setSnackbarMessage('Assessment complete!');
    setSnackbarVisible(true);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Thriving': return colors.success;
      case 'Healthy': return colors.secondary;
      case 'Coping': return colors.warning;
      case 'Struggling': return '#FF5722';
      case 'Crisis': return colors.error;
      default: return colors.primary;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low': return colors.success;
      case 'Moderate': return colors.warning;
      case 'High': return '#FF5722';
      case 'Severe': return colors.error;
      default: return colors.primary;
    }
  };

  const renderLevelOptions = (
    value: 1 | 2 | 3 | 4 | 5,
    onSelect: (newValue: 1 | 2 | 3 | 4 | 5) => void
  ) => (
    <View style={styles.selectorRow}>
      {[1, 2, 3, 4, 5].map(option => (
        <Chip
          key={option}
          selected={value === option}
          onPress={() => onSelect(option as 1 | 2 | 3 | 4 | 5)}
          style={[styles.levelChip, value === option && { backgroundColor: colors.primaryContainer }]}
          textStyle={{ color: value === option ? colors.primary : colors.text }}
        >
          {option}
        </Chip>
      ))}
    </View>
  );

  const hasAssessmentResult = Boolean(mentalHealthResult);
  const mentalScore = mentalHealthResult?.score ?? null;
  const mentalCategory = mentalHealthResult?.category ?? 'Not assessed';
  const mentalRisk = mentalHealthResult?.riskLevel ?? 'Not assessed';
  const confidencePercent = Math.round((mentalHealthResult?.confidence ?? 0.5) * 100);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={colors.gradients.mental} style={styles.header}>
        <View style={styles.headerContent}>
          <IconButton
            icon="arrow-left"
            iconColor="white"
            size={24}
            onPress={() => navigation.goBack()}
          />
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Mental Wellness</Text>
            <Text style={styles.headerSubtitle}>Your safe space for mental health</Text>
          </View>
          <IconButton
            icon="brain"
            iconColor="white"
            size={24}
          />
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Mood Tracker Card */}
        <Card style={styles.moodCard}>
          <Card.Content>
            <View style={styles.moodHeader}>
              <Text style={styles.cardTitle}>How are you feeling?</Text>
              <Chip
                icon={() => <Icon name="local-fire-department" size={18} color="#FF5722" />}
                style={styles.streakChip}
                textStyle={styles.streakText}
              >
                {streak} day streak
              </Chip>
            </View>

            <View style={styles.moodOptions}>
              {moods.map((mood) => (
                <TouchableOpacity
                  key={mood.id}
                  style={[
                    styles.moodOption,
                    selectedMood?.id === mood.id && { backgroundColor: mood.color + '20', borderColor: mood.color }
                  ]}
                  onPress={() => handleMoodSelect(mood)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                  <Text style={[
                    styles.moodLabel,
                    selectedMood?.id === mood.id && { color: mood.color }
                  ]}>
                    {mood.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card.Content>
        </Card>

        {/* Week Overview */}
        <Card style={styles.weekCard}>
          <Card.Content>
            <Text style={styles.cardTitle}>This Week</Text>
            <View style={styles.weekRow}>
              {weekDayLabels.map((day, index) => (
                <View key={index} style={styles.dayColumn}>
                  <Text style={styles.dayEmoji}>{getMoodEmojiFromValue(weekMoodValues[index])}</Text>
                  <Text style={styles.dayLabel}>{day}</Text>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>

        {/* Mental Score */}
        <Card style={styles.scoreCard}>
          <Card.Content style={styles.scoreContent}>
            <View style={styles.scoreLeft}>
              <Text style={styles.scoreLabel}>Mental Wellness Score</Text>
              <Text style={styles.scoreValue}>{mentalScore !== null ? mentalScore : '--'}</Text>
              <Chip 
                icon="chart-line"
                style={styles.trendChip}
                textStyle={styles.trendText}
              >
                {hasAssessmentResult ? `${mentalCategory} • ${mentalRisk} Risk` : 'Complete assessment to view score'}
              </Chip>
            </View>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreCircleText}>{mentalScore !== null ? `${mentalScore}%` : '--'}</Text>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.insightsCard}>
          <Card.Content>
            <View style={styles.insightsHeader}>
              <Text style={styles.insightsTitle}>ML Insights</Text>
              <Button mode="outlined" onPress={handleTakeAssessment}>
                Update Assessment
              </Button>
            </View>

            <View style={styles.insightChipsRow}>
              <Chip
                style={[styles.infoChip, { backgroundColor: getCategoryColor(mentalCategory) + '26' }]}
                textStyle={[styles.infoChipText, { color: getCategoryColor(mentalCategory) }]}
              >
                Category: {mentalCategory}
              </Chip>
              <Chip
                style={[styles.infoChip, { backgroundColor: getRiskColor(mentalRisk) + '26' }]}
                textStyle={[styles.infoChipText, { color: getRiskColor(mentalRisk) }]}
              >
                Risk: {mentalRisk}
              </Chip>
            </View>

            <Text style={styles.confidenceLabel}>
              Model confidence: {hasAssessmentResult ? `${confidencePercent}%` : '--'}
            </Text>
            <Text style={styles.sourceLabel}>
              Input source: {hasAssessmentResult
                ? (scoringSource === 'blended' ? 'Assessment + Real-time wearable data' : 'Assessment only')
                : 'Not available'}
            </Text>
            <ProgressBar
              progress={hasAssessmentResult ? confidencePercent / 100 : 0}
              color={colors.primary}
              style={styles.confidenceBar}
            />

            {(mentalHealthResult?.copingStrategies?.length || 0) > 0 && (
              <View style={styles.tipsContainer}>
                <Text style={styles.tipsTitle}>Top coping tips</Text>
                {mentalHealthResult?.copingStrategies.slice(0, 3).map((tip, index) => (
                  <View key={index} style={styles.tipRow}>
                    <Icon name="check-circle" size={16} color={colors.primary} />
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Daily Affirmation */}
        <TouchableOpacity onPress={handleNextAffirmation} activeOpacity={0.9}>
          <Card style={styles.affirmationCard}>
            <LinearGradient colors={['#E8F5E9', '#C8E6C9']} style={styles.affirmationGradient}>
              <Card.Content style={styles.affirmationContent}>
                <Text style={styles.affirmationEmoji}>{affirmations[currentAffirmation].emoji}</Text>
                <Text style={styles.affirmationText}>"{affirmations[currentAffirmation].text}"</Text>
                <Text style={styles.tapHint}>Tap for new affirmation</Text>
              </Card.Content>
            </LinearGradient>
          </Card>
        </TouchableOpacity>

        {/* Recommended Activities */}
        <Text style={styles.sectionTitle}>Recommended for You</Text>
        <View style={styles.activitiesGrid}>
          {recommendedActivities.map((activity) => (
            <TouchableOpacity
              key={activity.id}
              style={[styles.activityCard, { backgroundColor: activity.bgColor }]}
              onPress={() => handleActivityPress(activity)}
              activeOpacity={0.8}
            >
              <Text style={styles.activityIcon}>{activity.icon}</Text>
              <Text style={[styles.activityTitle, { color: activity.color }]}>
                {activity.title}
              </Text>
              <Text style={styles.activityDuration}>{activity.duration}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Access */}
        <Text style={styles.sectionTitle}>Quick Access</Text>
        <View style={styles.quickAccessRow}>
          <Button
            mode="contained"
            icon="book"
            style={styles.quickButton}
            onPress={() => setSnackbarMessage('Journal coming soon!')}
          >
            Journal
          </Button>
          <Button
            mode="contained"
            icon="headphones"
            style={[styles.quickButton, { backgroundColor: colors.tertiary }]}
            onPress={() => setSnackbarMessage('Sounds coming soon!')}
          >
            Sounds
          </Button>
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>

      <Portal>
        <Modal
          visible={showAssessmentModal}
          onDismiss={() => setShowAssessmentModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Text style={styles.modalTitle}>Clinical Assessment (PHQ / GAD)</Text>
          <Text style={styles.modalSubtitle}>Over the last 2 weeks, how often have you been bothered by the following problems?</Text>

          <Text style={styles.metricLabel}>Feeling nervous, anxious, or on edge?</Text>
          <Text style={styles.hintText}>1 = Not at all, 5 = Nearly every day</Text>
          {renderLevelOptions(anxietyLevel, setAnxietyLevel)}

          <Text style={styles.metricLabel}>Feeling overwhelmed, or unable to cope?</Text>
          <Text style={styles.hintText}>1 = Not at all, 5 = Nearly every day</Text>
          {renderLevelOptions(stressLevel, setStressLevel)}

          <Text style={styles.metricLabel}>Feeling tired or having little energy?</Text>
          <Text style={styles.hintText}>1 = Always tired, 5 = Full of energy</Text>
          {renderLevelOptions(energyLevel, setEnergyLevel)}

          <Text style={styles.metricLabel}>Rate your social interaction</Text>
          <View style={styles.selectorRow}>
            {(['isolated', 'minimal', 'moderate', 'active'] as const).map(level => (
              <Chip
                key={level}
                selected={socialInteraction === level}
                onPress={() => setSocialInteraction(level)}
                style={[styles.levelChip, socialInteraction === level && { backgroundColor: colors.primaryContainer }]}
                textStyle={{ color: socialInteraction === level ? colors.primary : colors.text }}
              >
                {level}
              </Chip>
            ))}
          </View>

          <Text style={styles.metricLabel}>Have you been feeling bad about yourself, or that you are a failure?</Text>
          <View style={styles.selectorRow}>
            <Chip
              selected={hasNegativeThoughts}
              onPress={() => setHasNegativeThoughts(true)}
              style={[styles.levelChip, hasNegativeThoughts && { backgroundColor: colors.primaryContainer }]}
              textStyle={{ color: hasNegativeThoughts ? colors.primary : colors.text }}
            >Yes</Chip>
            <Chip
              selected={!hasNegativeThoughts}
              onPress={() => setHasNegativeThoughts(false)}
              style={[styles.levelChip, !hasNegativeThoughts && { backgroundColor: colors.primaryContainer }]}
              textStyle={{ color: !hasNegativeThoughts ? colors.primary : colors.text }}
            >No</Chip>
          </View>

          <Text style={styles.metricLabel}>Trouble concentrating on things, like reading or watching TV?</Text>
          <View style={styles.selectorRow}>
            <Chip
              selected={hasConcentrationIssues}
              onPress={() => setHasConcentrationIssues(true)}
              style={[styles.levelChip, hasConcentrationIssues && { backgroundColor: colors.primaryContainer }]}
              textStyle={{ color: hasConcentrationIssues ? colors.primary : colors.text }}
            >Yes</Chip>
            <Chip
              selected={!hasConcentrationIssues}
              onPress={() => setHasConcentrationIssues(false)}
              style={[styles.levelChip, !hasConcentrationIssues && { backgroundColor: colors.primaryContainer }]}
              textStyle={{ color: !hasConcentrationIssues ? colors.primary : colors.text }}
            >No</Chip>
          </View>

          <Text style={styles.metricLabel}>Thoughts that you would be better off dead, or of hurting yourself?</Text>
          <View style={styles.selectorRow}>
            <Chip
              selected={hasSelfHarmThoughts}
              onPress={() => setHasSelfHarmThoughts(true)}
              style={[styles.levelChip, hasSelfHarmThoughts && { backgroundColor: colors.primaryContainer }]}
              textStyle={{ color: hasSelfHarmThoughts ? colors.primary : colors.text }}
            >Yes</Chip>
            <Chip
              selected={!hasSelfHarmThoughts}
              onPress={() => setHasSelfHarmThoughts(false)}
              style={[styles.levelChip, !hasSelfHarmThoughts && { backgroundColor: colors.primaryContainer }]}
              textStyle={{ color: !hasSelfHarmThoughts ? colors.primary : colors.text }}
            >No</Chip>
          </View>

          <View style={styles.modalActions}>
            <Button mode="outlined" onPress={() => setShowAssessmentModal(false)} style={styles.modalActionButton}>
              Cancel
            </Button>
            <Button mode="contained" onPress={handleSubmitAssessment} style={styles.modalActionButton}>
              Save & Score
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
  contentContainer: {
    paddingTop: 16,
  },
  moodCard: {
    borderRadius: 16,
    marginBottom: 16,
  },
  moodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.onSurface,
  },
  streakChip: {
    backgroundColor: '#FFF3E0',
  },
  streakText: {
    color: '#FF5722',
    fontSize: 12,
  },
  moodOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moodOption: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  moodEmoji: {
    fontSize: 32,
  },
  moodLabel: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
  weekCard: {
    borderRadius: 16,
    marginBottom: 16,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  dayColumn: {
    alignItems: 'center',
  },
  dayEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  dayLabel: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  scoreCard: {
    borderRadius: 16,
    marginBottom: 16,
  },
  scoreContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreLeft: {
    flex: 1,
  },
  scoreLabel: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.tertiary,
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
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    borderColor: colors.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.tertiaryContainer,
  },
  scoreCircleText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.tertiary,
  },
  insightsCard: {
    borderRadius: 16,
    marginBottom: 16,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F3F6FF',
  },
  insightsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  infoChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  infoChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  confidenceLabel: {
    marginTop: 8,
    marginBottom: 6,
    fontSize: 13,
    color: '#EEF2FF',
    fontWeight: '600',
  },
  sourceLabel: {
    marginBottom: 6,
    fontSize: 13,
    color: '#D8E1FF',
    fontWeight: '500',
  },
  confidenceBar: {
    height: 8,
    borderRadius: 8,
  },
  tipsContainer: {
    marginTop: 12,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: colors.onSurface,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  tipText: {
    marginLeft: 8,
    flex: 1,
    color: colors.onSurfaceVariant,
    fontSize: 13,
  },
  modalContainer: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurface,
    marginTop: 8,
    marginBottom: 2,
  },
  hintText: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginBottom: 8,
  },
  selectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  levelChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8,
  },
  modalActionButton: {
    minWidth: 100,
  },
  affirmationCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  affirmationGradient: {
    borderRadius: 16,
  },
  affirmationContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  affirmationEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  affirmationText: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.secondary,
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 16,
  },
  tapHint: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.onSurface,
    marginBottom: 12,
    marginTop: 8,
  },
  activitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  activityCard: {
    width: (width - 44) / 2,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  activityIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  activityDuration: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
  quickAccessRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickButton: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
  },
});

export default MentalHealthScreen;
