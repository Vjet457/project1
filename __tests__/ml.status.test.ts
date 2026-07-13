import { ensureMlModelsLoaded, getMlStatusSnapshot } from '../src/services/mlStatusService';

describe('ML model status service', () => {
  test('returns status shape before load', () => {
    const status = getMlStatusSnapshot();
    expect(typeof status.loaded).toBe('boolean');
    expect(typeof status.physical).toBe('boolean');
    expect(typeof status.mental).toBe('boolean');
    expect(typeof status.symptom).toBe('boolean');
  });

  test('loads models and reports loaded flags', async () => {
    const status = await ensureMlModelsLoaded();
    expect(status.loaded).toBe(true);
    expect(status.physical).toBe(true);
    expect(status.mental).toBe(true);
    expect(status.symptom).toBe(true);
  });
});
