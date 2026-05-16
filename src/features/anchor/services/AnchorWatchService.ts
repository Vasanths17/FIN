import * as turf from '@turf/turf';
import AlarmService from '../../../core/notifications/AlarmService';
import database from '../../../core/database/database';
import AnchorEvent from '../models/AnchorEvent';

export interface AnchorStatus {
  isAnchored: boolean;
  anchorPoint: { lat: number; lng: number } | null;
  currentLat: number;
  currentLng: number;
  currentDistance: number; // meters
  radius: number; // meters
  isDragging: boolean;
  maxDrift: number; // meters
  dragCount: number;
}

class AnchorWatchService {
  private isAnchored = false;
  private anchorLat = 0;
  private anchorLng = 0;
  private radius = 50; // meters
  private currentLat = 0;
  private currentLng = 0;
  private currentDistance = 0;
  private isDragging = false;
  private maxDrift = 0;
  private dragCount = 0;
  private activeEventId: string | null = null;

  dropAnchor(lat: number, lng: number, radiusMeters: number): void {
    this.isAnchored = true;
    this.anchorLat = lat;
    this.anchorLng = lng;
    this.radius = radiusMeters;
    this.currentLat = lat;
    this.currentLng = lng;
    this.currentDistance = 0;
    this.isDragging = false;
    this.maxDrift = 0;
    this.dragCount = 0;

    // Log to DB (fire-and-forget)
    database
      .write(async () => {
        const event = await database.get<AnchorEvent>('anchor_events').create(e => {
          e.latitude = lat;
          e.longitude = lng;
          e.radius = radiusMeters;
          e.maxDrift = 0;
          e.dragAlertCount = 0;
        });
        this.activeEventId = event.id;
      })
      .catch(console.error);
  }

  liftAnchor(): void {
    if (!this.isAnchored) return;
    AlarmService.stopAlarm();

    // Update DB record (fire-and-forget)
    if (this.activeEventId) {
      const id = this.activeEventId;
      const maxDrift = this.maxDrift;
      const dragCount = this.dragCount;
      database
        .write(async () => {
          const event = await database.get<AnchorEvent>('anchor_events').find(id);
          await event.update(e => {
            e.maxDrift = maxDrift;
            e.dragAlertCount = dragCount;
          });
        })
        .catch(console.error);
    }

    this.isAnchored = false;
    this.isDragging = false;
    this.activeEventId = null;
  }

  updatePosition(lat: number, lng: number): void {
    this.currentLat = lat;
    this.currentLng = lng;

    if (!this.isAnchored) return;

    const anchorPoint = turf.point([this.anchorLng, this.anchorLat]);
    const boatPoint = turf.point([lng, lat]);
    const distKm = turf.distance(anchorPoint, boatPoint, { units: 'kilometers' });
    this.currentDistance = distKm * 1000; // convert to meters

    if (this.currentDistance > this.maxDrift) {
      this.maxDrift = this.currentDistance;
    }

    const wasDragging = this.isDragging;

    if (this.currentDistance > this.radius) {
      if (!this.isDragging) {
        this.isDragging = true;
        this.dragCount += 1;
        AlarmService.triggerAlarm('danger');
      }
    } else if (this.isDragging && this.currentDistance < this.radius * 0.8) {
      // Hysteresis: only clear when back to 80% of radius
      this.isDragging = false;
      AlarmService.stopAlarm();
    }

    // Suppress if already in correct state
    void wasDragging;
  }

  getStatus(): AnchorStatus {
    return {
      isAnchored: this.isAnchored,
      anchorPoint: this.isAnchored
        ? { lat: this.anchorLat, lng: this.anchorLng }
        : null,
      currentLat: this.currentLat,
      currentLng: this.currentLng,
      currentDistance: Math.round(this.currentDistance * 10) / 10,
      radius: this.radius,
      isDragging: this.isDragging,
      maxDrift: Math.round(this.maxDrift * 10) / 10,
      dragCount: this.dragCount,
    };
  }
}

export default new AnchorWatchService();
