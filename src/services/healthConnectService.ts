type HealthPermission = {
  accessType: 'read' | 'write';
  recordType: string;
};

type HealthConnectModule = {
  initialize: () => Promise<boolean>;
  requestPermission: (permissions: HealthPermission[]) => Promise<HealthPermission[]>;
  readRecords: (recordType: string, options: any) => Promise<{ records?: any[] }>;
  aggregateRecord?: (request: any) => Promise<any>;
  getSdkStatus?: () => Promise<number>;
  openHealthConnectSettings?: () => Promise<void>;
  SdkAvailabilityStatus?: {
    SDK_AVAILABLE?: number;
    SDK_UNAVAILABLE?: number;
    SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED?: number;
  };
};

let healthConnectModule: HealthConnectModule | null = null;
let healthConnectModuleLoadAttempted = false;

const getHealthConnectModule = (): HealthConnectModule | null => {
  if (healthConnectModuleLoadAttempted) {
    return healthConnectModule;
  }

  healthConnectModuleLoadAttempted = true;

  try {
    healthConnectModule = require('react-native-health-connect') as HealthConnectModule;
    return healthConnectModule;
  } catch (error) {
    console.error('Health Connect module load error:', error);
    healthConnectModule = null;
    return null;
  }
};

export interface WearableData {
  steps: number;
  speed: number;
  calories: number;
  activeCalories: number;
  distance: number;
  heartRate: number;
  restingHeartRate: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  sleepDurationMinutes: number;
  stressLevel: number;
  workoutDurationMinutes: number;
  workoutType: string;
  oxygenSaturation: number;
  respiratoryRate: number;
  bmi: number;
  basalMetabolicRate: number;
  timestamp: Date;
}

export interface HealthDataResult {
  success: boolean;
  data: Partial<WearableData>;
  errors: string[];
}

export interface HealthConnectData {
  heartRate: number;
  bloodOxygen: number;
  bloodPressure: {
    systolic: number;
    diastolic: number;
  };
  steps: number;
  calories: number;
  distance: number;
  sleep: number;
  bmi: number;
  basalMetabolicRate: number;
  activeCalories: number;
}

let isInitialized = false;
let hasPermissions = false;
const grantedRecordTypes = new Set<string>();

class WearableService {
  private readonly STEPS_GOAL = 10000;
  private readonly CALORIES_GOAL = 2000;
  private readonly SLEEP_GOAL_HOURS = 8;
  private useMockData = false;
  private permissionPromise: Promise<boolean> | null = null;
  private userProfile: {
    age?: number;
    weight?: number; // in kg
    height?: number; // in cm
    gender?: 'male' | 'female';
  } = {};

  enableMockData(enable: boolean) {
    this.useMockData = enable;
    console.log(`Mock data ${enable ? 'enabled' : 'disabled'}`);
  }

  setUserProfile(profile: { age?: number; weight?: number; height?: number; gender?: 'male' | 'female' }) {
    this.userProfile = profile;
  }

  getUserProfile() {
    return { ...this.userProfile };
  }

  calculateBMI(): number {
    // BMI = weight (kg) / (height (m))²
    const { weight, height } = this.userProfile;
    if (!weight || !height) {
      return 0;
    }
    const heightInMeters = height / 100; // Convert cm to meters
    const bmi = weight / (heightInMeters * heightInMeters);
    return Math.round(bmi * 10) / 10; // Round to 1 decimal place
  }

  private getMockData(): Partial<WearableData> {
    return {
      steps: 0,
      speed: 0,
      calories: 0,
      activeCalories: 0,
      distance: 0,
      heartRate: Math.floor(Math.random() * 30) + 65,
      restingHeartRate: Math.floor(Math.random() * 10) + 55,
      bloodPressureSystolic: 0,
      bloodPressureDiastolic: 0,
      sleepDurationMinutes: 0,
      stressLevel: 0,
      workoutDurationMinutes: 0,
      workoutType: 'N/A',
      oxygenSaturation: 0,
      respiratoryRate: 0,
      bmi: 0,
      timestamp: new Date(),
    };
  }

