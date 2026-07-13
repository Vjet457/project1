// Type declarations for ML model JSON files

declare module '*.json' {
  const value: any;
  export default value;
}

declare module '*/physical_health_model.json' {
  import { RandomForestModel } from '../src/ml';
  const model: RandomForestModel;
  export default model;
}

declare module '*/mental_health_model.json' {
  import { RandomForestModel } from '../src/ml';
  const model: RandomForestModel;
  export default model;
}

declare module '*/symptom_severity_model.json' {
  import { RandomForestModel } from '../src/ml';
  const model: RandomForestModel;
  export default model;
}
