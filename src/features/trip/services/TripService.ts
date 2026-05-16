import * as turf from '@turf/turf';
import { Q } from '@nozbe/watermelondb';
import database from '../../../core/database/database';
import Trip from '../models/Trip';
import Breadcrumb from '../models/Breadcrumb';

export interface TripStats {
  id: string;
  name: string;
  distanceNm: number;
  durationSeconds: number;
  avgSpeedKnots: number;
  maxSpeedKnots: number;
  breadcrumbCount: number;
  startedAt: Date;
  endedAt: Date | null;
  status: string;
}

class TripService {
  private activeTripId: string | null = null;
  private liveStats: TripStats | null = null;
  private lastLat: number | null = null;
  private lastLng: number | null = null;
  private lastSaveTick = 0; // timestamp of last breadcrumb DB write

  async startTrip(name?: string): Promise<void> {
    if (this.activeTripId) return;
    const tripName = name?.trim() || `Trip ${new Date().toLocaleDateString('en-IN')}`;
    const now = Date.now();
    await database.write(async () => {
      const trip = await database.get<Trip>('trips').create(t => {
        t.name = tripName;
        t.startedAt = now as any; // WDB @date stores as timestamp
        t.endedAt = null as any;
        t.distanceNm = 0;
        t.avgSpeedKnots = 0;
        t.maxSpeedKnots = 0;
        t.breadcrumbCount = 0;
        t.status = 'active';
      });
      this.activeTripId = trip.id;
    });
    this.liveStats = {
      id: this.activeTripId!,
      name: tripName,
      distanceNm: 0,
      durationSeconds: 0,
      avgSpeedKnots: 0,
      maxSpeedKnots: 0,
      breadcrumbCount: 0,
      startedAt: new Date(now),
      endedAt: null,
      status: 'active',
    };
    this.lastLat = null;
    this.lastLng = null;
    this.lastSaveTick = now;
  }

  async stopTrip(): Promise<void> {
    if (!this.activeTripId || !this.liveStats) return;
    const id = this.activeTripId;
    const stats = { ...this.liveStats };
    this.activeTripId = null;
    this.liveStats = null;
    this.lastLat = null;
    this.lastLng = null;
    await database.write(async () => {
      const trip = await database.get<Trip>('trips').find(id);
      await trip.update(t => {
        t.endedAt = Date.now() as any;
        t.distanceNm = stats.distanceNm;
        t.avgSpeedKnots = Math.round(stats.avgSpeedKnots * 10) / 10;
        t.maxSpeedKnots = Math.round(stats.maxSpeedKnots * 10) / 10;
        t.breadcrumbCount = stats.breadcrumbCount;
        t.status = 'completed';
      });
    });
  }

  getActiveTrip(): TripStats | null {
    if (!this.liveStats) return null;
    const elapsed = Math.floor((Date.now() - this.liveStats.startedAt.getTime()) / 1000);
    return { ...this.liveStats, durationSeconds: elapsed };
  }

  recordBreadcrumb(lat: number, lng: number, speedKnots: number, heading: number, accuracy: number): void {
    if (!this.activeTripId || !this.liveStats) return;
    const now = Date.now();

    // Accumulate distance
    if (this.lastLat !== null && this.lastLng !== null) {
      const from = turf.point([this.lastLng, this.lastLat]);
      const to = turf.point([lng, lat]);
      const dist = turf.distance(from, to, { units: 'nauticalmiles' });
      this.liveStats.distanceNm += dist;
    }
    this.lastLat = lat;
    this.lastLng = lng;

    // Speed tracking
    if (speedKnots > this.liveStats.maxSpeedKnots) {
      this.liveStats.maxSpeedKnots = speedKnots;
    }
    this.liveStats.breadcrumbCount += 1;

    // Recalculate avg speed
    const hrs = (now - this.liveStats.startedAt.getTime()) / 3_600_000;
    if (hrs > 0) {
      this.liveStats.avgSpeedKnots = this.liveStats.distanceNm / hrs;
    }

    // Persist to DB every 30 seconds
    if (now - this.lastSaveTick >= 30_000) {
      this.lastSaveTick = now;
      const tripId = this.activeTripId;
      database.write(async () => {
        await database.get<Breadcrumb>('breadcrumbs').create(b => {
          b.tripId = tripId!;
          b.latitude = lat;
          b.longitude = lng;
          b.speed = speedKnots;
          b.heading = heading;
          b.accuracy = accuracy;
          b.timestamp = now as any;
        });
      }).catch(console.error);
    }
  }

  async getTripHistory(): Promise<TripStats[]> {
    try {
      const trips = await database.get<Trip>('trips').query(Q.where('status', 'completed')).fetch();
      return trips
        .map(t => {
          const start = t.startedAt instanceof Date ? t.startedAt.getTime() : t.startedAt as any;
          const end = t.endedAt ? (t.endedAt instanceof Date ? t.endedAt.getTime() : t.endedAt as any) : null;
          return {
            id: t.id,
            name: t.name,
            distanceNm: t.distanceNm,
            durationSeconds: end ? Math.floor((end - start) / 1000) : 0,
            avgSpeedKnots: t.avgSpeedKnots,
            maxSpeedKnots: t.maxSpeedKnots,
            breadcrumbCount: t.breadcrumbCount,
            startedAt: new Date(start),
            endedAt: end ? new Date(end) : null,
            status: t.status,
          };
        })
        .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    } catch (e) {
      console.error('[TripService] getTripHistory:', e);
      return [];
    }
  }

  async deleteTrip(tripId: string): Promise<void> {
    await database.write(async () => {
      try {
        const bcs = await database.get<Breadcrumb>('breadcrumbs').query(Q.where('trip_id', tripId)).fetch();
        for (const bc of bcs) { await bc.destroyPermanently(); }
        const trip = await database.get<Trip>('trips').find(tripId);
        await trip.destroyPermanently();
      } catch (e) {
        console.error('[TripService] deleteTrip:', e);
      }
    });
  }

  async getTripBreadcrumbs(tripId: string): Promise<Array<{ lat: number; lng: number; timestamp: number }>> {
    try {
      const bcs = await database.get<Breadcrumb>('breadcrumbs').query(Q.where('trip_id', tripId)).fetch();
      return bcs.map(b => ({
        lat: b.latitude,
        lng: b.longitude,
        timestamp: b.timestamp instanceof Date ? b.timestamp.getTime() : b.timestamp as any,
      }));
    } catch (e) {
      return [];
    }
  }
}

export default new TripService();
