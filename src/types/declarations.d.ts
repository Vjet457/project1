// Type declarations for packages without built-in types

declare module 'react-native-linear-gradient' {
  import { ComponentType } from 'react';
  import { ViewProps } from 'react-native';

  interface LinearGradientProps extends ViewProps {
    colors: string[];
    start?: { x: number; y: number };
    end?: { x: number; y: number };
    locations?: number[];
    useAngle?: boolean;
    angle?: number;
    angleCenter?: { x: number; y: number };
  }

  const LinearGradient: ComponentType<LinearGradientProps>;
  export default LinearGradient;
}

declare module 'react-native-health-connect' {
  export type RecordType =
    | 'HeartRate'
    | 'Steps'
    | 'OxygenSaturation'
    | 'BloodPressure'
    | 'BloodGlucose'
    | 'TotalCaloriesBurned'
    | 'ActiveCaloriesBurned'
    | 'BasalMetabolicRate'
    | 'Distance'
    | 'SleepSession'
    | 'Weight'
    | 'Height'
    | 'BodyTemperature';

  export type AccessType = 'read' | 'write';

  export interface Permission {
    accessType: AccessType;
    recordType: RecordType;
  }

  export interface TimeRangeFilter {
    operator: 'between' | 'before' | 'after';
    startTime?: string;
    endTime?: string;
  }

  export interface ReadRecordsOptions {
    timeRangeFilter: TimeRangeFilter;
  }

  // Generic health record - properties vary by record type
  export interface HealthRecord {
    startTime?: string;
    endTime?: string;
    time?: string;
    samples?: Array<{ beatsPerMinute?: number; time?: string }>;
    count?: number;
    percentage?: number;
    systolic?: { inMillimetersOfMercury: number };
    diastolic?: { inMillimetersOfMercury: number };
    energy?: { inKilocalories: number };
    distance?: { inMeters?: number; inKilometers?: number };
    basalMetabolicRate?: { inKilocaloriesPerDay: number };
    [key: string]: any;
  }

  export interface ReadRecordsResult {
    records: HealthRecord[];
  }

  export enum SdkAvailabilityStatus {
    SDK_UNAVAILABLE = 1,
    SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED = 2,
    SDK_AVAILABLE = 3
  }

  export function initialize(): Promise<boolean>;
  export function getSdkStatus(): Promise<SdkAvailabilityStatus>;
  export function requestPermission(permissions: Permission[]): Promise<Permission[]>;
  export function readRecords(
    recordType: RecordType,
    options: ReadRecordsOptions
  ): Promise<ReadRecordsResult>;
  export function openHealthConnectSettings(): Promise<void>;
  export function openHealthConnectDataManagement(): Promise<void>;
}
