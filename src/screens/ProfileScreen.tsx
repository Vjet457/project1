import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import {
  Text,
  Card,
  Avatar,
  IconButton,
  Button,
  Divider,
  Portal,
  Snackbar,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { colors } from '../styles/theme';
import { useAuth } from '../context/AuthContext';
import { wearableService } from '../services/healthConnectService';

interface User {
  name: string;
  email: string;
  phone: string;
  dob: string;
  bloodGroup: string;
  height: string;
  weight: string;
  bmi: string;
  memberSince: string;
}

interface MenuItem {
  id: number;
  icon: string;
  title: string;
  subtitle: string;
  color: string;
  hasToggle?: boolean;
  toggleValue?: boolean;
  screen?: string;
}

const normalizeStoredUser = (rawUser: any) => {
  if (rawUser?.data && !rawUser.firstName) {
    return rawUser.data;
  }

  return rawUser;
};

const computeBMI = (height?: number, weight?: number): number | null => {
  if (!height || !weight || height <= 0 || weight <= 0) {
    return null;
  }

  const heightInMeters = height / 100;
  const bmi = weight / (heightInMeters * heightInMeters);
  return Math.round(bmi * 10) / 10;
};

const ProfileScreen = () => {
  const navigation = useNavigation();
  const { logout, user: authUser, updateUser } = useAuth();
  const [latestUserData, setLatestUserData] = useState<any | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [healthSync, setHealthSync] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const loadLatestUserData = async () => {
        try {
          const storedUserData = await AsyncStorage.getItem('userData');
          const parsedUserData = storedUserData ? JSON.parse(storedUserData) : null;
          let resolvedUser = normalizeStoredUser(parsedUserData) || {};

          const healthConnectConnected = await AsyncStorage.getItem('healthConnectConnected');
          if (healthConnectConnected === 'true') {
            const [hcHeight, hcWeight] = await Promise.all([
              wearableService.fetchHeight(),
              wearableService.fetchWeight(),
            ]);

            const nextHeight = hcHeight > 0 ? hcHeight : Number(resolvedUser.height) || 0;
            const nextWeight = hcWeight > 0 ? hcWeight : Number(resolvedUser.weight) || 0;

            if (nextHeight > 0 || nextWeight > 0) {
              wearableService.setUserProfile({
                height: nextHeight > 0 ? nextHeight : undefined,
                weight: nextWeight > 0 ? nextWeight : undefined,
              });

              const updates: { height?: number; weight?: number } = {};
              if (nextHeight > 0 && Number(resolvedUser.height) !== nextHeight) {
                updates.height = nextHeight;
              }
              if (nextWeight > 0 && Number(resolvedUser.weight) !== nextWeight) {
                updates.weight = nextWeight;
              }

              if (Object.keys(updates).length > 0) {
                await updateUser(updates);
                resolvedUser = { ...resolvedUser, ...updates };
              }
            }
          }

          setLatestUserData(resolvedUser);
        } catch (error) {
          console.error('Failed to load latest user profile data:', error);
        }
      };

      loadLatestUserData();
    }, [updateUser])
  );

  const profileSource = latestUserData || authUser || {};
  const fullName = [profileSource?.firstName, profileSource?.lastName].filter(Boolean).join(' ').trim();
  const resolvedBloodGroup = profileSource?.bloodGroup || profileSource?.bloodType || 'Not set';
  const resolvedHeight = Number(profileSource?.height) > 0 ? Number(profileSource.height) : undefined;
  const resolvedWeight = Number(profileSource?.weight) > 0 ? Number(profileSource.weight) : undefined;
  const resolvedBMI = computeBMI(resolvedHeight, resolvedWeight);

  const user: User = {
    name: fullName || 'User',
    email: profileSource?.email || 'Not provided',
    phone: profileSource?.phoneNumber || 'Not provided',
    dob: profileSource?.dateOfBirth || 'Not provided',
    bloodGroup: resolvedBloodGroup,
    height: resolvedHeight ? `${resolvedHeight} cm` : 'Not set',
    weight: resolvedWeight ? `${resolvedWeight} kg` : 'Not set',
    bmi: resolvedBMI ? `${resolvedBMI}` : 'Not set',
    memberSince: 'January 2024',
  };

  const healthStats = [
    { label: 'Blood Group', value: user.bloodGroup, icon: 'water-drop', color: '#F44336' },
    { label: 'Height', value: user.height, icon: 'height', color: '#2196F3' },
    { label: 'Weight', value: user.weight, icon: 'monitor-weight', color: '#4CAF50' },
    { label: 'BMI', value: user.bmi, icon: 'fitness-center', color: '#FF9800' },
  ];

  const menuItems: MenuItem[] = [
    {
      id: 1,
      icon: 'person',
      title: 'Edit Profile',
      subtitle: 'Update your personal information',
      color: colors.primary,
      screen: 'EditProfile',
    },
    {
      id: 2,
      icon: 'medical-information',
      title: 'Medical Records',
      subtitle: 'View your health history',
      color: '#4CAF50',
      screen: 'MedicalRecords',
    },
    {
      id: 3,
      icon: 'history',
      title: 'Health History',
      subtitle: 'Daily health and mood records',
      color: '#00BCD4',
      screen: 'HealthHistory',
    },
    {
      id: 4,
      icon: 'calendar-today',
      title: 'Appointments',
      subtitle: 'Manage your appointments',
      color: '#FF9800',
      screen: 'Appointments',
    },
    {
      id: 5,
      icon: 'notifications',
      title: 'Notifications',
      subtitle: 'Manage notification preferences',
      color: '#E91E63',
      hasToggle: true,
      toggleValue: notifications,
    },
    {
      id: 6,
      icon: 'sync',
      title: 'Health Connect Sync',
      subtitle: 'Auto-sync health data',
      color: '#00BCD4',
      hasToggle: true,
      toggleValue: healthSync,
    },
    {
      id: 7,
      icon: 'dark-mode',
      title: 'Dark Mode',
      subtitle: 'Toggle dark theme',
      color: '#673AB7',
      hasToggle: true,
      toggleValue: darkMode,
    },
    {
      id: 8,
      icon: 'language',
      title: 'Language',
      subtitle: 'English',
      color: '#795548',
    },
    {
      id: 9,
      icon: 'help',
      title: 'Help & Support',
      subtitle: 'Get help and contact us',
      color: '#607D8B',
    },
    {
      id: 10,
      icon: 'privacy-tip',
      title: 'Privacy Policy',
      subtitle: 'Read our privacy policy',
      color: '#9E9E9E',
    },
    {
      id: 11,
      icon: 'info',
      title: 'About',
      subtitle: 'Version 1.0.0',
      color: '#03A9F4',
    },
  ];

  const handleToggle = (itemId: number) => {
    switch (itemId) {
      case 4:
        setNotifications(!notifications);
        setSnackbarMessage(`Notifications ${!notifications ? 'enabled' : 'disabled'}`);
        break;
      case 5:
        setHealthSync(!healthSync);
        setSnackbarMessage(`Health sync ${!healthSync ? 'enabled' : 'disabled'}`);
        break;
      case 6:
        setDarkMode(!darkMode);
        setSnackbarMessage(`Dark mode ${!darkMode ? 'enabled' : 'disabled'}`);
        break;
    }
    setSnackbarVisible(true);
  };

  const handleMenuPress = (item: MenuItem) => {
    if (item.hasToggle) {
      handleToggle(item.id);
    } else if (item.screen) {
      navigation.navigate(item.screen as never);
    } else {
      setSnackbarMessage(`${item.title} coming soon!`);
      setSnackbarVisible(true);
    }
  };

  const handleLogout = async () => {
    setSnackbarMessage('Logging out...');
    setSnackbarVisible(true);
    await logout();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={colors.gradients.primary} style={styles.header}>
        <View style={styles.headerContent}>
          <IconButton
            icon="arrow-left"
            iconColor="white"
            size={24}
            onPress={() => navigation.goBack()}
          />
          <Text style={styles.headerTitle}>Profile</Text>
          <IconButton
            icon="pencil"
            iconColor="white"
            size={24}
            onPress={() => handleMenuPress(menuItems[0])}
          />
        </View>

        {/* Profile Card */}
        <View style={styles.profileSection}>
          <Avatar.Text
            size={80}
            label={user.name.substring(0, 2).toUpperCase()}
            style={styles.avatar}
          />
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <Text style={styles.memberSince}>Member since {user.memberSince}</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Health Stats */}
        <View style={styles.statsContainer}>
          {healthStats.map((stat, index) => (
            <Card key={index} style={styles.statCard}>
              <Card.Content style={styles.statContent}>
                <Icon name={stat.icon} size={24} color={stat.color} />
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </Card.Content>
            </Card>
          ))}
        </View>

        {/* Menu Items */}
        <Card style={styles.menuCard}>
          <Card.Content style={{ padding: 0 }}>
            {menuItems.map((item, index) => (
              <React.Fragment key={item.id}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleMenuPress(item)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
                    <Icon name={item.icon} size={22} color={item.color} />
                  </View>
                  <View style={styles.menuText}>
                    <Text style={styles.menuTitle}>{item.title}</Text>
                    <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                  </View>
                  {item.hasToggle ? (
                    <Switch
                      value={
                        item.id === 4 ? notifications :
                        item.id === 5 ? healthSync :
                        item.id === 6 ? darkMode : false
                      }
                      onValueChange={() => handleToggle(item.id)}
                      trackColor={{ false: colors.outline, true: colors.primary }}
                    />
                  ) : (
                    <Icon name="chevron-right" size={24} color={colors.outline} />
                  )}
                </TouchableOpacity>
                {index < menuItems.length - 1 && <Divider style={styles.divider} />}
              </React.Fragment>
            ))}
          </Card.Content>
        </Card>

        {/* Logout Button */}
        <Button
          mode="outlined"
          icon="logout"
          onPress={handleLogout}
          style={styles.logoutButton}
          textColor={colors.error}
        >
          Logout
        </Button>

        {/* App Version */}
        <Text style={styles.versionText}>AarogyaSaathi v1.0.0</Text>

        <View style={{ height: 100 }} />
      </ScrollView>

      <Portal>
        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={2000}
        >
          {snackbarMessage}
        </Snackbar>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  profileSection: {
    alignItems: 'center',
    marginTop: 8,
  },
  avatar: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginTop: 12,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  memberSince: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    marginTop: -10,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  menuCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: {
    flex: 1,
    marginLeft: 12,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.onBackground,
  },
  menuSubtitle: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  divider: {
    marginHorizontal: 16,
    backgroundColor: colors.outlineVariant,
  },
  logoutButton: {
    marginTop: 24,
    borderRadius: 12,
    borderColor: colors.error,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 16,
  },
});

export default ProfileScreen;
