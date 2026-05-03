export interface TasbeehCounter {
  id: string;
  name: string;
  arabic: string;
  target: number;
  currentCount: number;
  rounds: number;
  totalCount: number;
  totalTime: number;
  createdAt: number;
  isDefault: boolean;
  source?: string;
}

export interface TasbeehSettings {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  autoCounterDelay: number;
  vibrationOnTarget: boolean;
  selectedCounterId: string;
}

export interface TasbeehTemplate {
  id: string;
  name: string;
  arabic: string;
  target: number;
  source?: string;
  category?: string;
}
