/**
 * Health Connect Service
 * Re-export from healthConnectService for backwards compatibility
 */

export {
  wearableService,
  isHealthConnectAvailable,
  initializeHealthConnect,
  requestHealthConnectPermissions,
  connectHealthConnect,
  readHeartRate,
  readSteps,
  readBloodOxygen,
  readBloodPressure,
  readCalories,
  readSleepData,
  readDistance,
  getAllHealthData,
  openSettings as openHealthConnectSettings,
  getStatus,
  type WearableData,
  type HealthDataResult,
  type HealthConnectData,
} from './healthConnectService.ts';