  private getTodayRange() {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setHours(0, 0, 0, 0);

    return {
      // Health Connect uses local time context unless offsets are specified, 
      // but expects an ISO string. Some watches write records for earlier in the day
      // before 00:00 UTC. Offset by 24h as a fallback if needed, but best is to use an 
      // open operator or absolute ISO cutoff with local timezone offsets.
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
    };
  }

  private getRecentRange(hours: number) {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - hours * 60 * 60 * 1000);

    return {
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
    };
  }

  private hasPermission(recordType: string) {
    return grantedRecordTypes.has(recordType);
  }

  private async ensureReady(): Promise<boolean> {
    if (isInitialized && hasPermissions && grantedRecordTypes.size > 0) {
      return true;
    }

    return this.ensurePermissions();
  }

  async ensurePermissions(): Promise<boolean> {
    if (this.permissionPromise) {
      return this.permissionPromise;
    }

    this.permissionPromise = (async () => {
      try {
        const healthConnect = getHealthConnectModule();
        if (!healthConnect) {
          return false;
        }

        const initialized = await healthConnect.initialize();
        isInitialized = initialized;
        if (!initialized) {
          throw new Error('Health Connect not available on this device');
        }

        const permissions: HealthPermission[] = [
          { accessType: 'read', recordType: 'HeartRate' },
          { accessType: 'read', recordType: 'Steps' },
          { accessType: 'read', recordType: 'TotalCaloriesBurned' },
          { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
          { accessType: 'read', recordType: 'Distance' },
          { accessType: 'read', recordType: 'SleepSession' },
          { accessType: 'read', recordType: 'BloodPressure' },
          { accessType: 'read', recordType: 'OxygenSaturation' },
          { accessType: 'read', recordType: 'Height' },
          { accessType: 'read', recordType: 'Weight' },
        ];
        const granted = await healthConnect.requestPermission(permissions);
        grantedRecordTypes.clear();
        granted.forEach(permission => {
          if ('recordType' in permission && permission.recordType) {
            grantedRecordTypes.add(permission.recordType);
          }
        });
        hasPermissions = Array.isArray(granted) && granted.length > 0;
        return hasPermissions;
      } catch (error) {
        console.error('Permission error:', error);
        hasPermissions = false;
        return false;
      } finally {
        this.permissionPromise = null;
      }
    })();

    return this.permissionPromise;
  }

  async fetchSteps(): Promise<number> {
    try {
      const ready = await this.ensureReady();
      if (!ready) {
        return 0;
      }

      if (!this.hasPermission('Steps')) {
        return 0;
      }

      const healthConnect = getHealthConnectModule();
      if (!healthConnect) {
        return 0;
      }

      // Get today's local midnight and tomorrow's local midnight
      const now = new Date();
      
      // Calculate today's local midnight (start of today)
      const todayMidnight = new Date(now);
      todayMidnight.setHours(0, 0, 0, 0);
      
      // Calculate tomorrow's local midnight (end of today)
      const tomorrowMidnight = new Date(todayMidnight);
      tomorrowMidnight.setDate(tomorrowMidnight.getDate() + 1);

      const startTime = todayMidnight.toISOString();
      const endTime = tomorrowMidnight.toISOString();
      
      console.log('Querying steps for full local day from:', startTime, 'to:', endTime);
      console.log('Local day querying 24 hours of data');

      // Try aggregateRecord since that returns a flat COUNT_TOTAL for steps
      if (healthConnect.aggregateRecord) {
        try {
          const result = await healthConnect.aggregateRecord({
            recordType: 'Steps',
            timeRangeFilter: {
              operator: 'between',
              startTime,
              endTime,
            },
          });
          console.log('Health Connect aggregateRecord result:', JSON.stringify(result, null, 2));
          const count = result?.COUNT_TOTAL ?? 0;
          console.log('Total steps from aggregateRecord:', count);
          return count;
        } catch (aggError) {
          console.error('aggregateRecord failed, falling back to readRecords:', aggError);
        }
      }

      // Fallback to readRecords if aggregateRecord fails
      const result = await healthConnect.readRecords('Steps', {
        timeRangeFilter: {
          operator: 'between',
          startTime,
          endTime,
        },
      });
      
      console.log('Health Connect readRecords result:', JSON.stringify(result, null, 2));

      let totalSteps = 0;
      if (result?.records?.length) {
        for (const record of result.records as Array<any>) {
          const recordCount = record?.count ?? 0;
          totalSteps += recordCount;
        }
      }
      return totalSteps;
    } catch (error) {
      console.error('Error fetching steps:', error);
      return 0;
    }
  }

  async fetchSpeed(): Promise<number> {
    return 0;
  }

  async fetchHeartRate(): Promise<{ current: number; resting: number }> {
    try {
      const ready = await this.ensureReady();
      if (!ready) {
        return { current: 0, resting: 0 };
      }

      if (!this.hasPermission('HeartRate')) {
        return { current: 0, resting: 0 };
      }

      const healthConnect = getHealthConnectModule();
      if (!healthConnect) {
        return { current: 0, resting: 0 };
      }

      let { startTime, endTime } = this.getRecentRange(24);

      let heartRateRecords = await healthConnect.readRecords('HeartRate', {
        timeRangeFilter: {
          operator: 'between',
          startTime,
          endTime,
        },
      });

      if (!heartRateRecords?.records?.length) {
        ({ startTime, endTime } = this.getRecentRange(24 * 30));
        heartRateRecords = await healthConnect.readRecords('HeartRate', {
          timeRangeFilter: {
            operator: 'between',
            startTime,
            endTime,
          },
        });
      }

      const latestHeartRateRecord = heartRateRecords?.records?.length
        ? heartRateRecords.records[heartRateRecords.records.length - 1]
        : undefined;
      const latestHeartRateSample = latestHeartRateRecord?.samples?.length
        ? latestHeartRateRecord.samples[latestHeartRateRecord.samples.length - 1]
        : undefined;

      const latestHR = latestHeartRateSample?.beatsPerMinute ?? 0;
      const latestRestingHR = 0;

      return { current: latestHR, resting: latestRestingHR };
    } catch (error) {
      console.error('Error fetching heart rate:', error);
      return { current: 0, resting: 0 };
    }
  }

  async fetchBloodPressure(): Promise<{ systolic: number; diastolic: number }> {
    try {
      const ready = await this.ensureReady();
      if (!ready) {
        return { systolic: 0, diastolic: 0 };
      }

      if (!this.hasPermission('BloodPressure')) {
        return { systolic: 0, diastolic: 0 };
      }

      const healthConnect = getHealthConnectModule();
      if (!healthConnect) {
        return { systolic: 0, diastolic: 0 };
      }

      let { startTime, endTime } = this.getRecentRange(72);

      let bpRecords = await healthConnect.readRecords('BloodPressure', {
        timeRangeFilter: {
          operator: 'between',
          startTime,
          endTime,
        },
      });

      if (!bpRecords?.records?.length) {
        ({ startTime, endTime } = this.getRecentRange(24 * 30));
        bpRecords = await healthConnect.readRecords('BloodPressure', {
          timeRangeFilter: {
            operator: 'between',
            startTime,
            endTime,
          },
        });
      }

      if (bpRecords?.records?.length) {
        const latestBP = bpRecords.records[bpRecords.records.length - 1] as any;
        return {
          systolic: latestBP?.systolic?.inMillimetersOfMercury ?? 0,
          diastolic: latestBP?.diastolic?.inMillimetersOfMercury ?? 0,
        };
      }
      return { systolic: 0, diastolic: 0 };
    } catch (error) {
      console.error('Error fetching blood pressure:', error);
      return { systolic: 0, diastolic: 0 };
    }
  }

  async fetchCalories(): Promise<{ total: number; active: number }> {
    const { startTime, endTime } = this.getTodayRange();
    try {
      const ready = await this.ensureReady();
      if (!ready) {
        return { total: 0, active: 0 };
      }

      if (!this.hasPermission('TotalCaloriesBurned') && !this.hasPermission('ActiveCaloriesBurned')) {
        return { total: 0, active: 0 };
      }

      const healthConnect = getHealthConnectModule();
      if (!healthConnect) {
        return { total: 0, active: 0 };
      }

      const totalCaloriesResult = await healthConnect.readRecords('TotalCaloriesBurned', {
        timeRangeFilter: {
          operator: 'between',
          startTime,
          endTime,
        },
      });

      const activeCaloriesResult = await healthConnect.readRecords('ActiveCaloriesBurned', {
        timeRangeFilter: {
          operator: 'between',
          startTime,
          endTime,
        },
      });

      let totalCalories = 0;
      let activeCalories = 0;

      if (totalCaloriesResult?.records?.length) {
        for (const day of totalCaloriesResult.records as Array<any>) {
          totalCalories += day?.energy?.inKilocalories ?? 0;
        }
      }

      if (activeCaloriesResult?.records?.length) {
        for (const day of activeCaloriesResult.records as Array<any>) {
          activeCalories += day?.energy?.inKilocalories ?? 0;
        }
      }

      return { total: totalCalories, active: activeCalories };
    } catch (error) {
      console.error('Error fetching calories:', error);
      return { total: 0, active: 0 };
    }
  }

  async fetchSleep(): Promise<number> {
    const now = new Date();
    const startOfYesterday = new Date();
    startOfYesterday.setDate(now.getDate() - 1);
    startOfYesterday.setHours(18, 0, 0, 0);

    const endOfMorning = new Date();
    endOfMorning.setHours(12, 0, 0, 0);

    try {
      const ready = await this.ensureReady();
      if (!ready) {
        return 0;
      }

      if (!this.hasPermission('SleepSession')) {
        return 0;
      }

      const healthConnect = getHealthConnectModule();
      if (!healthConnect) {
        return 0;
      }

      const sleepRecords = await healthConnect.readRecords('SleepSession', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startOfYesterday.toISOString(),
          endTime: endOfMorning.toISOString(),
        },
      });

      if (sleepRecords?.records?.length) {
        let totalSleepMinutes = 0;
        for (const session of sleepRecords.records as Array<any>) {
          const start = new Date(session.startTime).getTime();
          const end = new Date(session.endTime).getTime();
          totalSleepMinutes += (end - start) / (1000 * 60);
        }
        return Math.round(totalSleepMinutes);
      }
      return 0;
    } catch (error) {
      if (String(error).includes('SecurityException')) {
        return 0;
      }
      console.error('Error fetching sleep:', error);
      return 0;
    }
  }

  async fetchWorkout(): Promise<{ durationMinutes: number; type: string }> {
    return { durationMinutes: 0, type: 'None' };
  }

  async fetchDistance(): Promise<number> {
    const { startTime, endTime } = this.getTodayRange();
    try {
      const ready = await this.ensureReady();
      if (!ready) {
        return 0;
      }

      if (!this.hasPermission('Distance')) {
        return 0;
      }

      const healthConnect = getHealthConnectModule();
      if (!healthConnect) {
        return 0;
      }

      const distanceResult = await healthConnect.readRecords('Distance', {
        timeRangeFilter: {
          operator: 'between',
          startTime,
          endTime,
        },
      });

      let totalDistance = 0;
      if (distanceResult?.records?.length) {
        for (const day of distanceResult.records as Array<any>) {
          totalDistance += day?.distance?.inMeters ?? 0;
        }
      }
      return totalDistance;
    } catch (error) {
      console.error('Error fetching distance:', error);
      return 0;
    }
  }

  async fetchOxygenSaturation(): Promise<number> {
    try {
      const ready = await this.ensureReady();
      if (!ready) {
        return 0;
      }

      if (!this.hasPermission('OxygenSaturation')) {
        return 0;
      }

      const healthConnect = getHealthConnectModule();
      if (!healthConnect) {
        return 0;
      }

      let { startTime, endTime } = this.getRecentRange(24);

      let oxygenRecords = await healthConnect.readRecords('OxygenSaturation', {
        timeRangeFilter: {
          operator: 'between',
          startTime,
          endTime,
        },
      });

      if (!oxygenRecords?.records?.length) {
        ({ startTime, endTime } = this.getRecentRange(24 * 30));
        oxygenRecords = await healthConnect.readRecords('OxygenSaturation', {
          timeRangeFilter: {
            operator: 'between',
            startTime,
            endTime,
          },
        });
      }

      if (oxygenRecords?.records?.length) {
        const latest = oxygenRecords.records[oxygenRecords.records.length - 1] as any;
        return latest?.percentage ?? 0;
      }
      return 0;
    } catch (error) {
      console.error('Error fetching oxygen saturation:', error);
      return 0;
    }
  }

  async fetchRespiratoryRate(): Promise<number> {
    return 0;
  }

  async fetchHeight(): Promise<number> {
    // Height in cm
    try {
      const ready = await this.ensureReady();
      if (!ready) {
        return 0;
      }

      if (!this.hasPermission('Height')) {
        return 0;
      }

      const healthConnect = getHealthConnectModule();
      if (!healthConnect) {
        return 0;
      }

      let { startTime, endTime } = this.getRecentRange(24 * 30);

      const heightRecords = await healthConnect.readRecords('Height', {
        timeRangeFilter: {
          operator: 'between',
          startTime,
          endTime,
        },
      });

      if (heightRecords?.records?.length) {
        const latestHeight = heightRecords.records[heightRecords.records.length - 1] as any;
        // Height is stored in meters in Health Connect, convert to cm
        const heightInCm = (latestHeight?.height?.inMeters ?? 0) * 100;
        return Math.round(heightInCm);
      }
      return 0;
    } catch (error) {
      console.error('Error fetching height:', error);
      return 0;
    }
  }

  async fetchWeight(): Promise<number> {
    // Weight in kg
    try {
      const ready = await this.ensureReady();
      if (!ready) {
        return 0;
      }

      if (!this.hasPermission('Weight')) {
        return 0;
      }

      const healthConnect = getHealthConnectModule();
      if (!healthConnect) {
        return 0;
      }

      let { startTime, endTime } = this.getRecentRange(24 * 30);

      const weightRecords = await healthConnect.readRecords('Weight', {
        timeRangeFilter: {
          operator: 'between',
          startTime,
          endTime,
        },
      });

      if (weightRecords?.records?.length) {
        const latestWeight = weightRecords.records[weightRecords.records.length - 1] as any;
        // Weight is stored in kg in Health Connect
        const weightInKg = latestWeight?.weight?.inKilograms ?? 0;
        return Math.round(weightInKg * 100) / 100;
      }
      return 0;
    } catch (error) {
      console.error('Error fetching weight:', error);
      return 0;
    }
  }

  async fetchAllHealthData(): Promise<HealthDataResult> {
    const errors: string[] = [];
    const data: Partial<WearableData> = {
      timestamp: new Date(),
    };

    if (this.useMockData) {
      console.log('📊 Using mock health data for testing');
      return { success: true, data: this.getMockData(), errors: [] };
    }

    try {
      const [heartRate, steps, calories, sleepMinutes, distance, oxygenSaturation, bloodPressure, workout, height, weight] =
        await Promise.all([
          this.fetchHeartRate().catch((error: Error) => {
            errors.push(`Heart Rate: ${error.message}`);
            return { current: 0, resting: 0 };
          }),
          this.fetchSteps().catch((error: Error) => {
            errors.push(`Steps: ${error.message}`);
            return 0;
          }),
          this.fetchCalories().catch((error: Error) => {
            errors.push(`Calories: ${error.message}`);
            return { total: 0, active: 0 };
          }),
          this.fetchSleep().catch((error: Error) => {
            errors.push(`Sleep: ${error.message}`);
            return 0;
          }),
          this.fetchDistance().catch((error: Error) => {
            errors.push(`Distance: ${error.message}`);
            return 0;
          }),
          this.fetchOxygenSaturation().catch((error: Error) => {
            errors.push(`Oxygen Saturation: ${error.message}`);
            return 0;
          }),
          this.fetchBloodPressure().catch((error: Error) => {
            errors.push(`Blood Pressure: ${error.message}`);
            return { systolic: 0, diastolic: 0 };
          }),
          this.fetchWorkout().catch((error: Error) => {
            errors.push(`Workout: ${error.message}`);
            return { durationMinutes: 0, type: 'None' };
          }),
          this.fetchHeight().catch((error: Error) => {
            errors.push(`Height: ${error.message}`);
            return 0;
          }),
          this.fetchWeight().catch((error: Error) => {
            errors.push(`Weight: ${error.message}`);
            return 0;
          }),
        ]);

      // Update user profile from Health Connect if height and weight are available
      if (height > 0 || weight > 0) {
        this.userProfile.height = height > 0 ? height : this.userProfile.height;
        this.userProfile.weight = weight > 0 ? weight : this.userProfile.weight;
        console.log('Updated user profile from Health Connect - Height:', height, 'Weight:', weight);
      }

      data.heartRate = heartRate.current;
      data.restingHeartRate = heartRate.resting;
      data.steps = steps;
      data.speed = 0;
      data.bloodPressureSystolic = bloodPressure.systolic;
      data.bloodPressureDiastolic = bloodPressure.diastolic;
      data.calories = calories.total;
      data.activeCalories = calories.active;
      data.sleepDurationMinutes = sleepMinutes;
      data.workoutDurationMinutes = workout.durationMinutes;
      data.workoutType = workout.type;
      data.distance = distance;
      data.oxygenSaturation = oxygenSaturation;
      data.respiratoryRate = await this.fetchRespiratoryRate().catch((error: Error) => {
        errors.push(`Respiratory Rate: ${error.message}`);
        return 0;
      });
      data.stressLevel = 0;
      data.bmi = this.calculateBMI();
      data.basalMetabolicRate = data.bmi;

      return { success: true, data, errors };
    } catch (error: any) {
      errors.push(error?.message || 'Unknown error');
      return { success: false, data, errors };
    }
  }

  getStepsGoal(): number {
    return this.STEPS_GOAL;
  }

  getCaloriesGoal(): number {
    return this.CALORIES_GOAL;
  }

  getSleepGoalHours(): number {
    return this.SLEEP_GOAL_HOURS;
  }

  getStepsProgress(steps: number): number {
    return Math.min((steps / this.STEPS_GOAL) * 100, 100);
  }

  getCaloriesProgress(calories: number): number {
    return Math.min((calories / this.CALORIES_GOAL) * 100, 100);
  }

  getSleepProgress(sleepMinutes: number): number {
    const sleepHours = sleepMinutes / 60;
    return Math.min((sleepHours / this.SLEEP_GOAL_HOURS) * 100, 100);
  }

  formatSleepDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  }

  formatDistance(meters: number): string {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${Math.round(meters)} m`;
  }
}

export const wearableService = new WearableService();

const defaultHealthConnectData = (): HealthConnectData => ({
  heartRate: 72,
  bloodOxygen: 98,
  bloodPressure: { systolic: 120, diastolic: 80 },
  steps: 0,
  calories: 0,
  distance: 0,
  sleep: 0,
  bmi: 0,
  basalMetabolicRate: 1400,
  activeCalories: 0,
});

export const isHealthConnectAvailable = async (): Promise<boolean> => {
  try {
    const healthConnect = getHealthConnectModule();
    if (!healthConnect) {
      return false;
    }

    if (healthConnect.getSdkStatus && healthConnect.SdkAvailabilityStatus) {
      const sdkStatus = await healthConnect.getSdkStatus();
      return sdkStatus === healthConnect.SdkAvailabilityStatus.SDK_AVAILABLE;
    }

    const initialized = await healthConnect.initialize();
    isInitialized = initialized;
    return initialized;
  } catch (error) {
    console.error('Health Connect availability error:', error);
    return false;
  }
};

export const initializeHealthConnect = async (): Promise<boolean> => {
  try {
    const healthConnect = getHealthConnectModule();
    if (!healthConnect) {
      return false;
    }

    const initialized = await healthConnect.initialize();
    isInitialized = initialized;
    return initialized;
  } catch (error) {
    console.error('Initialize error:', error);
    return false;
  }
};

export const requestHealthConnectPermissions = async (): Promise<boolean> => {
  const granted = await wearableService.ensurePermissions();
  hasPermissions = granted;
  return granted;
};

export const connectHealthConnect = async (): Promise<boolean> => {
  const initialized = await initializeHealthConnect();
  if (!initialized) {
    return false;
  }
  return requestHealthConnectPermissions();
};

export const readHeartRate = async (): Promise<number> => {
  const result = await wearableService.fetchHeartRate();
  return result.current || 72;
};

export const readSteps = async (): Promise<number> => {
  return wearableService.fetchSteps();
};

export const readBloodOxygen = async (): Promise<number> => {
  const value = await wearableService.fetchOxygenSaturation();
  if (value > 0 && value <= 1) {
    return value * 100;
  }
  return value || 98;
};

export const readBloodPressure = async (): Promise<{ systolic: number; diastolic: number }> => {
  const value = await wearableService.fetchBloodPressure();
  return {
    systolic: value.systolic || 120,
    diastolic: value.diastolic || 80,
  };
};

export const readCalories = async (): Promise<{ total: number; active: number; basal: number }> => {
  const value = await wearableService.fetchCalories();
  return {
    total: value.total,
    active: value.active,
    basal: 1400,
  };
};

export const readSleepData = async (): Promise<number> => {
  const minutes = await wearableService.fetchSleep();
  return minutes / 60;
};

export const readDistance = async (): Promise<number> => {
  return wearableService.fetchDistance();
};

export const getAllHealthData = async (): Promise<HealthConnectData> => {
  try {
    const result = await wearableService.fetchAllHealthData();
    if (!result.success) {
      return defaultHealthConnectData();
    }

    const oxygen = result.data.oxygenSaturation ?? 0;
    const bloodOxygen = oxygen > 0 && oxygen <= 1 ? oxygen * 100 : oxygen || 98;

    return {
      heartRate: result.data.heartRate || 72,
      bloodOxygen,
      bloodPressure: {
        systolic: result.data.bloodPressureSystolic || 120,
        diastolic: result.data.bloodPressureDiastolic || 80,
      },
      steps: result.data.steps || 0,
      calories: result.data.calories || 0,
      distance: result.data.distance || 0,
      sleep: (result.data.sleepDurationMinutes || 0) / 60,
      bmi: result.data.bmi || result.data.basalMetabolicRate || 0,
      basalMetabolicRate: 1400,
      activeCalories: result.data.activeCalories || 0,
    };
  } catch (error) {
    console.error('Get all health data error:', error);
    return defaultHealthConnectData();
  }
};

export const openSettings = async (): Promise<void> => {
  try {
    const healthConnect = getHealthConnectModule();
    if (healthConnect?.openHealthConnectSettings) {
      await healthConnect.openHealthConnectSettings();
    }
  } catch (error) {
    console.error('Open settings error:', error);
  }
};

export const getStatus = () => ({
  isInitialized,
  hasPermissions,
});