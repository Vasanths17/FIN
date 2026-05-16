// ─── Tide prediction using harmonic constants ─────────────────────────────────
// All calculations are 100% offline — no API calls.
// Formula: H(t) = Z0 + Σ [Ai * cos((ωi * t_hours - φi) * π/180)]
// Reference epoch: 2000-01-01 00:00 UTC

const DEG = Math.PI / 180;

// Angular speeds in degrees/hour
const OMEGA: Record<string, number> = {
  M2: 28.984104,
  S2: 30.000000,
  K1: 15.041069,
  O1: 13.943035,
};

interface Constituent {
  amp: number;   // amplitude in metres
  phase: number; // phase lag in degrees
}

interface PortConstants {
  name: string;
  lat: number;
  lng: number;
  Z0: number; // mean sea level offset
  M2: Constituent;
  S2: Constituent;
  K1: Constituent;
  O1: Constituent;
}

export const PORTS: Record<string, PortConstants> = {
  chennai: {
    name: 'Chennai',
    lat: 13.08, lng: 80.27, Z0: 0.55,
    M2: { amp: 0.35, phase: 120 }, S2: { amp: 0.15, phase: 145 },
    K1: { amp: 0.25, phase: 320 }, O1: { amp: 0.12, phase: 290 },
  },
  visakhapatnam: {
    name: 'Visakhapatnam',
    lat: 17.68, lng: 83.22, Z0: 0.50,
    M2: { amp: 0.45, phase: 90  }, S2: { amp: 0.20, phase: 110 },
    K1: { amp: 0.22, phase: 310 }, O1: { amp: 0.10, phase: 280 },
  },
  kochi: {
    name: 'Kochi',
    lat: 9.97, lng: 76.27, Z0: 0.40,
    M2: { amp: 0.25, phase: 60  }, S2: { amp: 0.10, phase: 85  },
    K1: { amp: 0.18, phase: 300 }, O1: { amp: 0.08, phase: 270 },
  },
  mumbai: {
    name: 'Mumbai',
    lat: 19.07, lng: 72.87, Z0: 1.80,
    M2: { amp: 1.50, phase: 330 }, S2: { amp: 0.60, phase: 355 },
    K1: { amp: 0.55, phase: 280 }, O1: { amp: 0.30, phase: 260 },
  },
  tuticorin: {
    name: 'Tuticorin',
    lat: 8.76, lng: 78.13, Z0: 0.35,
    M2: { amp: 0.20, phase: 100 }, S2: { amp: 0.08, phase: 130 },
    K1: { amp: 0.15, phase: 315 }, O1: { amp: 0.07, phase: 285 },
  },
  mangalore: {
    name: 'Mangalore',
    lat: 12.87, lng: 74.88, Z0: 0.60,
    M2: { amp: 0.50, phase: 45  }, S2: { amp: 0.20, phase: 70  },
    K1: { amp: 0.30, phase: 290 }, O1: { amp: 0.15, phase: 265 },
  },
};

export interface TidePoint {
  time: Date;
  height: number; // metres
}

export interface TideExtremum {
  time: Date;
  height: number;
  type: 'high' | 'low';
}

export interface DailyTides {
  date: Date;
  extrema: TideExtremum[];
}

// Epoch: 2000-01-01T00:00:00Z in ms
const EPOCH_MS = Date.UTC(2000, 0, 1, 0, 0, 0);

function hoursFromEpoch(date: Date): number {
  return (date.getTime() - EPOCH_MS) / 3_600_000;
}

function tideHeight(port: PortConstants, t: Date): number {
  const h = hoursFromEpoch(t);
  const constituents: Array<[string, Constituent]> = [
    ['M2', port.M2], ['S2', port.S2], ['K1', port.K1], ['O1', port.O1],
  ];
  return port.Z0 + constituents.reduce((sum, [name, c]) => {
    return sum + c.amp * Math.cos((OMEGA[name] * h - c.phase) * DEG);
  }, 0);
}

class TideService {
  getTideAtTime(portKey: string, date: Date): number {
    const port = PORTS[portKey];
    if (!port) return 0;
    return Math.round(tideHeight(port, date) * 100) / 100;
  }

  // 73 points every 20 minutes over 24 hours
  getTideCurve(portKey: string, date: Date): TidePoint[] {
    const port = PORTS[portKey];
    if (!port) return [];
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const points: TidePoint[] = [];
    for (let i = 0; i <= 72; i++) {
      const t = new Date(start.getTime() + i * 20 * 60_000);
      points.push({ time: t, height: tideHeight(port, t) });
    }
    return points;
  }

  // Find local extrema by sign change of derivative
  getDailyTides(portKey: string, date: Date): TideExtremum[] {
    const curve = this.getTideCurve(portKey, date);
    const extrema: TideExtremum[] = [];
    for (let i = 1; i < curve.length - 1; i++) {
      const prev = curve[i - 1].height;
      const curr = curve[i].height;
      const next = curve[i + 1].height;
      if (curr > prev && curr >= next) {
        extrema.push({ time: curve[i].time, height: Math.round(curr * 100) / 100, type: 'high' });
      } else if (curr < prev && curr <= next) {
        extrema.push({ time: curve[i].time, height: Math.round(curr * 100) / 100, type: 'low' });
      }
    }
    return extrema;
  }

  getNextTide(portKey: string, now: Date): TideExtremum | null {
    const extrema = this.getDailyTides(portKey, now);
    const future = extrema.filter(e => e.time > now);
    if (future.length > 0) return future[0];
    // Check next day
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowExtrema = this.getDailyTides(portKey, tomorrow);
    return tomorrowExtrema[0] ?? null;
  }

  getTideDirection(portKey: string, now: Date): 'rising' | 'falling' {
    const port = PORTS[portKey];
    if (!port) return 'falling';
    const h0 = tideHeight(port, now);
    const h1 = tideHeight(port, new Date(now.getTime() + 10 * 60_000)); // 10 min later
    return h1 > h0 ? 'rising' : 'falling';
  }

  getNearestPort(lat: number, lng: number): string {
    let nearest = 'chennai';
    let minDist = Infinity;
    for (const [key, port] of Object.entries(PORTS)) {
      const dlat = port.lat - lat;
      const dlng = port.lng - lng;
      const dist = Math.sqrt(dlat * dlat + dlng * dlng);
      if (dist < minDist) { minDist = dist; nearest = key; }
    }
    return nearest;
  }

  getWeeklyTides(portKey: string, startDate: Date): DailyTides[] {
    const result: DailyTides[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      d.setHours(0, 0, 0, 0);
      result.push({ date: d, extrema: this.getDailyTides(portKey, d) });
    }
    return result;
  }
}

export default new TideService();
