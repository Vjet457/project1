export interface HealthScoreAnalytics {
  trendStatus: 'improving' | 'declining' | 'stable';
  changePercentage: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  summary: string;
  significantChange: boolean;
}

export interface AnalyticsHistoryEntry {
  _id?: string;
  overallHealthScore?: number;
  date?: string;
  createdAt?: string;
  remarks?: string;
  riskCategory?: string;
}

export const getHealthScoreHistoryLabel = (count: number): string => {
  if (count <= 0) return 'No score history available yet.';
  return `Showing ${count} score point${count === 1 ? '' : 's'}`;
};

export const getRecentAnalyticsHistory = (
  entries: Array<AnalyticsHistoryEntry | null | undefined>,
  limit = 8
): AnalyticsHistoryEntry[] => {
  const sortedEntries = [...entries]
    .filter((entry): entry is AnalyticsHistoryEntry & { overallHealthScore: number } => typeof entry?.overallHealthScore === 'number')
    .sort((a, b) => {
      const aTime = new Date(a.date || a.createdAt || 0).getTime();
      const bTime = new Date(b.date || b.createdAt || 0).getTime();
      if (aTime !== bTime) {
        return aTime - bTime;
      }
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    });

  return sortedEntries.slice(-limit);
};

export const buildAnalyticsHistoryFromSources = (
  scoreHistory: Array<AnalyticsHistoryEntry | null | undefined>,
  healthRecords: Array<{ _id?: string; date?: string; createdAt?: string; healthScore?: { overall?: number | null } } | null | undefined>
): AnalyticsHistoryEntry[] => {
  type AnalyticsHistorySourceEntry = {
    _id?: string;
    overallHealthScore?: number;
    date?: string;
    createdAt?: string;
    remarks?: string;
    riskCategory?: string;
  };

  const scoreHistoryEntries = scoreHistory
    .filter((entry): entry is AnalyticsHistoryEntry & { overallHealthScore: number } => typeof entry?.overallHealthScore === 'number')
    .sort((a, b) => {
      const aTime = new Date(a.date || a.createdAt || 0).getTime();
      const bTime = new Date(b.date || b.createdAt || 0).getTime();
      if (aTime !== bTime) {
        return aTime - bTime;
      }
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    });

  if (scoreHistoryEntries.length > 0) {
    return scoreHistoryEntries;
  }

  const healthRecordEntries = healthRecords
    .map((record): AnalyticsHistorySourceEntry => ({
      _id: record?._id,
      overallHealthScore: typeof record?.healthScore?.overall === 'number' ? record.healthScore.overall : undefined,
      date: record?.date || record?.createdAt,
      createdAt: record?.createdAt,
    }))
    .filter((entry): entry is AnalyticsHistorySourceEntry & { overallHealthScore: number } => typeof entry.overallHealthScore === 'number')
    .sort((a, b) => {
      const aTime = new Date(a.date || a.createdAt || 0).getTime();
      const bTime = new Date(b.date || b.createdAt || 0).getTime();
      if (aTime !== bTime) {
        return aTime - bTime;
      }
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    });

  return healthRecordEntries.map((entry) => ({
    _id: entry._id,
    overallHealthScore: entry.overallHealthScore,
    date: entry.date,
    createdAt: entry.createdAt,
    remarks: entry.remarks,
    riskCategory: entry.riskCategory,
  }));
};

export const buildHealthScoreAnalytics = (
  scores: Array<number | null | undefined>
): HealthScoreAnalytics => {
  const validScores = scores.filter((score): score is number => typeof score === 'number' && !Number.isNaN(score));

  if (validScores.length === 0) {
    return {
      trendStatus: 'stable',
      changePercentage: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      summary: 'No health score history available yet.',
      significantChange: false,
    };
  }

  const averageScore = Math.round(validScores.reduce((sum, score) => sum + score, 0) / validScores.length);
  const highestScore = Math.max(...validScores);
  const lowestScore = Math.min(...validScores);

  const firstScore = validScores[0];
  const lastScore = validScores[validScores.length - 1];
  const change = firstScore === 0 ? 0 : Math.round(((lastScore - firstScore) / firstScore) * 100);

  let trendStatus: HealthScoreAnalytics['trendStatus'] = 'stable';
  if (change > 5) {
    trendStatus = 'improving';
  } else if (change < -5) {
    trendStatus = 'declining';
  }

  const significantChange = Math.abs(change) >= 10;

  const summary = `Your health score is ${trendStatus} with ${change >= 0 ? 'an increase' : 'a decrease'} of ${Math.abs(change)}% over the selected period.`;

  return {
    trendStatus,
    changePercentage: change,
    averageScore,
    highestScore,
    lowestScore,
    summary,
    significantChange,
  };
};
