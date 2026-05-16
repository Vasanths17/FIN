import * as turf from '@turf/turf';
import AlarmService from '../../../core/notifications/AlarmService';
import database from '../../../core/database/database';
import MOBEvent from '../models/MOBEvent';

export interface MOBStatus {
  isActive: boolean;
  mobPoint: { lat: number; lng: number } | null;
  distanceMeters: number;
  bearing: number; // degrees 0-360
  bearingLabel: string;
  elapsedSeconds: number;
}

const COMPASS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
const normBearing = (d: number) => ((d % 360) + 360) % 360;
const bearingLabel = (deg: number) => {
  const b = normBearing(deg);
  return `${Math.round(b)}° ${COMPASS[Math.round(b / 22.5) % 16]}`;
};

class MOBService {
  private isActive = false;
  private mobLat = 0;
  private mobLng = 0;
  private crewName = '';
  private triggeredAt = 0;
  private currentLat = 0;
  private currentLng = 0;
  private distanceMeters = 0;
  private bearingDeg = 0;
  private activeEventId: string | null = null;

  triggerMOB(lat: number, lng: number, crewName = ''): void {
    this.isActive = true;
    this.mobLat = lat;
    this.mobLng = lng;
    this.crewName = crewName;
    this.triggeredAt = Date.now();
    this.currentLat = lat;
    this.currentLng = lng;
    this.distanceMeters = 0;
    this.bearingDeg = 0;

    AlarmService.triggerAlarm('critical');

    // Log to DB (fire-and-forget)
    database
      .write(async () => {
        const event = await database.get<MOBEvent>('mob_events').create(e => {
          e.latitude = lat;
          e.longitude = lng;
          e.crewMemberName = crewName;
          e.rescued = false;
        });
        this.activeEventId = event.id;
      })
      .catch(console.error);
  }

  updatePosition(lat: number, lng: number): void {
    this.currentLat = lat;
    this.currentLng = lng;
    if (!this.isActive) return;

    const mobPoint = turf.point([this.mobLng, this.mobLat]);
    const boatPoint = turf.point([lng, lat]);

    const distKm = turf.distance(boatPoint, mobPoint, { units: 'kilometers' });
    this.distanceMeters = distKm * 1000;

    const rawBearing = turf.bearing(boatPoint, mobPoint);
    this.bearingDeg = normBearing(rawBearing);
  }

  markRescued(): void {
    if (!this.isActive) return;
    AlarmService.stopAlarm();

    if (this.activeEventId) {
      const id = this.activeEventId;
      database
        .write(async () => {
          const event = await database.get<MOBEvent>('mob_events').find(id);
          await event.update(e => {
            e.rescued = true;
          });
        })
        .catch(console.error);
    }

    this.isActive = false;
    this.activeEventId = null;
  }

  clearMOB(): void {
    AlarmService.stopAlarm();
    this.isActive = false;
    this.activeEventId = null;
  }

  getMOBStatus(): MOBStatus {
    return {
      isActive: this.isActive,
      mobPoint: this.isActive ? { lat: this.mobLat, lng: this.mobLng } : null,
      distanceMeters: Math.round(this.distanceMeters),
      bearing: Math.round(this.bearingDeg),
      bearingLabel: bearingLabel(this.bearingDeg),
      elapsedSeconds: this.isActive
        ? Math.floor((Date.now() - this.triggeredAt) / 1000)
        : 0,
    };
  }
}

export default new MOBService();
