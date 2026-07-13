const express = require('express');
const router = express.Router();
const HealthScoreHistory = require('../models/HealthScoreHistory');
const { protect } = require('../middleware/auth');

const getRiskCategory = (score) => {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'fair';
  if (score >= 30) return 'needs-attention';
  return 'critical';
};

router.post('/', protect, async (req, res) => {
  try {
    const { overallHealthScore, date, remarks } = req.body;

    if (typeof overallHealthScore !== 'number') {
      return res.status(400).json({ success: false, message: 'overallHealthScore is required' });
    }

    const record = await HealthScoreHistory.create({
      user: req.user.id,
      userId: req.user.id,
      overallHealthScore: Math.max(0, Math.min(100, Math.round(overallHealthScore))),
      date: date ? new Date(date) : new Date(),
      remarks,
      riskCategory: getRiskCategory(Math.max(0, Math.min(100, Math.round(overallHealthScore)))),
    });

    res.status(201).json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error storing health score history', error: error.message });
  }
});

router.get('/recent', protect, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const records = await HealthScoreHistory.find({ user: req.user.id })
      .sort({ date: -1, createdAt: -1 })
      .limit(parseInt(limit, 10) || 10);

    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving health score history', error: error.message });
  }
});

router.get('/trend', protect, async (req, res) => {
  try {
    const records = await HealthScoreHistory.find({ user: req.user.id })
      .sort({ date: 1, createdAt: 1 })
      .limit(10);

    if (records.length === 0) {
      return res.json({ success: true, data: { trendStatus: 'stable', changePercentage: 0, averageScore: 0, highestScore: 0, lowestScore: 0, summary: 'No health score history available yet.', significantChange: false } });
    }

    const scores = records.map((record) => record.overallHealthScore);
    const firstScore = scores[0];
    const lastScore = scores[scores.length - 1];
    const averageScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);
    const changePercentage = firstScore === 0 ? 0 : Math.round(((lastScore - firstScore) / firstScore) * 100);

    let trendStatus = 'stable';
    if (changePercentage > 5) trendStatus = 'improving';
    else if (changePercentage < -5) trendStatus = 'declining';

    const summary = `Your health score is ${trendStatus} with ${changePercentage >= 0 ? 'an increase' : 'a decrease'} of ${Math.abs(changePercentage)}% over the selected period.`;

    res.json({
      success: true,
      data: {
        trendStatus,
        changePercentage,
        averageScore,
        highestScore,
        lowestScore,
        summary,
        significantChange: Math.abs(changePercentage) >= 10,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error generating trend analysis', error: error.message });
  }
});

module.exports = router;
