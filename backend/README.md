# AarogyaSaathi Backend

Backend API for the AarogyaSaathi health application.

## Prerequisites

- Node.js (v18+)
- MongoDB (local or Atlas)

## Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Update the `.env` file with your MongoDB connection string and JWT secret.

4. To enable real SOS SMS delivery to emergency contacts, set one of the following Twilio options:
	- `TWILIO_ACCOUNT_SID`
	- `TWILIO_AUTH_TOKEN`
	- `TWILIO_FROM_NUMBER` or `TWILIO_MESSAGING_SERVICE_SID`
	- `TWILIO_WHATSAPP_FROM_NUMBER` for WhatsApp alerts

5. Start MongoDB (if running locally):
```bash
mongod
```

6. Seed the database with sample doctors (optional):
```bash
npm run seed
```

7. Start the server:
```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm start
```

The server will run on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user
- `PUT /api/auth/change-password` - Change password

### User Profile
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `PUT /api/users/medical-info` - Update medical info
- `DELETE /api/users/account` - Deactivate account

### Health Records
- `POST /api/health/record` - Create health record
- `GET /api/health/records` - Get all health records
- `GET /api/health/record/:id` - Get single record
- `PUT /api/health/record/:id` - Update record
- `DELETE /api/health/record/:id` - Delete record
- `GET /api/health/stats` - Get health statistics
- `GET /api/health/today` - Get today's health data

### Mental Health
- `POST /api/mental-health/record` - Create mental health record
- `GET /api/mental-health/records` - Get all records
- `GET /api/mental-health/record/:id` - Get single record
- `PUT /api/mental-health/record/:id` - Update record
- `DELETE /api/mental-health/record/:id` - Delete record
- `GET /api/mental-health/mood-history` - Get mood history
- `GET /api/mental-health/stats` - Get statistics
- `GET /api/mental-health/today` - Get today's entry

### Symptoms
- `POST /api/symptoms/check` - Create symptom check
- `GET /api/symptoms/history` - Get symptom history
- `GET /api/symptoms/check/:id` - Get single check
- `PUT /api/symptoms/check/:id` - Update check
- `PUT /api/symptoms/check/:id/resolve` - Mark resolved
- `DELETE /api/symptoms/check/:id` - Delete check
- `GET /api/symptoms/active` - Get active symptoms

### Emergency
- `GET /api/emergency/contacts` - Get emergency contacts
- `POST /api/emergency/contacts` - Add contact
- `PUT /api/emergency/contacts/:id` - Update contact
- `DELETE /api/emergency/contacts/:id` - Delete contact
- `PUT /api/emergency/medical-info` - Update medical info
- `PUT /api/emergency/preferred-hospital` - Set preferred hospital
- `POST /api/emergency/trigger-sos` - Trigger SOS alert
- `POST /api/emergency/notify` - Send emergency notifications to saved contacts
- `GET /api/emergency/history` - Get emergency history

When Twilio is configured in `.env`, `POST /api/emergency/trigger-sos` will send SMS messages to contacts marked for emergency alerts. If `TWILIO_WHATSAPP_FROM_NUMBER` is set and a contact has WhatsApp enabled, the same SOS will also go via WhatsApp.

### Doctors
- `GET /api/doctors` - Get all doctors (with filters)
- `GET /api/doctors/specializations` - Get specialization list
- `GET /api/doctors/:id` - Get doctor details
- `POST /api/doctors/:id/review` - Add review
- `GET /api/doctors/nearby/location` - Get nearby doctors

## Database Models

- **User** - User account and profile
- **HealthRecord** - Physical health tracking
- **MentalHealthRecord** - Mental health and mood tracking
- **SymptomCheck** - Symptom checker results
- **EmergencyContact** - Emergency contacts and SOS data
- **Doctor** - Doctor profiles and reviews
