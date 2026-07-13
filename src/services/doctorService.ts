// Doctor Finder Service
import api from './api';

export interface Doctor {
  id: string;
  name: string;
  specialization: string;
  qualification: string;
  experience: number; // years
  rating: number;
  reviewCount: number;
  consultationFee: number;
  hospital: string;
  address: string;
  city: string;
  pincode: string;
  latitude: number;
  longitude: number;
  distance?: number; // km from user
  availableSlots: TimeSlot[];
  languages: string[];
  profilePhoto?: string;
  isAvailableNow: boolean;
  acceptsOnline: boolean;
}

export interface TimeSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
  type: 'in_person' | 'video' | 'both';
}

export interface Appointment {
  id: string;
  userId: string;
  doctorId: string;
  doctor: Doctor;
  slotId: string;
  date: string;
  time: string;
  type: 'in_person' | 'video';
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  symptoms?: string[];
  notes?: string;
  prescription?: Prescription;
  createdAt: string;
}

export interface Prescription {
  id: string;
  appointmentId: string;
  diagnosis: string;
  medications: Medication[];
  instructions: string;
  followUpDate?: string;
  createdAt: string;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface DoctorSearchParams {
  specialization?: string;
  city?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  maxDistance?: number;
  minRating?: number;
  availableToday?: boolean;
  acceptsOnline?: boolean;
  page?: number;
  limit?: number;
}

interface BackendDoctor {
  _id?: string;
  id?: string;
  name: string;
  specialization: string;
  qualifications?: string[];
  experience?: number;
  hospital?: {
    name?: string;
    address?: string;
    city?: string;
  };
  clinicAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  location?: {
    coordinates?: [number, number];
  };
  consultationFee?: {
    inPerson?: number;
    online?: number;
  };
  ratings?: {
    average?: number;
    count?: number;
  };
  availability?: {
    days?: string[];
    timings?: {
      morning?: { start?: string; end?: string };
      evening?: { start?: string; end?: string };
    };
    onlineConsultation?: boolean;
  };
  languages?: string[];
  profilePicture?: string;
  isVerified?: boolean;
  isActive?: boolean;
}

interface BackendDoctorsResponse {
  success: boolean;
  count?: number;
  total?: number;
  pages?: number;
  currentPage?: number;
  data?: BackendDoctor[];
  message?: string;
  error?: string;
}

const SPECIALIZATION_LABELS: Record<string, string> = {
  general_physician: 'General Physician',
  cardiologist: 'Cardiologist',
  dermatologist: 'Dermatologist',
  orthopedic: 'Orthopedic',
  pediatrician: 'Pediatrician',
  gynecologist: 'Gynecologist',
  psychiatrist: 'Psychiatrist',
  psychologist: 'Psychologist',
  neurologist: 'Neurologist',
  ophthalmologist: 'Ophthalmologist',
  ent_specialist: 'ENT Specialist',
  dentist: 'Dentist',
  pulmonologist: 'Pulmonologist',
  gastroenterologist: 'Gastroenterologist',
  endocrinologist: 'Endocrinologist',
  urologist: 'Urologist',
  oncologist: 'Oncologist',
  nephrologist: 'Nephrologist',
  rheumatologist: 'Rheumatologist',
  allergist: 'Allergist',
};

const formatAvailability = (availability?: BackendDoctor['availability']): string => {
  if (!availability?.days?.length) {
    return 'Availability not listed';
  }

  const days = availability.days.slice(0, 3).map(day => day.charAt(0).toUpperCase() + day.slice(1));
  const morning = availability.timings?.morning;
  const evening = availability.timings?.evening;
  const timeParts = [
    morning?.start && morning?.end ? `${morning.start}-${morning.end}` : '',
    evening?.start && evening?.end ? `${evening.start}-${evening.end}` : '',
  ].filter(Boolean);

  return `${days.join(', ')}${timeParts.length ? ` • ${timeParts.join(' / ')}` : ''}`;
};

const isDoctorAvailableNow = (availability?: BackendDoctor['availability']): boolean => {
  if (!availability?.days?.length) {
    return false;
  }

  const today = new Date();
  const dayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][today.getDay()];
  if (!availability.days.includes(dayKey)) {
    return false;
  }

