export type CalculationMethod =
  | 'Karachi'
  | 'Dubai'
  | 'UmmAlQura'
  | 'Egyptian'
  | 'Turkey'
  | 'Singapore'
  | 'MuslimWorldLeague'
  | 'NorthAmerica'
  | 'MoonsightingCommittee'
  | 'Tehran';

export type Madhab = 'hanafi' | 'shafi';

export type PrayerName = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export type PrayerTimesEntry = {
  name: PrayerName;
  time: Date;
  isFriday?: boolean;
};

export type SunnahTimesEntry = {
  middleOfTheNight: Date;
  lastThirdOfTheNight: Date;
};

export type IqamahOffsets = {
  fajr?: number;
  dhuhr?: number;
  asr?: number;
  maghrib?: number;
  isha?: number;
};

export type PrayerTimesLocation = {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  countryCode: string;
};

export type HighLatitudeRule =
  | 'middleOfTheNight'
  | 'seventhOfTheNight'
  | 'twilightAngle';

export type PrayerTimesSettings = {
  location: PrayerTimesLocation;
  method: CalculationMethod;
  madhab: Madhab;
  iqamahOffsets: IqamahOffsets | null;
  highLatitudeRule: HighLatitudeRule;
};

export type ComputedPrayerTimes = {
  date: Date;
  prayers: PrayerTimesEntry[];
  sunnah: SunnahTimesEntry;
  currentPrayer: PrayerName | null;
  nextPrayer: PrayerName | null;
  nextPrayerTime: Date | null;
};
