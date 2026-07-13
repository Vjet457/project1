import Geolocation from 'react-native-geolocation-service';
import { PermissionsAndroid, Platform } from 'react-native';

interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface LocationError {
  code: number;
  message: string;
}

class GeolocationService {
  private watchId: number | null = null;

  async requestLocationPermission(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      return true; // iOS permissions handled via Info.plist
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'This app needs access to your location for emergency services.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.error('Location permission error:', err);
      return false;
    }
  }

  getCurrentLocation(): Promise<LocationCoordinates> {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          });
        },
        (error) => {
          const locationError: LocationError = {
            code: error.code,
            message: error.message,
          };
          reject(locationError);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });
  }

  watchLocation(
    onLocationChange: (location: LocationCoordinates) => void,
    onError: (error: LocationError) => void
  ): number {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
    }

    this.watchId = Geolocation.watchPosition(
      (position) => {
        onLocationChange({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        onError({
          code: error.code,
          message: error.message,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
        distanceFilter: 0,
      }
    );

    return this.watchId;
  }

  stopWatching(): void {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  getGoogleMapsUrl(latitude: number, longitude: number): string {
    return `https://maps.google.com/?q=${latitude},${longitude}`;
  }

  getLocationString(latitude: number, longitude: number): string {
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  }
}

export const geolocationService = new GeolocationService();
