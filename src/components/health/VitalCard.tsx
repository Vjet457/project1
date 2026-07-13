import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Card from '../common/Card';
import Colors from '../../utils/colors';

interface VitalCardProps {
  title: string;
  value: string | number;
  unit: string;
  status: string;
  iconName: string;
  gradientColors: string[];
  lightBgColor: string;
  statusColor: string;
}

const VitalCard: React.FC<VitalCardProps> = ({
  title,
  value,
  unit,
  status,
  iconName,
  gradientColors,
  lightBgColor,
  statusColor,
}) => {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <LinearGradient
          colors={gradientColors}
          style={styles.iconContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Icon name={iconName} size={24} color={Colors.white} />
        </LinearGradient>
        <View style={[styles.statusBadge, { backgroundColor: lightBgColor }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
        </View>
      </View>
      
      <Text style={styles.title}>{title}</Text>
      
      <View style={styles.valueContainer}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.unit}>{unit}</Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '45%',
    margin: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  unit: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
});

export default VitalCard;
