import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../../utils/colors';

interface GradientHeaderProps {
  title: string;
  subtitle?: string;
  colors?: string[];
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightIcon?: string;
  onRightPress?: () => void;
  children?: React.ReactNode;
}

const GradientHeader: React.FC<GradientHeaderProps> = ({
  title,
  subtitle,
  colors = Colors.gradients.primary,
  showBackButton = false,
  onBackPress,
  rightIcon,
  onRightPress,
  children,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { paddingTop: insets.top + 16 }]}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <View style={styles.headerRow}>
        {showBackButton && (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onBackPress}
          >
            <Icon name="arrow-left" size={24} color={Colors.white} />
          </TouchableOpacity>
        )}
        
        <View style={styles.titleContainer}>
          {!showBackButton && (
            <>
              <Text style={styles.title}>{title}</Text>
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </>
          )}
        </View>

        {rightIcon && (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onRightPress}
          >
            <Icon name={rightIcon} size={24} color={Colors.white} />
          </TouchableOpacity>
        )}
      </View>

      {showBackButton && (
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      )}

      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
  },
  titleRow: {
    marginTop: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: Colors.white,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.white,
    opacity: 0.9,
  },
});

export default GradientHeader;