  const nowMinutes = today.getHours() * 60 + today.getMinutes();
  const parseTime = (time?: string) => {
    if (!time) return null;
    const [hours, minutes] = time.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
  };

  const morningStart = parseTime(availability.timings?.morning?.start);
  const morningEnd = parseTime(availability.timings?.morning?.end);
  const eveningStart = parseTime(availability.timings?.evening?.start);
  const eveningEnd = parseTime(availability.timings?.evening?.end);

  const inMorning = morningStart !== null && morningEnd !== null && nowMinutes >= morningStart && nowMinutes <= morningEnd;
  const inEvening = eveningStart !== null && eveningEnd !== null && nowMinutes >= eveningStart && nowMinutes <= eveningEnd;

  return inMorning || inEvening;
};

const transformBackendDoctor = (doctor: BackendDoctor): Doctor => ({
  id: String(doctor._id || doctor.id || doctor.name),
  name: doctor.name,
  specialization: SPECIALIZATION_LABELS[doctor.specialization] || doctor.specialization,
  qualification: (doctor.qualifications || []).join(', ') || 'Medical Professional',
  experience: doctor.experience || 0,
  rating: doctor.ratings?.average || 0,
  reviewCount: doctor.ratings?.count || 0,
  consultationFee: doctor.consultationFee?.inPerson || doctor.consultationFee?.online || 0,
  hospital: doctor.hospital?.name || 'Hospital',
  address: doctor.clinicAddress?.street || doctor.hospital?.address || '',
  city: doctor.clinicAddress?.city || doctor.hospital?.city || '',
  pincode: doctor.clinicAddress?.zipCode || '',
  latitude: doctor.location?.coordinates?.[1] || 0,
  longitude: doctor.location?.coordinates?.[0] || 0,
  distance: undefined,
  availableSlots: [],
  languages: doctor.languages || [],
  profilePhoto: doctor.profilePicture,
  isAvailableNow: isDoctorAvailableNow(doctor.availability),
  acceptsOnline: Boolean(doctor.availability?.onlineConsultation),
});

