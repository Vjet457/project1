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
  Button,
  IconButton,
  ProgressBar,
  Portal,
  Modal,
  TextInput,
  Chip,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { colors } from '../styles/theme';
import {
  calculatePhysicalHealthScore,
  type PhysicalHealthInput,
  type PhysicalHealthScore,
} from '../services/aiHealthService';
import { loadMLModels } from '../ml';
import { getMLPhysicalHealthScore } from '../services/mlHealthBridge';
import { wearableService } from '../services/healthConnect';

const { width } = Dimensions.get('window');
const PHYSICAL_SCORE_CACHE_KEY = 'latestPhysicalModuleScore';

const PhysicalHealthScreen = () => {
  const navigation = useNavigation();
  const [healthScore, setHealthScore] = useState<PhysicalHealthScore | null>(null);
  const [mlPhysicalResult, setMlPhysicalResult] = useState<ReturnType<typeof getMLPhysicalHealthScore> | null>(null);
  const [showInputModal, setShowInputModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncSource, setSyncSource] = useState<'realtime' | 'manual'>('manual');

  // Health input values
  const [vitals, setVitals] = useState({
    heartRate: '72',
    bloodPressureSystolic: '120',
    bloodPressureDiastolic: '80',
    bloodOxygen: '98',
    temperature: '98.6',
  });

  const [activity, setActivity] = useState({
    dailySteps: '8000',
    activeMinutes: '45',
    exerciseDays: '4',
  });

  const [sleep, setSleep] = useState({
    hoursPerNight: '7',
    quality: 4 as 1 | 2 | 3 | 4 | 5,
  });

  const [body, setBody] = useState({
    bmi: '',
    bodyFat: '',
  });

  useEffect(() => {
    calculateScore(true);
  }, []);

  const calculateScore = async (preferRealtime = true) => {
    setLoading(true);
    try {
      let finalScoreForDashboard: number | null = null;
      let realtimeInput: Partial<PhysicalHealthInput> = {};

      if (preferRealtime) {
        const result = await wearableService.fetchAllHealthData();
        const data = result.data;

        const oxygenSaturationRaw = data.oxygenSaturation ?? 0;
        const bloodOxygen = oxygenSaturationRaw > 0 && oxygenSaturationRaw <= 1
          ? oxygenSaturationRaw * 100
          : oxygenSaturationRaw;

        const sleepHours = (data.sleepDurationMinutes ?? 0) / 60;
        const steps = data.steps ?? 0;
        const activeCalories = data.activeCalories ?? 0;
        const activeMinutes = activeCalories > 0 ? Math.round(activeCalories / 6) : 0;
        const bmi = data.basalMetabolicRate ?? 0;

        realtimeInput = {
          heartRate: data.heartRate && data.heartRate > 0 ? data.heartRate : undefined,
          bloodPressureSystolic:
            data.bloodPressureSystolic && data.bloodPressureSystolic > 0
              ? data.bloodPressureSystolic
              : undefined,
          bloodPressureDiastolic:
            data.bloodPressureDiastolic && data.bloodPressureDiastolic > 0
              ? data.bloodPressureDiastolic
              : undefined,
          bloodOxygen: bloodOxygen > 0 ? bloodOxygen : undefined,
          dailySteps: steps > 0 ? steps : undefined,
          activeMinutes: activeMinutes > 0 ? activeMinutes : undefined,
          caloriesBurned: activeCalories > 0 ? activeCalories : undefined,
          sleepHours: sleepHours > 0 ? sleepHours : undefined,
          sleepQuality:
            sleepHours >= 8
              ? 5
              : sleepHours >= 7
              ? 4
              : sleepHours >= 6
              ? 3
              : sleepHours > 0
              ? 2
              : undefined,
          bmi: bmi > 0 ? bmi : undefined,
        };

        if (Object.keys(realtimeInput).length > 0) {
          if (realtimeInput.heartRate) {
            setVitals(prev => ({ ...prev, heartRate: `${Math.round(realtimeInput.heartRate as number)}` }));
          }
          if (realtimeInput.bloodPressureSystolic) {
            setVitals(prev => ({
              ...prev,
              bloodPressureSystolic: `${Math.round(realtimeInput.bloodPressureSystolic as number)}`,
            }));
          }
          if (realtimeInput.bloodPressureDiastolic) {
            setVitals(prev => ({
              ...prev,
              bloodPressureDiastolic: `${Math.round(realtimeInput.bloodPressureDiastolic as number)}`,
            }));
          }
          if (realtimeInput.bloodOxygen) {
            setVitals(prev => ({ ...prev, bloodOxygen: `${Math.round(realtimeInput.bloodOxygen as number)}` }));
          }
          if (realtimeInput.dailySteps) {
            setActivity(prev => ({ ...prev, dailySteps: `${Math.round(realtimeInput.dailySteps as number)}` }));
          }
          if (realtimeInput.activeMinutes) {
            setActivity(prev => ({ ...prev, activeMinutes: `${Math.round(realtimeInput.activeMinutes as number)}` }));
          }
          if (realtimeInput.sleepHours) {
            setSleep(prev => ({ ...prev, hoursPerNight: `${(realtimeInput.sleepHours as number).toFixed(1)}` }));
          }
          if (realtimeInput.sleepQuality) {
            setSleep(prev => ({ ...prev, quality: realtimeInput.sleepQuality as 1 | 2 | 3 | 4 | 5 }));
          }
          if (realtimeInput.bmi) {
            setBody(prev => ({ ...prev, bmi: `${(realtimeInput.bmi as number).toFixed(1)}` }));
          }
          setSyncSource('realtime');
        } else {
          setSyncSource('manual');
        }
      } else {
        setSyncSource('manual');
      }

      const input: PhysicalHealthInput = {
        heartRate: realtimeInput.heartRate ?? (parseFloat(vitals.heartRate) || 72),
        bloodPressureSystolic: realtimeInput.bloodPressureSystolic ?? (parseFloat(vitals.bloodPressureSystolic) || 120),
        bloodPressureDiastolic: realtimeInput.bloodPressureDiastolic ?? (parseFloat(vitals.bloodPressureDiastolic) || 80),
        bloodOxygen: realtimeInput.bloodOxygen ?? (parseFloat(vitals.bloodOxygen) || 98),
        bodyTemperature: parseFloat(vitals.temperature) || 98.6,
        dailySteps: realtimeInput.dailySteps ?? (parseInt(activity.dailySteps) || 8000),
        activeMinutes: realtimeInput.activeMinutes ?? (parseInt(activity.activeMinutes) || 45),
        sleepHours: realtimeInput.sleepHours ?? (parseFloat(sleep.hoursPerNight) || 7),
        sleepQuality: realtimeInput.sleepQuality ?? sleep.quality,
        bmi: realtimeInput.bmi ?? (parseFloat(body.bmi) || undefined),
        bodyFatPercentage: parseFloat(body.bodyFat) || undefined,
        age: 30,
        gender: 'male',
      };

      const ruleScore = await calculatePhysicalHealthScore(input);
      finalScoreForDashboard = ruleScore.overallScore;

      // Always show rule-based scores first so section cards never fall back to 0.
      setHealthScore(ruleScore);

      // Then try to enhance the overall score with ML prediction.
      try {
        await loadMLModels();
        const mlScore = getMLPhysicalHealthScore(input);
        setMlPhysicalResult(mlScore);

        const grade: PhysicalHealthScore['grade'] =
          mlScore.score >= 90 ? 'A' :
          mlScore.score >= 80 ? 'B' :
          mlScore.score >= 70 ? 'C' :
          mlScore.score >= 60 ? 'D' : 'F';

        const status: PhysicalHealthScore['status'] =
          mlScore.category === 'Excellent' ? 'excellent' :
          mlScore.category === 'Good' ? 'good' :
          mlScore.category === 'Fair' ? 'fair' : 'poor';

        setHealthScore({
          ...ruleScore,
          overallScore: mlScore.score,
          grade,
          status,
        });
        finalScoreForDashboard = mlScore.score;
      } catch (mlError) {
        console.warn('ML scoring unavailable, using rule-based score:', mlError);
        setMlPhysicalResult(null);
      }

      if (finalScoreForDashboard !== null) {
        await AsyncStorage.setItem(
          PHYSICAL_SCORE_CACHE_KEY,
          JSON.stringify({
            score: finalScoreForDashboard,
            updatedAt: new Date().toISOString(),
          })
        );
      }
    } catch (error) {
      console.error('Error calculating score:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#8BC34A';
    if (score >= 40) return '#FF9800';
    return '#F44336';
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return '#4CAF50';
      case 'B': return '#8BC34A';
      case 'C': return '#FF9800';
      case 'D': return '#FF5722';
      case 'F': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

  const statusFromScore = (score: number) => {
    if (score >= 85) return 'optimal';
    if (score >= 70) return 'good';
    if (score >= 50) return 'normal';
    return 'attention';
  };

  const getCategoryScores = () => {
    if (!healthScore) {
      return {
        cardiovascular: 0,
        activity: 0,
        sleep: 0,
        bodyComposition: 0,
      };
    }

    if (!mlPhysicalResult) {
      return {
        cardiovascular: healthScore.breakdown.cardiovascular,
        activity: healthScore.breakdown.activity,
        sleep: healthScore.breakdown.sleep,
        bodyComposition: healthScore.breakdown.bodyComposition,
      };
    }

    const d = mlPhysicalResult.deviations;

    // ML deviations are raw unit differences (bpm, mmHg, %), not 0-1 fractions.
    // Normalize each metric to a comparable 0-1 range before deriving the section score.
    const hrNorm = Math.min(1, (d.hr_deviation ?? 0) / 30);
    const bpSysNorm = Math.min(1, (d.bp_sys_deviation ?? 0) / 40);
    const bpDiaNorm = Math.min(1, (d.bp_dia_deviation ?? 0) / 20);
    const oxygenNorm = Math.min(1, (d.oxygen_deviation ?? 0) / 6);
    const cardioDeviationAvg = (hrNorm + bpSysNorm + bpDiaNorm + oxygenNorm) / 4;
    const cardiovascular = clampScore(100 - cardioDeviationAvg * 100);

    const stepsValue = parseInt(activity.dailySteps) || 0;
    const activeMinutesValue = parseInt(activity.activeMinutes) || 0;
    const stepsScore = clampScore((stepsValue / 10000) * 100);
    const activeMinutesScore = clampScore((activeMinutesValue / 60) * 100);
    const activityScore = clampScore(stepsScore * 0.6 + activeMinutesScore * 0.4);

    const sleepHoursValue = parseFloat(sleep.hoursPerNight) || 0;
    const sleepHoursScore = clampScore(100 - Math.min(4, Math.abs(8 - sleepHoursValue)) * 20);
    const sleepQualityScore = clampScore((sleep.quality / 5) * 100);
    const sleepScore = clampScore(sleepHoursScore * 0.6 + sleepQualityScore * 0.4);

    const bmiValue = parseFloat(body.bmi) || 0;
    const bodyFatValue = parseFloat(body.bodyFat) || 0;
    const bmiScore = bmiValue >= 18.5 && bmiValue <= 24.9
      ? 100
      : clampScore(100 - Math.min(25, Math.abs(bmiValue - 22) * 8));
    const bodyFatScore = bodyFatValue <= 25
      ? 100
      : clampScore(100 - Math.min(40, (bodyFatValue - 25) * 4));
    const bodyComposition = clampScore(bmiScore * 0.6 + bodyFatScore * 0.4);

    return {
      cardiovascular,
      activity: activityScore,
      sleep: sleepScore,
      bodyComposition,
    };
  };

  const renderScoreCircle = () => {
    if (!healthScore) return null;

    return (
      <View style={styles.scoreCircleContainer}>
        <View style={[styles.scoreCircle, { borderColor: getScoreColor(healthScore.overallScore) }]}>
          <Text style={[styles.scoreValue, { color: getScoreColor(healthScore.overallScore) }]}>
            {healthScore.overallScore}
          </Text>
          <Text style={styles.scoreLabel}>Overall</Text>
        </View>
        <View style={[styles.gradeCircle, { backgroundColor: getGradeColor(healthScore.grade) }]}>
          <Text style={styles.gradeText}>{healthScore.grade}</Text>
        </View>
      </View>
    );
  };

  const renderCategoryCard = (
    title: string,
    score: number,
    icon: string,
    details: { label: string; value: string; status: string }[]
  ) => (
    <Card style={styles.categoryCard} mode="elevated">
      <Card.Content>
        <View style={styles.categoryHeader}>
          <View style={styles.categoryTitleRow}>
            <Icon name={icon} size={24} color={getScoreColor(score)} />
            <Text style={styles.categoryTitle}>{title}</Text>
          </View>
          <View style={[styles.categoryScoreBadge, { backgroundColor: getScoreColor(score) + '20' }]}>
            <Text style={[styles.categoryScoreText, { color: getScoreColor(score) }]}>{score}</Text>
          </View>
        </View>
        <ProgressBar
          progress={score / 100}
          color={getScoreColor(score)}
          style={styles.progressBar}
        />
        <View style={styles.detailsContainer}>
          {details.map((detail, index) => (
            <View key={index} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{detail.label}</Text>
              <View style={styles.detailValueContainer}>
                <Text style={styles.detailValue}>{detail.value}</Text>
                <Chip
                  style={[
                    styles.statusChip,
                    {
                      backgroundColor:
                        detail.status === 'optimal' || detail.status === 'normal'
                          ? '#E8F5E9'
                          : detail.status === 'good'
                          ? '#F1F8E9'
                          : '#FFF3E0',
                    },
                  ]}
                  textStyle={[
                    styles.statusText,
                    {
                      color:
                        detail.status === 'optimal' || detail.status === 'normal'
                          ? '#4CAF50'
                          : detail.status === 'good'
                          ? '#8BC34A'
                          : '#FF9800',
                    },
                  ]}
                >
                  {detail.status}
                </Chip>
              </View>
            </View>
          ))}
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={['#4CAF50', '#8BC34A']} style={styles.header}>
        <View style={styles.headerContent}>
          <IconButton
            icon="arrow-left"
            iconColor="white"
            size={24}
            onPress={() => navigation.goBack()}
          />
          <Text style={styles.headerTitle}>Physical Health</Text>
          <IconButton
            icon="pencil"
            iconColor="white"
            size={24}
            onPress={() => setShowInputModal(true)}
          />
        </View>
        <Text style={styles.headerSubtitle}>
          AI-powered analysis of your physical wellness
        </Text>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Score Overview */}
        <Card style={styles.overviewCard} mode="elevated">
          <Card.Content>
            {renderScoreCircle()}
            {healthScore && (
              <View style={styles.summaryContainer}>
                <Text style={styles.summaryText}>
                  Your physical health status is {healthScore.status}. {healthScore.trend === 'improving' ? 'Great progress!' : healthScore.trend === 'declining' ? 'Consider making some changes.' : 'Keep up the good work!'}
                </Text>
              </View>
            )}
            <Button
              mode="contained"
              onPress={() => calculateScore(true)}
              loading={loading}
              style={styles.recalculateButton}
              buttonColor={colors.primary}
            >
              Sync & Recalculate
            </Button>
            <Text style={styles.syncInfoText}>
              Data source: {syncSource === 'realtime' ? 'Real-time Health Connect' : 'Manual values'}
            </Text>
          </Card.Content>
        </Card>

        {/* Category Scores */}
        {healthScore && (
          <>
            {(() => {
              const categoryScores = getCategoryScores();
              return (
                <>
            {renderCategoryCard(
              'Cardiovascular',
              categoryScores.cardiovascular,
              'favorite',
              [
                {
                  label: 'Heart Rate',
                  value: `${vitals.heartRate} bpm`,
                  status: statusFromScore(100 - ((mlPhysicalResult?.deviations.hr_deviation || 0) * 100)),
                },
                {
                  label: 'Blood Pressure',
                  value: `${vitals.bloodPressureSystolic}/${vitals.bloodPressureDiastolic}`,
                  status: statusFromScore(100 - (((mlPhysicalResult?.deviations.bp_sys_deviation || 0) + (mlPhysicalResult?.deviations.bp_dia_deviation || 0)) * 50)),
                },
                {
                  label: 'Blood Oxygen',
                  value: `${vitals.bloodOxygen}%`,
                  status: statusFromScore(100 - ((mlPhysicalResult?.deviations.oxygen_deviation || 0) * 100)),
                },
              ]
            )}

            {renderCategoryCard(
              'Activity & Fitness',
              categoryScores.activity,
              'directions-run',
              [
                { label: 'Daily Steps', value: activity.dailySteps, status: parseInt(activity.dailySteps) >= 10000 ? 'optimal' : parseInt(activity.dailySteps) >= 7000 ? 'good' : 'attention' },
                { label: 'Active Minutes', value: `${activity.activeMinutes} min`, status: parseInt(activity.activeMinutes) >= 45 ? 'optimal' : parseInt(activity.activeMinutes) >= 30 ? 'good' : 'attention' },
                { label: 'Exercise Days', value: `${activity.exerciseDays}/week`, status: parseInt(activity.exerciseDays) >= 4 ? 'optimal' : parseInt(activity.exerciseDays) >= 2 ? 'good' : 'attention' },
              ]
            )}

            {renderCategoryCard(
              'Sleep Quality',
              categoryScores.sleep,
              'bedtime',
              [
                { label: 'Hours/Night', value: `${sleep.hoursPerNight} hrs`, status: parseFloat(sleep.hoursPerNight) >= 7 ? 'optimal' : parseFloat(sleep.hoursPerNight) >= 6 ? 'good' : 'attention' },
                { label: 'Quality', value: `${sleep.quality}/5`, status: sleep.quality >= 4 ? 'optimal' : sleep.quality >= 3 ? 'good' : 'attention' },
              ]
            )}

            {renderCategoryCard(
              'Body Composition',
              categoryScores.bodyComposition,
              'accessibility',
              [
                { label: 'BMI', value: body.bmi, status: parseFloat(body.bmi) >= 18.5 && parseFloat(body.bmi) <= 24.9 ? 'normal' : 'attention' },
                { label: 'Body Fat', value: `${body.bodyFat}%`, status: parseFloat(body.bodyFat) <= 25 ? 'normal' : 'attention' },
              ]
            )}
                </>
              );
            })()}

            {/* Recommendations */}
            <Card style={styles.recommendationsCard} mode="elevated">
              <Card.Content>
                <Text style={styles.recommendationsTitle}>Recommendations</Text>
                {healthScore.recommendations.map((rec, index) => (
                  <View key={index} style={styles.recommendationItem}>
                    <Icon name="lightbulb" size={20} color={colors.primary} />
                    <Text style={styles.recommendationText}>{rec}</Text>
                  </View>
                ))}
              </Card.Content>
            </Card>

            {/* Risk Factors */}
            {healthScore.riskFactors.length > 0 && (
              <Card style={styles.riskCard} mode="elevated">
                <Card.Content>
                  <Text style={styles.riskTitle}>Areas to Improve</Text>
                  {healthScore.riskFactors.map((risk, index) => (
                    <View key={index} style={styles.riskItem}>
                      <Icon name="warning" size={20} color="#FF9800" />
                      <Text style={styles.riskText}>{risk}</Text>
                    </View>
                  ))}
                </Card.Content>
              </Card>
            )}
          </>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Input Modal */}
      <Portal>
        <Modal
          visible={showInputModal}
          onDismiss={() => setShowInputModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <ScrollView>
            <Text style={styles.modalTitle}>Update Health Data</Text>

            <Text style={styles.sectionLabel}>Vitals</Text>
            <TextInput
              label="Heart Rate (bpm)"
              value={vitals.heartRate}
              onChangeText={(text) => setVitals({ ...vitals, heartRate: text })}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
            />
            <View style={styles.row}>
              <TextInput
                label="Systolic BP"
                value={vitals.bloodPressureSystolic}
                onChangeText={(text) => setVitals({ ...vitals, bloodPressureSystolic: text })}
                keyboardType="numeric"
                mode="outlined"
                style={[styles.input, styles.halfInput]}
              />
              <TextInput
                label="Diastolic BP"
                value={vitals.bloodPressureDiastolic}
                onChangeText={(text) => setVitals({ ...vitals, bloodPressureDiastolic: text })}
                keyboardType="numeric"
                mode="outlined"
                style={[styles.input, styles.halfInput]}
              />
            </View>

            <Text style={styles.sectionLabel}>Activity</Text>
            <TextInput
              label="Daily Steps"
              value={activity.dailySteps}
              onChangeText={(text) => setActivity({ ...activity, dailySteps: text })}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Active Minutes"
              value={activity.activeMinutes}
              onChangeText={(text) => setActivity({ ...activity, activeMinutes: text })}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
            />

            <Text style={styles.sectionLabel}>Sleep</Text>
            <TextInput
              label="Hours per Night"
              value={sleep.hoursPerNight}
              onChangeText={(text) => setSleep({ ...sleep, hoursPerNight: text })}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
            />

            <Text style={styles.sectionLabel}>Body</Text>
            <View style={styles.row}>
              <TextInput
                label="BMI"
                value={body.bmi}
                onChangeText={(text) => setBody({ ...body, bmi: text })}
                keyboardType="numeric"
                mode="outlined"
                style={[styles.input, styles.halfInput]}
              />
              <TextInput
                label="Body Fat %"
                value={body.bodyFat}
                onChangeText={(text) => setBody({ ...body, bodyFat: text })}
                keyboardType="numeric"
                mode="outlined"
                style={[styles.input, styles.halfInput]}
              />
            </View>

            <Button
              mode="contained"
              onPress={() => {
                setShowInputModal(false);
                calculateScore(false);
              }}
              style={styles.saveButton}
              buttonColor={colors.primary}
            >
              Save & Calculate
            </Button>
          </ScrollView>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingHorizontal: 8,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: 4,
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  overviewCard: {
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: 'white',
  },
  scoreCircleContainer: {
    alignItems: 'center',
    marginVertical: 20,
    position: 'relative',
  },
  scoreCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  gradeCircle: {
    position: 'absolute',
    right: width / 2 - 100,
    top: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  summaryContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    textAlign: 'center',
  },
  recalculateButton: {
    borderRadius: 8,
  },
  syncInfoText: {
    marginTop: 10,
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
  },
  categoryCard: {
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: 'white',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  categoryScoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryScoreText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 16,
  },
  detailsContainer: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  statusChip: {
    height: 24,
  },
  statusText: {
    fontSize: 11,
  },
  recommendationsCard: {
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: 'white',
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
    paddingRight: 16,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  riskCard: {
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: '#FFF8E1',
  },
  riskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F57C00',
    marginBottom: 12,
  },
  riskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  riskText: {
    flex: 1,
    fontSize: 14,
    color: '#795548',
    lineHeight: 20,
  },
  bottomPadding: {
    height: 20,
  },
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
    marginBottom: 8,
  },
  input: {
    marginBottom: 8,
    backgroundColor: 'white',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  saveButton: {
    marginTop: 20,
    borderRadius: 8,
  },
});

export default PhysicalHealthScreen;
