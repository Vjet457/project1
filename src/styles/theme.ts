// AarogyaSaathi Theme - Based on Material Design 3
import { MD3LightTheme as DefaultTheme } from 'react-native-paper';
import { StyleSheet } from 'react-native';

// AarogyaSaathi Color Palette
export const colors = {
  primary: '#2196F3',        // Trust, Medical professionalism
  primaryContainer: '#E3F2FD',
  secondary: '#4CAF50',      // Health, Growth, Wellness
  secondaryContainer: '#E8F5E8',
  tertiary: '#9C27B0',       // Mental wellness, Meditation
  tertiaryContainer: '#F3E5F5',
  
  surface: '#FFFFFF',
  surfaceVariant: '#F5F5F5',
  background: '#FAFAFA',
  
  error: '#FF5722',          // Emergency, Critical alerts
  errorContainer: '#FFEBEE',
  
  warning: '#FF9800',        // Alerts
  warningContainer: '#FFF3E0',
  
  success: '#4CAF50',        // Positive feedback
  successContainer: '#E8F5E9',
  
  info: '#00BCD4',           // Calming, Information
  infoContainer: '#E0F2F1',
  
  onPrimary: '#FFFFFF',
  onSecondary: '#FFFFFF',
  onTertiary: '#FFFFFF',
  onSurface: '#212121',
  onSurfaceVariant: '#424242',
  onBackground: '#212121',
  onError: '#FFFFFF',
  
  outline: '#E0E0E0',
  outlineVariant: '#EEEEEE',
  
  // Health-specific gradients
  gradients: {
    primary: ['#2196F3', '#1976D2'],
    secondary: ['#4CAF50', '#388E3C'],
    mental: ['#9C27B0', '#7B1FA2'],
    emergency: ['#FF5722', '#D84315'],
    health: ['#00BCD4', '#0097A7'],
  }
};

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    primaryContainer: colors.primaryContainer,
    secondary: colors.secondary,
    secondaryContainer: colors.secondaryContainer,
    tertiary: colors.tertiary,
    tertiaryContainer: colors.tertiaryContainer,
    surface: colors.surface,
    surfaceVariant: colors.surfaceVariant,
    background: colors.background,
    error: colors.error,
    errorContainer: colors.errorContainer,
    onPrimary: colors.onPrimary,
    onSecondary: colors.onSecondary,
    onTertiary: colors.onTertiary,
    onSurface: colors.onSurface,
    onSurfaceVariant: colors.onSurfaceVariant,
    onBackground: colors.onBackground,
    onError: colors.onError,
    outline: colors.outline,
    outlineVariant: colors.outlineVariant,
  },
};

// Common styles
export const commonStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: colors.primary,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.onPrimary,
    opacity: 0.9,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.onSurface,
    marginBottom: 12,
    marginTop: 8,
  },
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});

export default { colors, theme, commonStyles };
