import * as turf from '@turf/turf';

export type ZoneLevel = 'safe' | 'warning' | 'danger' | 'critical';

export interface BorderStatus {
  zone: ZoneLevel;
  distanceKm: number;
  nearestPoint: { lat: number; lng: number };
  bearing: number;
  bearingLabel: string;
  etaMinutes: number | null;
}

const ZONE_THRESHOLDS = {
  critical: 0.5,
  danger: 2.0,
  warning: 5.0,
};

const COMPASS_LABELS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
];

class BorderGeofenceService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private eezLine: turf.Feature<turf.LineString> | null = null;
  private initialized = false;

  private init(): void {
    if (this.initialized) return;
    const coordinates = [
      [66.5, 23.8], [66.2, 23.4], [66.0, 23.0], [65.7, 22.5], [65.5, 22.0],
      [65.3, 21.5], [65.2, 21.0], [65.1, 20.5], [65.0, 20.0], [65.0, 19.5],
      [65.1, 19.0], [65.3, 18.5], [65.5, 18.0], [65.8, 17.5], [66.1, 17.0],
      [66.5, 16.5], [66.9, 16.0], [67.3, 15.5], [67.8, 15.0], [68.2, 14.5],
      [68.6, 14.0], [68.9, 13.5], [69.2, 13.0], [69.4, 12.5], [69.5, 12.0],
      [69.5, 11.5], [69.4, 11.0], [69.3, 10.5], [69.1, 10.0], [68.9, 9.5],
      [68.6, 9.0], [68.3, 8.5], [68.0, 8.2], [77.4, 4.9], [78.0, 5.2],
      [78.5, 5.5], [79.0, 6.0], [79.5, 6.5], [80.0, 7.0], [80.5, 7.5],
      [81.0, 8.0], [81.5, 8.5], [82.0, 9.0], [82.5, 9.5], [83.0, 10.0],
      [83.5, 10.5], [84.0, 11.0], [84.5, 11.5], [85.0, 12.0], [85.5, 12.5],
      [86.0, 13.0], [86.5, 13.5], [87.0, 14.0], [87.5, 14.5], [88.0, 15.0],
      [88.3, 15.5], [88.5, 16.0], [88.7, 16.5], [88.8, 17.0], [88.9, 17.5],
      [89.0, 18.0], [89.0, 18.5], [89.0, 19.0], [89.0, 19.5], [89.0, 20.0],
      [89.17, 21.0],
    ] as [number, number][];
    this.eezLine = turf.lineString(coordinates, { name: 'India EEZ Boundary' });
    this.initialized = true;
  }

  private normalizeBearing(deg: number): number {
    return ((deg % 360) + 360) % 360;
  }

  private bearingToCompassLabel(deg: number): string {
    const normalized = this.normalizeBearing(deg);
    const index = Math.round(normalized / 22.5) % 16;
    return COMPASS_LABELS[index];
  }

  private getZone(distanceKm: number): ZoneLevel {
    if (distanceKm < ZONE_THRESHOLDS.critical) return 'critical';
    if (distanceKm < ZONE_THRESHOLDS.danger) return 'danger';
    if (distanceKm < ZONE_THRESHOLDS.warning) return 'warning';
    return 'safe';
  }

  calculateDistance(
    lat: number,
    lng: number,
    speedKnots?: number,
    heading?: number,
  ): BorderStatus {
    this.init();

    const userPoint = turf.point([lng, lat]);

    if (!this.eezLine) {
      return {
        zone: 'safe',
        distanceKm: 999,
        nearestPoint: { lat: 0, lng: 0 },
        bearing: 0,
        bearingLabel: '0° N',
        etaMinutes: null,
      };
    }

    // Find nearest point on the EEZ line
    const nearest = turf.nearestPointOnLine(this.eezLine, userPoint, { units: 'kilometers' });
    const rawDistKm: number = nearest.properties?.dist ?? 0;
    const distanceKm = Math.round(rawDistKm * 10) / 10;

    const nearestCoords = nearest.geometry.coordinates;
    const nearestPoint = { lat: nearestCoords[1], lng: nearestCoords[0] };

    // Bearing from user toward the nearest border point
    const nearestTurfPoint = turf.point(nearestCoords);
    const rawBearing = turf.bearing(userPoint, nearestTurfPoint);
    const bearing = Math.round(this.normalizeBearing(rawBearing));
    const compassLabel = this.bearingToCompassLabel(rawBearing);
    const bearingLabel = `${bearing}° ${compassLabel}`;

    const zone = this.getZone(distanceKm);

    // ETA: only calculate if moving with sufficient speed toward border
    let etaMinutes: number | null = null;
    if (speedKnots !== undefined && speedKnots > 0.5 && heading !== undefined) {
      const headingDiff = Math.abs(((heading - bearing + 180) % 360) - 180);
      if (headingDiff < 90) {
        const speedKmH = speedKnots * 1.852;
        const hoursToReach = distanceKm / speedKmH;
        etaMinutes = Math.round(hoursToReach * 60);
      }
    }

    return { zone, distanceKm, nearestPoint, bearing, bearingLabel, etaMinutes };
  }
}

export default new BorderGeofenceService();
