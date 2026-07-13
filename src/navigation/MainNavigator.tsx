import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainStackParamList } from '../types';

import TabNavigator from './TabNavigator';
import SymptomCheckerScreen from '../screens/SymptomCheckerScreen';
import PhysicalHealthScreen from '../screens/PhysicalHealthScreen';
import EmergencyScreen from '../screens/EmergencyScreen';
import PersonalInfoScreen from '../screens/PersonalInfoScreen';
import DoctorFinderScreen from '../screens/DoctorFinderScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import MedicalRecordsScreen from '../screens/MedicalRecordsScreen';
import HealthHistoryScreen from '../screens/HealthHistoryScreen';
import HealthScoreAnalyticsScreen from '../screens/HealthScoreAnalyticsScreen';

const Stack = createNativeStackNavigator<MainStackParamList>();

const MainNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Dashboard" component={TabNavigator} />
      <Stack.Screen name="SymptomChecker" component={SymptomCheckerScreen} />
      <Stack.Screen name="PhysicalHealth" component={PhysicalHealthScreen} />
      <Stack.Screen name="Emergency" component={EmergencyScreen} />
      <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
      <Stack.Screen name="DoctorFinder" component={DoctorFinderScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="MedicalRecords" component={MedicalRecordsScreen} />
      <Stack.Screen name="HealthHistory" component={HealthHistoryScreen} />
      <Stack.Screen name="HealthScoreAnalytics" component={HealthScoreAnalyticsScreen} />
    </Stack.Navigator>
  );
};

export default MainNavigator;
