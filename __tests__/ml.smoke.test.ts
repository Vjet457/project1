import {
  getMLModelManager,
  getModelStatus,
  type PhysicalHealthInput,
  type MentalHealthInput,
  type SymptomInput,
} from '../src/ml';

describe('AI modules smoke test', () => {
  test('baseline predictions return valid ranges', () => {
    const manager = getMLModelManager();

    const physicalInput: PhysicalHealthInput = {
      heartRate: 72,
      bpSystolic: 120,
      bpDiastolic: 80,
      bloodOxygen: 98,
      bodyTemperature: 98.6,
      respiratoryRate: 16,
      dailySteps: 8000,
      activeMinutes: 40,
      sleepHours: 7,
      sleepQuality: 4,
      bmi: 23,
      waterIntake: 2.2,
      age: 30,
      gender: 'male',
      smoking: false,
      alcohol: false,
    };

    const mentalInput: MentalHealthInput = {
      currentMood: 4,
      stressLevel: 2,
      anxietyLevel: 2,
      energyLevel: 4,
      motivationLevel: 4,
      sleepQuality: 4,
      sleepHours: 7,
      socialInteraction: 2,
      exerciseFrequency: 3,
      meditationPractice: true,
      workLifeBalance: 4,
      appetiteChanges: false,
      concentrationIssues: false,
      negativeThoughts: false,
      recentLifeEvent: false,
    };

    const symptomInput: SymptomInput = {
      symptoms: {
        fever: true,
        cough: true,
        fatigue: true,
      },
      durationDays: 2,
      intensity: 2,
      age: 30,
      hasComorbidities: false,
    };

    const physical = manager.predictPhysicalHealth(physicalInput);
    const mental = manager.predictMentalHealth(mentalInput);
    const symptom = manager.predictSymptomSeverity(symptomInput);

    expect(physical.score).toBeGreaterThanOrEqual(0);
    expect(physical.score).toBeLessThanOrEqual(100);

    expect(mental.score).toBeGreaterThanOrEqual(0);
    expect(mental.score).toBeLessThanOrEqual(100);

    expect(['Low', 'Medium', 'High', 'Emergency']).toContain(symptom.urgency);
    expect(['Mild', 'Moderate', 'Severe']).toContain(symptom.severity);
  });

  test('model status object is available', () => {
    const status = getModelStatus();
    expect(typeof status.loaded).toBe('boolean');
    expect(typeof status.physical).toBe('boolean');
    expect(typeof status.mental).toBe('boolean');
    expect(typeof status.symptom).toBe('boolean');
  });
});
