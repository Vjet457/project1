import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Card, Chip, Divider } from 'react-native-paper';

import { colors } from '../styles/theme';
import healthService from '../services/healthService';
import mentalHealthService from '../services/mentalHealthService';

const { width } = Dimensions.get('window');

type HealthRecord = {
  _id?: string;
  date?: string;
  createdAt?: string;
  source?: string;
  vitals?: {
    heartRate?: number;
    bloodPressure?: { systolic?: number; diastolic?: number };
    bloodOxygen?: number;
  };
  activity?: {
    steps?: number;
    caloriesBurned?: number;
    activeMinutes?: number;
    distance?: number;
  };
  sleep?: {
    duration?: number;
    quality?: number;
  };
  healthScore?: {
    overall?: number;
  };
};

type MoodRecord = {
  id?: string;
  timestamp?: string;
  moodScore?: number;
  mood?: string;
  notes?: string;
};

type CombinedDay = {
  dateKey: string;
  dateLabel: string;
  healthRecord?: HealthRecord;
  moodRecord?: MoodRecord;
};

const getDateKey = (value?: string) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return value || '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDateLabel = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getMoodLabel = (score?: number) => {
  if (!score) return 'No mood';
  if (score >= 5) return 'Great';
  if (score === 4) return 'Good';
  if (score === 3) return 'Okay';
  if (score === 2) return 'Bad';
  return 'Poor';
};

const getMoodColor = (score?: number) => {
  if (!score) return colors.outline;
  if (score >= 5) return colors.success;
  if (score === 4) return colors.primary;
  if (score === 3) return colors.warning;
  return colors.error;
};

const HealthHistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [entries, setEntries] = useState<CombinedDay[]>([]);
  const [summary, setSummary] = useState({
    daysStored: 0,
    averageSteps: 0,
    averageMood: 0,
    averageHealthScore: 0,
  });

  const loadHistory = useCallback(async () => {
    try {
      const [healthHistoryResponse, moodHistoryResponse] = await Promise.all([
        healthService.getHealthHistory(30),
        mentalHealthService.getMoodHistory(
          new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString(),
          new Date().toISOString()
        ),
      ]);

      const healthRecords = Array.isArray(healthHistoryResponse.data) ? healthHistoryResponse.data : [];
      const moodRecords = Array.isArray(moodHistoryResponse.data) ? moodHistoryResponse.data : [];

      const dayMap = new Map<string, CombinedDay>();

      healthRecords.forEach((record: HealthRecord) => {
        const dateKey = getDateKey(record.date || record.createdAt);
        if (!dateKey) {
          return;
        }

        dayMap.set(dateKey, {
          dateKey,
          dateLabel: getDateLabel(record.date || record.createdAt || dateKey),
          healthRecord: record,
          moodRecord: dayMap.get(dateKey)?.moodRecord,
        });
      });

      moodRecords.forEach((record: MoodRecord) => {
        const dateKey = getDateKey(record.timestamp);
        if (!dateKey) {
          return;
        }

        const existing = dayMap.get(dateKey);
        dayMap.set(dateKey, {
          dateKey,
          dateLabel: existing?.dateLabel || getDateLabel(record.timestamp || dateKey),
          healthRecord: existing?.healthRecord,
          moodRecord: record,
        });
      });

      const combinedEntries = Array.from(dayMap.values()).sort((left, right) => right.dateKey.localeCompare(left.dateKey));

      const totalSteps = healthRecords.reduce((sum: number, record: HealthRecord) => sum + (record.activity?.steps || 0), 0);
      const totalMood = moodRecords.reduce((sum: number, record: MoodRecord) => sum + (record.moodScore || 0), 0);
      const totalHealthScore = healthRecords.reduce((sum: number, record: HealthRecord) => sum + (record.healthScore?.overall || 0), 0);

      setEntries(combinedEntries);
      setSummary({
        daysStored: combinedEntries.length,
        averageSteps: healthRecords.length > 0 ? Math.round(totalSteps / healthRecords.length) : 0,
        averageMood: moodRecords.length > 0 ? Math.round((totalMood / moodRecords.length) * 10) / 10 : 0,
        averageHealthScore: healthRecords.length > 0 ? Math.round(totalHealthScore / healthRecords.length) : 0,
      });
    } catch (error) {
      console.error('Load history error:', error);
      setEntries([]);
      setSummary({
        daysStored: 0,
        averageSteps: 0,
        averageMood: 0,
        averageHealthScore: 0,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadHistory();
    }, [loadHistory])
  );

  const summaryCards = useMemo(
    () => [
      { label: 'Days Stored', value: summary.daysStored.toString(), icon: 'calendar-range', color: colors.primary },
      { label: 'Avg Steps', value: summary.averageSteps.toLocaleString(), icon: 'walk', color: colors.success },
      { label: 'Avg Mood', value: summary.averageMood ? summary.averageMood.toString() : '--', icon: 'emoticon-outline', color: colors.secondary },
      { label: 'Avg Score', value: summary.averageHealthScore ? summary.averageHealthScore.toString() : '--', icon: 'heart-pulse', color: colors.tertiary },
    ],
    [summary]
  );

  const renderMetric = (label: string, value: string | number | undefined) => (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value ?? '--'}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={colors.gradients.primary} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('Dashboard' as never);
              }
            }}
          >
            <Icon name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Health History</Text>
            <Text style={styles.headerSubtitle}>Stored daily records from previous days</Text>
          </View>
          <View style={styles.headerButton} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadHistory(); }} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryGrid}>
          {summaryCards.map(card => (
            <Card key={card.label} style={styles.summaryCard}>
              <Card.Content style={styles.summaryContent}>
                <View style={[styles.summaryIcon, { backgroundColor: `${card.color}20` }]}>
                  <Icon name={card.icon} size={22} color={card.color} />
                </View>
                <Text style={styles.summaryValue}>{card.value}</Text>
                <Text style={styles.summaryLabel}>{card.label}</Text>
              </Card.Content>
            </Card>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading stored history...</Text>
          </View>
        ) : entries.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <Icon name="calendar-remove" size={56} color={colors.outline} />
              <Text style={styles.emptyTitle}>No history yet</Text>
              <Text style={styles.emptyText}>
                Daily health and mood data will appear here after the app syncs or you log a mood.
              </Text>
            </Card.Content>
          </Card>
        ) : (
          entries.map(entry => {
            const health = entry.healthRecord;
            const mood = entry.moodRecord;

            return (
              <Card key={entry.dateKey} style={styles.entryCard}>
                <Card.Content>
                  <View style={styles.entryHeader}>
                    <View>
                      <Text style={styles.entryDate}>{entry.dateLabel}</Text>
                      <Text style={styles.entrySubtitle}>
                        {health ? 'Health record stored' : 'Mood record stored'}
                        {health && mood ? ' · combined day' : ''}
                      </Text>
                    </View>
                    <Chip style={[styles.moodChip, { backgroundColor: `${getMoodColor(mood?.moodScore)}20` }]} textStyle={{ color: getMoodColor(mood?.moodScore) }}>
                      {getMoodLabel(mood?.moodScore)}
                    </Chip>
                  </View>

                  <Divider style={styles.divider} />

                  <View style={styles.metricsGrid}>
                    {renderMetric('Steps', health?.activity?.steps ? health.activity.steps.toLocaleString() : '--')}
                    {renderMetric('Heart rate', health?.vitals?.heartRate ? `${health.vitals.heartRate} bpm` : '--')}
                    {renderMetric('Sleep', health?.sleep?.duration ? `${health.sleep.duration.toFixed(1)} hrs` : '--')}
                    {renderMetric('Mood score', mood?.moodScore ? `${mood.moodScore}/5` : '--')}
                    {renderMetric('Health score', health?.healthScore?.overall ? `${health.healthScore.overall}/100` : '--')}
                    {renderMetric('Source', health?.source || 'mental-health')}
                  </View>

                  {mood?.notes ? (
                    <View style={styles.notesBox}>
                      <Text style={styles.notesLabel}>Mood note</Text>
                      <Text style={styles.notesText}>{mood.notes}</Text>
                    </View>
                  ) : null}
                </Card.Content>
              </Card>
            );
          })
        )}

        <View style={{ height: 96 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    marginTop: -12,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  summaryCard: {
    width: (width - 44) / 2,
    borderRadius: 18,
    elevation: 2,
    backgroundColor: colors.surface,
  },
  summaryContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.onSurface,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 4,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 10,
    color: colors.onSurfaceVariant,
  },
  emptyCard: {
    marginTop: 24,
    borderRadius: 22,
    backgroundColor: colors.surface,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
    marginTop: 12,
  },
  emptyText: {
    marginTop: 8,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
  entryCard: {
    borderRadius: 20,
    marginTop: 14,
    backgroundColor: colors.surface,
    elevation: 2,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  entryDate: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.onSurface,
  },
  entrySubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  moodChip: {
    borderRadius: 999,
  },
  divider: {
    marginVertical: 14,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricRow: {
    width: '48%',
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 15,
    color: colors.onSurface,
    fontWeight: '600',
  },
  notesBox: {
    marginTop: 6,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.surfaceVariant,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
    marginBottom: 4,
  },
  notesText: {
    color: colors.onSurface,
    lineHeight: 20,
  },
});

export default HealthHistoryScreen;