class DoctorService {
  // Search doctors using the real backend route
  async searchDoctors(params: DoctorSearchParams): Promise<{ success: boolean; data?: Doctor[]; error?: string }> {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });

      const response = await api.get<BackendDoctorsResponse>(`/doctors?${queryParams.toString()}`);
      const mappedDoctors = (response.data?.data || []).map(transformBackendDoctor);
      return { success: response.success, data: mappedDoctors, error: response.error };
    } catch (error) {
      console.error('Search doctors error:', error);
      return { success: false, error: 'Failed to search doctors' };
    }
  }

  // Get doctor by ID
  async getDoctorById(id: string): Promise<{ success: boolean; data?: Doctor; error?: string }> {
    try {
      const response = await api.get<{ success: boolean; data?: BackendDoctor; error?: string }>(`/doctors/${id}`);
      const doctor = response.data?.data ? transformBackendDoctor(response.data.data) : undefined;
      return { success: response.success, data: doctor, error: response.error };
    } catch (error) {
      console.error('Get doctor error:', error);
      return { success: false, error: 'Failed to fetch doctor details' };
    }
  }

  // Get available slots
  async getAvailableSlots(
    doctorId: string,
    date: string
  ): Promise<{ success: boolean; data?: TimeSlot[]; error?: string }> {
    try {
      const doctorResponse = await this.getDoctorById(doctorId);
      const availability = doctorResponse.data;

      if (!doctorResponse.success || !availability) {
        return { success: false, error: doctorResponse.error || 'Failed to fetch available slots' };
      }

      const backend = await api.get<{ success: boolean; data?: BackendDoctor }>(`/doctors/${doctorId}`);
      const rawDoctor = backend.data?.data;
      const availableSlots: TimeSlot[] = [];

      if (rawDoctor?.availability?.days?.length) {
        const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const canSeeDoctor = rawDoctor.availability.days.includes(dayName);
        if (canSeeDoctor) {
          const morning = rawDoctor.availability.timings?.morning;
          const evening = rawDoctor.availability.timings?.evening;

          if (morning?.start && morning?.end) {
            availableSlots.push({
              id: `${doctorId}-${date}-morning`,
              date,
              startTime: morning.start,
              endTime: morning.end,
              isBooked: false,
              type: rawDoctor.availability.onlineConsultation ? 'both' : 'in_person',
            });
          }

          if (evening?.start && evening?.end) {
            availableSlots.push({
              id: `${doctorId}-${date}-evening`,
              date,
              startTime: evening.start,
              endTime: evening.end,
              isBooked: false,
              type: rawDoctor.availability.onlineConsultation ? 'both' : 'in_person',
            });
          }
        }
      }

      return { success: true, data: availableSlots };
    } catch (error) {
      console.error('Get slots error:', error);
      return { success: false, error: 'Failed to fetch available slots' };
    }
  }

  // Book appointment
  async bookAppointment(
    doctorId: string,
    slotId: string,
    type: 'in_person' | 'video',
    symptoms?: string[],
    notes?: string
  ): Promise<{ success: boolean; data?: Appointment; error?: string }> {
    try {
      const response = await api.post<Appointment>('/appointments', {
        doctorId,
        slotId,
        type,
        symptoms,
        notes,
      });
      return { success: response.success, data: response.data, error: response.error };
    } catch (error) {
      console.error('Book appointment error:', error);
      return { success: false, error: 'Failed to book appointment' };
    }
  }

  // Get user appointments
  async getAppointments(
    status?: Appointment['status']
  ): Promise<{ success: boolean; data?: Appointment[]; error?: string }> {
    try {
      const query = status ? `?status=${status}` : '';
      const response = await api.get<Appointment[]>(`/appointments${query}`);
      return { success: response.success, data: response.data, error: response.error };
    } catch (error) {
      console.error('Get appointments error:', error);
      return { success: false, error: 'Failed to fetch appointments' };
    }
  }

  // Cancel appointment
  async cancelAppointment(appointmentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.patch(`/appointments/${appointmentId}/cancel`, {});
      return { success: response.success, error: response.error };
    } catch (error) {
      console.error('Cancel appointment error:', error);
      return { success: false, error: 'Failed to cancel appointment' };
    }
  }

  // Get specializations list
  async getSpecializations(): Promise<{ success: boolean; data?: string[]; error?: string }> {
    try {
      const response = await api.get<{ success: boolean; data?: Array<{ value: string; label: string }> }>('/doctors/specializations');
      const specializations = response.data?.data?.map((item) => item.label) || [];
      return { success: response.success, data: specializations, error: response.error };
    } catch (error) {
      console.error('Get specializations error:', error);
      // Return default list if API fails
      return {
        success: true,
        data: [
          'General Physician',
          'Cardiologist',
          'Dermatologist',
          'Orthopedic',
          'Pediatrician',
          'Gynecologist',
          'Neurologist',
          'Psychiatrist',
          'ENT Specialist',
          'Ophthalmologist',
          'Dentist',
          'Pulmonologist',
          'Gastroenterologist',
          'Urologist',
          'Endocrinologist',
        ],
      };
    }
  }

  // Rate doctor
  async rateDoctor(
    doctorId: string,
    rating: number,
    review?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.post(`/doctors/${doctorId}/review`, { rating, comment: review });
      return { success: response.success, error: response.error };
    } catch (error) {
      console.error('Rate doctor error:', error);
      return { success: false, error: 'Failed to submit review' };
    }
  }

  // Get nearby doctors
  async getNearbyDoctors(
    latitude: number,
    longitude: number,
    maxDistance: number = 10 // km
  ): Promise<{ success: boolean; data?: Doctor[]; error?: string }> {
    try {
      const response = await api.get<BackendDoctorsResponse>(`/doctors/nearby/location?lat=${latitude}&lng=${longitude}&radius=${maxDistance}`);
      const mappedDoctors = (response.data?.data || []).map(transformBackendDoctor);
      return { success: response.success, data: mappedDoctors, error: response.error };
    } catch (error) {
      console.error('Get nearby doctors error:', error);
      return { success: false, error: 'Failed to fetch nearby doctors' };
    }
  }

  getLiveAvailabilityLabel(doctor: Doctor): string {
    return doctor.isAvailableNow
      ? 'Available now'
      : doctor.acceptsOnline
        ? 'Available online'
        : 'Next slot based on schedule';
  }
}

export const doctorService = new DoctorService();
export default doctorService;
