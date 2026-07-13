import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { TabParamList } from '../types';
import Colors from '../utils/colors';

import DashboardScreen from '../screens/DashboardScreen';
import HealthTrackingScreen from '../screens/HealthTrackingScreen';
import MentalHealthScreen from '../screens/MentalHealthScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator<TabParamList>();

const TabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          paddingBottom: 8,
          paddingTop: 8,
          height: 65,
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: Colors.black,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'DashboardTab':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'HealthTab':
              iconName = focused ? 'heart-pulse' : 'heart-outline';
              break;
            case 'MentalTab':
              iconName = focused ? 'head-heart' : 'head-heart-outline';
              break;
            case 'ProfileTab':
              iconName = focused ? 'account' : 'account-outline';
              break;
            default:
              iconName = 'help-circle-outline';
          }

          return <Icon name={iconName} size={26} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="HealthTab"
        component={HealthTrackingScreen}
        options={{ tabBarLabel: 'Health' }}
      />
      <Tab.Screen
        name="MentalTab"
        component={MentalHealthScreen}
        options={{ tabBarLabel: 'Mental' }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;
