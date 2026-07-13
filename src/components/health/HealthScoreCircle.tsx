import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Colors from '../../utils/colors';

interface HealthScoreCircleProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  scoreChange?: number;
  status?: string;
}

const HealthScoreCircle: React.FC<HealthScoreCircleProps> = ({
  score,
  size = 120,
  strokeWidth = 10,
  scoreChange,
  status,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = (score / 100) * circumference;

  const getScoreColor = () => {
    if (score >= 80) return Colors.success;
    if (score >= 60) return Colors.warning;
    return Colors.error;
  };

  return (
    <View style={styles.container}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {/* Background Circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={Colors.border}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress Circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={getScoreColor()}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={`${progress} ${circumference}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={[styles.scoreContainer, { width: size, height: size }]}>
          <Text style={styles.scoreText}>{score}</Text>
          {status && <Text style={styles.statusText}>{status}</Text>}
        </View>
      </View>
      
      {scoreChange !== undefined && (
        <View style={styles.changeContainer}>
          <Text style={[styles.changeText, { color: scoreChange >= 0 ? Colors.success : Colors.error }]}>
            {scoreChange >= 0 ? '↑' : '↓'} {Math.abs(scoreChange)} pts
          </Text>
          <Text style={styles.changeLabel}>from last week</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  scoreContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statusText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  changeContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  changeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  changeLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});

export default HealthScoreCircle;
