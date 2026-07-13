import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Card, Divider } from 'react-native-paper';
import Svg, { Line, Circle, Path, G, Text as SvgText } from 'react-native-svg';
import { colors } from '../styles/theme';
import healthService from '../services/healthService';
import { buildAnalyticsHistoryFromSources, buildHealthScoreAnalytics, getHealthScoreHistoryLabel, getRecentAnalyticsHistory } from '../services/healthScoreAnalytics';

const { width } = Dimensions.get('window');

type HistoryItem = {
  _id?: string;
  overallHealthScore?: number;
  date?: string;
  createdAt?: string;
  remarks?: string;
  riskCategory?: string;
};

const formatDateLabel = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const buildPolyline = (points: Array<{ x: number; y: number }>) => {
  if (points.length === 0) return '';
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
};

const HealthScoreAnalyticsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [trend, setTrend] = useState<ReturnType<typeof buildHealthScoreAnalytics> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAnalytics = useCallback(async () => {
    try {
      const [historyResponse, trendResponse, healthHistoryResponse] = await Promise.all([
        healthService.getHealthScoreHistory(30),
        healthService.getHealthScoreTrend(),
        healthService.getHealthHistory(30),
      ]);

      const scoreHistory = Array.isArray(historyResponse.data) ? historyResponse.data : [];
      const healthRecords = Array.isArray(healthHistoryResponse.data) ? healthHistoryResponse.data : [];
      const effectiveHistory = buildAnalyticsHistoryFromSources(scoreHistory, healthRecords);
      const recentHistory = getRecentAnalyticsHistory(effectiveHistory, 8);

      setHistory(recentHistory);
      setTrend(trendResponse.success && trendResponse.data ? trendResponse.data : buildHealthScoreAnalytics(recentHistory.map((entry) => entry.overallHealthScore)));
    } catch (error) {
      console.error('Load analytics error:', error);
      setHistory([]);
      setTrend(buildHealthScoreAnalytics([]));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    const unsubscribe = healthService.subscribeToHealthScoreUpdates(() => {
      void loadAnalytics();
    });

    return unsubscribe;
  }, [loadAnalytics]);

  useFocusEffect(
    useCallback(() => {
      void loadAnalytics();
    }, [loadAnalytics])
  );

  const chartData = useMemo(() => history.map((entry, index) => ({
    value: entry.overallHealthScore ?? 0,
    label: formatDateLabel(entry.date || entry.createdAt),
    key: entry._id || `${entry.date || entry.createdAt || 'entry'}-${index}`,
  })), [history]);

  const historyLabel = useMemo(() => getHealthScoreHistoryLabel(chartData.length), [chartData.length]);

  const chartPoints = useMemo(() => {
    if (chartData.length === 0) return [];

    const padding = 24;
    const chartHeight = 180;
    const chartWidth = width - 64;
    const maxValue = 100;
    const stepX = chartData.length > 1 ? (chartWidth - padding * 2) / (chartData.length - 1) : chartWidth / 2;

    return chartData.map((point, index) => ({
      ...point,
      x: padding + index * stepX,
      y: chartHeight - padding - (point.value / maxValue) * (chartHeight - padding * 2),
    }));
  }, [chartData]);

  const [selectedPoint, setSelectedPoint] = useState<{ value: number; label: string; key?: string } | null>(null);

  useEffect(() => {
    if (chartPoints.length > 0) {
      const latestPoint = chartPoints[chartPoints.length - 1];
      setSelectedPoint({ value: latestPoint.value, label: latestPoint.label, key: latestPoint.key });
    } else {
      setSelectedPoint(null);
    }
  }, [chartPoints]);

  const summaryCards = useMemo(() => {
    if (!trend) {
      return [];
    }

    const latestScore = history.length > 0 ? history[history.length - 1]?.overallHealthScore : undefined;

    return [
      { label: 'Current Score', value: typeof latestScore === 'number' ? latestScore.toString() : '—', icon: 'heart-pulse', color: colors.primary },
      { label: 'Average Score', value: trend.averageScore.toString(), icon: 'chart-line', color: colors.secondary },
      { label: 'Highest Score', value: trend.highestScore.toString(), icon: 'arrow-up-circle', color: colors.success },
      { label: 'Lowest Score', value: trend.lowestScore.toString(), icon: 'arrow-down-circle', color: colors.error },
    ];
  }, [history, trend]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={colors.gradients.primary} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Health Score Analytics</Text>
            <Text style={styles.headerSubtitle}>Recent AI health score history</Text>
          </View>
          <View style={styles.headerButton} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadAnalytics(); }} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading analytics...</Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryGrid}>
              {summaryCards.map((card) => (
                <Card key={card.label} style={styles.summaryCard}>
                  <Card.Content style={styles.summaryContent}>
                    <View style={[styles.summaryIcon, { backgroundColor: `${card.color}20` }]}>
                      <Icon name={card.icon} size={20} color={card.color} />
                    </View>
                    <Text style={styles.summaryValue}>{card.value}</Text>
                    <Text style={styles.summaryLabel}>{card.label}</Text>
                  </Card.Content>
                </Card>
              ))}
            </View>

            <Card style={styles.chartCard}>
              <Card.Content>
                <View style={styles.chartHeader}>
                  <View style={styles.chartTitleWrapper}>
                    <Text style={styles.sectionTitle}>Health Score Trend</Text>
                    <Text style={styles.sectionSubtitle}>{historyLabel}</Text>
                  </View>
                  <TouchableOpacity style={styles.refreshButton} onPress={() => { setRefreshing(true); void loadAnalytics(); }}>
                    <Icon name="refresh" size={18} color={colors.primary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.chartContainer}>
                  {chartData.length > 0 ? (
                    <>
                      <Svg width="100%" height="220">
                        <Line x1={24} y1={180} x2={width - 40} y2={180} stroke={colors.outline} strokeDasharray="4 4" />
                        <Line x1={24} y1={24} x2={24} y2={180} stroke={colors.outline} strokeDasharray="4 4" />
                        <Line x1={24} y1={24} x2={width - 40} y2={24} stroke={colors.outline} strokeDasharray="4 4" />
                        <Path d={buildPolyline(chartPoints)} stroke={colors.primary} strokeWidth={3} fill="none" />
                        <Path d={`${buildPolyline(chartPoints)} L ${chartPoints[chartPoints.length - 1]?.x ?? 24} 180 L ${chartPoints[0]?.x ?? 24} 180 Z`} fill="rgba(0, 188, 212, 0.16)" />
                        {chartPoints.map((point) => (
                          <G key={point.key}>
                            <Circle cx={point.x} cy={point.y} r={6} fill={colors.primary} />
                            <Circle cx={point.x} cy={point.y} r={10} fill="transparent" onPress={() => setSelectedPoint({ value: point.value, label: point.label, key: point.key })} />
                            {selectedPoint?.key === point.key ? (
                              <SvgText x={point.x - 10} y={point.y - 12} fontSize="11" fill={colors.primary} fontWeight="700">
                                {point.value}
                              </SvgText>
                            ) : null}
                          </G>
                        ))}
                        <SvgText x={24} y={210} fontSize="12" fill={colors.onSurfaceVariant}>0</SvgText>
                        <SvgText x={24} y={32} fontSize="12" fill={colors.onSurfaceVariant}>100</SvgText>
                        <SvgText x={width - 60} y={210} fontSize="12" fill={colors.onSurfaceVariant}>date</SvgText>
                      </Svg>
                      {selectedPoint ? (
                        <View style={styles.tooltipCard}>
                          <Text style={styles.tooltipLabel}>{selectedPoint.label}</Text>
                          <Text style={styles.tooltipValue}>{selectedPoint.value}/100</Text>
                        </View>
                      ) : null}
                    </>
                  ) : (
                    <View style={styles.emptyChart}>
                      <Icon name="chart-line" size={48} color={colors.outline} />
                      <Text style={styles.emptyChartText}>No score history available yet.</Text>
                    </View>
                  )}
                </View>
              </Card.Content>
            </Card>

            <Card style={styles.analysisCard}>
              <Card.Content>
                <Text style={styles.sectionTitle}>Trend Analysis</Text>
                <Text style={styles.analysisText}>{trend?.summary || 'Your health trend will appear here as data grows.'}</Text>
                <Divider style={styles.divider} />
                <View style={styles.analysisGrid}>
                  <View style={styles.analysisItem}>
                    <Text style={styles.analysisLabel}>Change</Text>
                    <Text style={styles.analysisValue}>{trend?.changePercentage ?? 0}%</Text>
                  </View>
                  <View style={styles.analysisItem}>
                    <Text style={styles.analysisLabel}>Status</Text>
                    <Text style={styles.analysisValue}>{trend?.trendStatus ?? 'stable'}</Text>
                  </View>
                  <View style={styles.analysisItem}>
                    <Text style={styles.analysisLabel}>Significant shift</Text>
                    <Text style={styles.analysisValue}>{trend?.significantChange ? 'Yes' : 'No'}</Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingBottom: 28, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8 },
  headerButton: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: '700' },
  headerSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 4 },
  content: { flex: 1, marginTop: -12 },
  contentContainer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 12 },
  summaryCard: { width: (width - 40) / 2, marginBottom: 12, borderRadius: 16 },
  summaryContent: { alignItems: 'center', paddingVertical: 6 },
  summaryIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  summaryValue: { fontSize: 20, fontWeight: '700', color: colors.primary },
  summaryLabel: { fontSize: 12, color: colors.onSurfaceVariant, marginTop: 4 },
  chartCard: { borderRadius: 20, marginBottom: 12 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  chartTitleWrapper: { flex: 1, marginRight: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.onSurface },
  sectionSubtitle: { fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
  refreshButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: `${colors.primary}12`, alignItems: 'center', justifyContent: 'center' },
  chartContainer: { height: 220, marginTop: 8 },
  emptyChart: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyChartText: { color: colors.onSurfaceVariant, marginTop: 8 },
  analysisCard: { borderRadius: 20 },
  analysisText: { color: colors.onSurfaceVariant, marginTop: 8, lineHeight: 20 },
  divider: { marginVertical: 12 },
  analysisGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  analysisItem: { flex: 1, padding: 8, backgroundColor: colors.background, borderRadius: 12, marginHorizontal: 4 },
  analysisLabel: { fontSize: 11, color: colors.onSurfaceVariant, textTransform: 'uppercase' },
  analysisValue: { fontSize: 16, fontWeight: '700', color: colors.primary, marginTop: 4, textTransform: 'capitalize' },
  loadingContainer: { paddingVertical: 48, alignItems: 'center' },
  loadingText: { color: colors.onSurfaceVariant, marginTop: 8 },
  tooltipCard: { marginTop: 8, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: `${colors.primary}10`, borderRadius: 12, alignSelf: 'flex-start' },
  tooltipLabel: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  tooltipValue: { fontSize: 16, color: colors.primary, fontWeight: '700', marginTop: 2 },
});

export default HealthScoreAnalyticsScreen;
