import { buildAnalyticsHistoryFromSources, buildHealthScoreAnalytics, getHealthScoreHistoryLabel, getRecentAnalyticsHistory } from '../src/services/healthScoreAnalytics';

describe('buildHealthScoreAnalytics', () => {
  it('detects an improving trend and computes range metrics', () => {
    const analytics = buildHealthScoreAnalytics([
      72,
      74,
      78,
      82,
      85,
    ]);

    expect(analytics.trendStatus).toBe('improving');
    expect(analytics.averageScore).toBe(78);
    expect(analytics.highestScore).toBe(85);
    expect(analytics.lowestScore).toBe(72);
    expect(analytics.changePercentage).toBe(18);
  });

  it('returns stable status when the score has not changed', () => {
    const analytics = buildHealthScoreAnalytics([80, 80, 80]);

    expect(analytics.trendStatus).toBe('stable');
    expect(analytics.changePercentage).toBe(0);
    expect(analytics.summary).toContain('stable');
  });

  it('describes the actual number of available score points', () => {
    expect(getHealthScoreHistoryLabel(0)).toBe('No score history available yet.');
    expect(getHealthScoreHistoryLabel(1)).toBe('Showing 1 score point');
    expect(getHealthScoreHistoryLabel(8)).toBe('Showing 8 score points');
  });

  it('uses score history as the primary source for analytics history', () => {
    const history = buildAnalyticsHistoryFromSources([
      { overallHealthScore: 88, date: '2026-07-13T00:00:00.000Z' },
    ], [{
      _id: 'record-1',
      date: '2026-07-13T00:00:00.000Z',
      healthScore: { overall: 70 },
    }]);

    expect(history).toHaveLength(1);
    expect(history[0].overallHealthScore).toBe(88);
  });

  it('returns the most recent score points for a clearer graph', () => {
    const history = getRecentAnalyticsHistory([
      { overallHealthScore: 70, date: '2026-07-10T00:00:00.000Z' },
      { overallHealthScore: 72, date: '2026-07-11T00:00:00.000Z' },
      { overallHealthScore: 74, date: '2026-07-12T00:00:00.000Z' },
      { overallHealthScore: 76, date: '2026-07-13T00:00:00.000Z' },
    ], 3);

    expect(history).toHaveLength(3);
    expect(history[history.length - 1].overallHealthScore).toBe(76);
  });
});
