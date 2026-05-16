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
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const eezData = require('../../assets/geojson/india_eez_boundary.geojson');
      const feature = eezData.features[0];
      this.eezLine = turf.lineString(
        feature.geometry.coordinates,
        feature.properties,
      );
      this.initialized = true;
    } catch (e) {
      console.error('[BorderGeofenceService] Failed to load EEZ GeoJSON:', e);
      // Fallback: create a minimal line near India's west coast for safety
      this.eezLine = turf.lineString([
        [69.0, 23.0], [69.0, 8.0], [77.4, 4.9], [80.0, 6.0], [89.0, 20.0],
      ]);
      this.initialized = true;
    }
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
