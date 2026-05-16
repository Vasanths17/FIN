import { Vibration } from 'react-native';

type AlarmLevel = 'warning' | 'danger' | 'critical';

const VIBRATION_PATTERNS: Record<AlarmLevel, number | number[]> = {
  warning: 500,
  danger: [0, 500, 200, 500],
  critical: [0, 1000, 200, 1000, 200, 1000],
};

// Repeat interval in ms (null = use Vibration's built-in repeat)
const REPEAT_INTERVALS: Record<AlarmLevel, number | null> = {
  warning: 60_000,
  danger: 10_000,
  critical: null, // handled via Vibration repeat flag
};

class AlarmService {
  private currentLevel: AlarmLevel | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  triggerAlarm(level: AlarmLevel): void {
    // Avoid re-triggering the same alarm level
    if (this.currentLevel === level) return;

    this.stopAlarm();
    this.currentLevel = level;

    const pattern = VIBRATION_PATTERNS[level];
    const repeatMs = REPEAT_INTERVALS[level];

    if (level === 'critical') {
      // Repeat continuously via Vibration API
      Vibration.vibrate(pattern as number[], true);
    } else {
      // Fire once immediately, then on interval
      Vibration.vibrate(pattern);
      this.intervalId = setInterval(() => {
        Vibration.vibrate(pattern);
      }, repeatMs as number);
    }
  }

  stopAlarm(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    Vibration.cancel();
    this.currentLevel = null;
  }

  getCurrentLevel(): AlarmLevel | null {
    return this.currentLevel;
  }
}

export default new AlarmService();
