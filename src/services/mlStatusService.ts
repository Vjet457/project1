import { getModelStatus, loadMLModels } from '../ml';

export interface MlStatusSnapshot {
  loaded: boolean;
  physical: boolean;
  mental: boolean;
  symptom: boolean;
}

export const getMlStatusSnapshot = (): MlStatusSnapshot => {
  const status = getModelStatus();
  return {
    loaded: status.loaded,
    physical: status.physical,
    mental: status.mental,
    symptom: status.symptom,
  };
};

export const ensureMlModelsLoaded = async (): Promise<MlStatusSnapshot> => {
  await loadMLModels();
  return getMlStatusSnapshot();
};
