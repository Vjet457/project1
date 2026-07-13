# Emergency Alerts & Location Sharing

This document describes the emergency alert system with real-time location sharing to emergency contacts.

## Overview

When a critical health score is detected (< 40), the app automatically:
1. Fetches the user's real-time GPS location
2. Sends emergency alerts to all registered emergency contacts
3. Includes location details and a Google Maps link
4. Logs the incident on the backend

## Features

### Automatic Emergency Detection
- Triggers when health score drops below 40
- 15-second countdown before navigating to Emergency screen
- Sends immediate alerts to emergency contacts

### Manual Test Mode
- Orange "TEST" button on Dashboard
- Simulates critical score scenario
- Useful for testing emergency contact notifications

### Emergency Contact Management
- Store multiple emergency contacts (name, phone, email)
- Support for SMS and email notifications
- Contacts managed via backend API

### Location Sharing
- Real-time GPS coordinates
- Accuracy information included
- Google Maps link for easy navigation
- Location permission handling for Android/iOS

### Cancellation Alerts
- Red "CANCEL" button appears when emergency is active
- Notifies emergency contacts when alert is cancelled
- Resets health score and timer

## Setup Instructions

### 1. Install Required Dependencies

```bash
npm install react-native-geolocation-service
```

### 2. Android Permissions (AndroidManifest.xml)

Add to your AndroidManifest.xml:
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

### 3. iOS Permissions (Info.plist)

Add to your Info.plist:
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Your health app needs access to your location for emergency services.</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Your health app needs access to your location for emergency services.</string>
```

### 4. Backend API Endpoints Required

Your backend should implement these endpoints:

#### Get Emergency Contacts
```
GET /api/user/emergency-contacts
Response: { contacts: EmergencyContact[] }
```

#### Add Emergency Contact
```
POST /api/user/emergency-contacts
Body: { name, phone, email, relationship }
```

#### Update Emergency Contact
```
PUT /api/user/emergency-contacts/:id
Body: { ...updates }
```

#### Delete Emergency Contact
```
DELETE /api/user/emergency-contacts/:id
```

#### Send Emergency Alert
```
POST /api/emergency-alerts/send
Body: {
  contactPhone: string
  contactEmail: string
  message: string
  location: { latitude, longitude, mapsUrl }
  userName: string
  healthScore: number
  timestamp: string
}
```

#### Log Emergency Incident
```
POST /api/emergency-incidents/log
Body: {
  userName: string
  location: LocationData
  healthScore: number
  notifications: EmergencyNotification[]
  timestamp: string
}
```

## Data Models

### EmergencyContact
```typescript
{
  id: string
  name: string              // Contact person's name
  phone: string             // Phone number for SMS
  email?: string            // Email for notifications
  relationship?: string     // Relationship (e.g., "Mother", "Friend")
}
```

### LocationData
```typescript
{
  latitude: number
  longitude: number
  accuracy: number          // GPS accuracy in meters
  timestamp: number         // Unix timestamp
}
```

### EmergencyNotification
```typescript
{
  contactId: string
  contactName: string
  contactPhone: string
  contactEmail?: string
  message: string
  location: LocationData
  mapsUrl: string
  sentAt: string
  status: 'pending' | 'sent' | 'failed'
}
```

## Usage

### Trigger Emergency Alert (Manual)
```typescript
await triggerEmergencyAlert(healthScore);
```

### Send Emergency Alert to Contacts
```typescript
await emergencyContactService.sendEmergencyAlert(
  location,
  mapsUrl,
  userName,
  healthScore
);
```

### Notify Contacts of Cancellation
```typescript
await emergencyContactService.sendEmergencyCancellation(userName);
```

### Get Current Location
```typescript
const location = await geolocationService.getCurrentLocation();
// Returns: { latitude, longitude, accuracy, timestamp }
```

### Watch Location (Real-time Tracking)
```typescript
geolocationService.watchLocation(
  (location) => console.log('Location updated:', location),
  (error) => console.error('Location error:', error)
);
```

### Stop Watching Location
```typescript
geolocationService.stopWatching();
```

## Alert Message Format

Emergency contacts receive messages in this format:

```
EMERGENCY ALERT: [Username] has triggered an emergency alert 
with a critical health score of [score]/100. 
Location: [latitude], [longitude]. 
Maps: [Google Maps URL]
```

## Error Handling

- If location permission is denied, alerts are still sent without coordinates
- If backend is unreachable, alerts are queued locally
- Failed notifications are logged with error details
- Service gracefully handles network timeouts

## Security Considerations

- Location data is encrypted in transit (HTTPS)
- Emergency contacts are stored securely on backend
- Permissions are requested explicitly
- Users can cancel alerts at any time
- All incidents are logged for audit purposes

## Testing

### Test Mode
1. Click orange "TEST" button on Dashboard
2. Confirm alert dialog
3. Watch for red "CANCEL" button to appear
4. Health score shows as 25/F (critical)
5. After 15 seconds, app navigates to Emergency screen
6. Emergency contacts receive test alert with location

### Manual Testing
- Set health score manually to test automatic triggers
- Use device GPS for accurate location data
- Verify SMS/email delivery to registered contacts

## Troubleshooting

### Location Permission Issues
- Ensure permissions are added to AndroidManifest.xml and Info.plist
- Request location permission before emergency trigger
- Check device location settings are enabled

### Alerts Not Received
- Verify backend SMS/email service is configured
- Check emergency contact information is correct
- Review backend logs for send failures
- Ensure network connectivity

### Geolocation Errors
- Enable location services on device
- Try high accuracy mode (may take longer)
- Fall back to last known location if current fails

## Performance Notes

- Location requests timeout after 15 seconds
- Watch updates have no minimum distance filter (all changes)
- Multiple simultaneous geolocation requests are consolidated
- Emergency notifications are sent in parallel

