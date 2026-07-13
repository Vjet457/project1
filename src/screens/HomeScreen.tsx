import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../types';
import Colors from '../utils/colors';
import Button from '../components/common/Button';
import Card from '../components/common/Card';

const { width } = Dimensions.get('window');

type HomeScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Home'>;

const features = [
  {
    icon: 'head-question',
    title: 'AI Symptom Checker',
    description: 'Get instant AI-powered health assessments and doctor recommendations.',
    color: Colors.primary,
  },
  {
    icon: 'hospital-building',
    title: 'Find Doctors',
    description: 'Locate nearby healthcare professionals with ratings and reviews.',
    color: Colors.secondary,
  },
  {
    icon: 'meditation',
    title: 'Mental Wellness',
    description: 'Access mood tracking, meditation, and mental health resources.',
    color: Colors.accent,
  },
  {
    icon: 'heart-pulse',
    title: 'Health Tracking',
    description: 'Monitor your daily activities, sleep, and wellness metrics.',
    color: Colors.info,
  },
  {
    icon: 'alert-octagon',
    title: 'Emergency SOS',
    description: 'Quick access to emergency services and nearby hospitals.',
    color: Colors.emergency,
  },
  {
    icon: 'shield-check',
    title: 'Preventive Care',
    description: 'Get personalized health tips and preventive care recommendations.',
    color: Colors.warning,
  },
];

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top }]}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.logoContainer}>
          <LinearGradient
            colors={[Colors.primary, Colors.secondary]}
            style={styles.logoGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Icon name="heart-pulse" size={48} color={Colors.white} />
          </LinearGradient>
        </View>

        <Text style={styles.title}>AarogyaSaathi</Text>
        <Text style={styles.subtitle}>Your AI-Powered Healthcare Companion</Text>
        
        <Text style={styles.description}>
          Comprehensive healthcare platform combining physical health monitoring,
          mental wellness support, AI symptom analysis, and expert medical guidance
          all in one place.
        </Text>

        <View style={styles.buttonContainer}>
          <Button
            title="Get Started Free"
            onPress={() => navigation.navigate('Register')}
            size="large"
            fullWidth
            gradientColors={[Colors.primary, Colors.secondary]}
          />
          
          <View style={styles.buttonSpacer} />
          
          <Button
            title="Sign In"
            onPress={() => navigation.navigate('Login')}
            variant="outlined"
            size="large"
            fullWidth
          />
        </View>

        <View style={styles.chipContainer}>
          <View style={[styles.chip, { backgroundColor: Colors.primary + '20' }]}>
            <Text style={[styles.chipText, { color: Colors.primary }]}>AI-Powered</Text>
          </View>
          <View style={[styles.chip, { backgroundColor: Colors.secondary + '20' }]}>
            <Text style={[styles.chipText, { color: Colors.secondary }]}>24/7 Available</Text>
          </View>
          <View style={[styles.chip, { backgroundColor: Colors.primary + '20' }]}>
            <Text style={[styles.chipText, { color: Colors.primary }]}>Trusted</Text>
          </View>
        </View>
      </View>

      {/* Features Section */}
      <View style={styles.featuresSection}>
        <Text style={styles.sectionTitle}>Comprehensive Health Solutions</Text>
        
        <View style={styles.featuresGrid}>
          {features.map((feature, index) => (
            <Card key={index} style={styles.featureCard}>
              <View style={[styles.featureIconContainer, { backgroundColor: feature.color + '20' }]}>
                <Icon name={feature.icon} size={32} color={feature.color} />
              </View>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </Card>
          ))}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          © 2026 AarogyaSaathi. All rights reserved.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: 40,
  },
  heroSection: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoGradient: {
    width: 100,
    height: 100,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 16,
  },
  buttonSpacer: {
    height: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  featuresSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 24,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    width: (width - 48) / 2,
    marginBottom: 16,
    alignItems: 'center',
    padding: 20,
  },
  featureIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});

export default HomeScreen;
