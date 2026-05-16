import SunCalc from 'suncalc';

export interface MoonPhaseData {
  phase: string;
  illumination: number; // 0-100 %
  emoji: string;
  fraction: number;     // 0-1 raw suncalc value
}

export interface MoonTimes {
  rise: Date | null;
  set: Date | null;
}

export type FishingQuality = 'excellent' | 'good' | 'fair' | 'poor';

export interface FishingQualityData {
  quality: FishingQuality;
  reason: string;
}

export interface DailyMoon {
  date: Date;
  phase: MoonPhaseData;
  quality: FishingQualityData;
}

// Map suncalc fraction (0-1) to named phase + emoji
function phaseFromFraction(fraction: number): { phase: string; emoji: string } {
  if (fraction < 0.03 || fraction >= 0.97) return { phase: 'New Moon',        emoji: '🌑' };
  if (fraction < 0.25)                     return { phase: 'Waxing Crescent', emoji: '🌒' };
  if (fraction < 0.30)                     return { phase: 'First Quarter',   emoji: '🌓' };
  if (fraction < 0.48)                     return { phase: 'Waxing Gibbous',  emoji: '🌔' };
  if (fraction < 0.52)                     return { phase: 'Full Moon',       emoji: '🌕' };
  if (fraction < 0.70)                     return { phase: 'Waning Gibbous',  emoji: '🌖' };
  if (fraction < 0.75)                     return { phase: 'Last Quarter',    emoji: '🌗' };
  return                                          { phase: 'Waning Crescent', emoji: '🌘' };
}

class MoonService {
  getMoonPhase(date: Date): MoonPhaseData {
    const { fraction } = SunCalc.getMoonIllumination(date);
    const { phase, emoji } = phaseFromFraction(fraction);
    return {
      phase,
      emoji,
      illumination: Math.round(fraction * 100),
      fraction,
    };
  }

  getMoonTimes(lat: number, lng: number, date: Date): MoonTimes {
    try {
      const times = SunCalc.getMoonTimes(date, lat, lng);
      return {
        rise: times.alwaysDown ? null : (times.rise ?? null),
        set:  times.alwaysUp  ? null : (times.set  ?? null),
      };
    } catch {
      return { rise: null, set: null };
    }
  }

  getFishingQuality(date: Date): FishingQualityData {
    const { fraction } = SunCalc.getMoonIllumination(date);
    if (fraction < 0.03 || fraction >= 0.97) {
      return { quality: 'excellent', reason: 'New Moon — strongest tidal pull' };
    }
    if (fraction >= 0.48 && fraction < 0.52) {
      return { quality: 'excellent', reason: 'Full Moon — maximum tidal force' };
    }
    if ((fraction >= 0.30 && fraction < 0.48) || (fraction >= 0.52 && fraction < 0.70)) {
      return { quality: 'good', reason: 'Gibbous moon — strong tides' };
    }
    if ((fraction >= 0.25 && fraction < 0.30) || (fraction >= 0.70 && fraction < 0.75)) {
      return { quality: 'fair', reason: 'Quarter moon — moderate tides' };
    }
    return { quality: 'poor', reason: 'Crescent moon — weak tidal pull' };
  }

  getWeeklyMoon(startDate: Date): DailyMoon[] {
    const result: DailyMoon[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      d.setHours(12, 0, 0, 0); // noon for stable calculations
      result.push({
        date: d,
        phase: this.getMoonPhase(d),
        quality: this.getFishingQuality(d),
      });
    }
    return result;
  }
}

export default new MoonService();
