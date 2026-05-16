import { Q } from '@nozbe/watermelondb';
import database from '../../../core/database/database';
import Hotspot from '../models/Hotspot';

export interface HotspotData {
  id: string;
  lat: number;
  lng: number;
  catchType: string;
  notes: string;
  rating: number;
  createdAt: Date;
}

class HotspotService {
  async addHotspot(
    lat: number,
    lng: number,
    catchType: string,
    notes: string,
    rating: number,
  ): Promise<HotspotData> {
    let result!: HotspotData;
    await database.write(async () => {
      const h = await database.get<Hotspot>('hotspots').create(spot => {
        spot.latitude = lat;
        spot.longitude = lng;
        spot.catchType = catchType;
        spot.notes = notes;
        spot.rating = rating;
      });
      result = {
        id: h.id,
        lat: h.latitude,
        lng: h.longitude,
        catchType: h.catchType,
        notes: h.notes,
        rating: h.rating,
        createdAt: h.createdAt instanceof Date ? h.createdAt : new Date(h.createdAt as any),
      };
    });
    return result;
  }

  async getHotspots(): Promise<HotspotData[]> {
    try {
      const rows = await database.get<Hotspot>('hotspots').query().fetch();
      return rows.map(h => ({
        id: h.id,
        lat: h.latitude,
        lng: h.longitude,
        catchType: h.catchType,
        notes: h.notes,
        rating: h.rating,
        createdAt: h.createdAt instanceof Date ? h.createdAt : new Date(h.createdAt as any),
      }));
    } catch (e) {
      console.error('[HotspotService] getHotspots:', e);
      return [];
    }
  }

  async getHotspotsByType(catchType: string): Promise<HotspotData[]> {
    try {
      const rows = await database
        .get<Hotspot>('hotspots')
        .query(Q.where('catch_type', catchType))
        .fetch();
      return rows.map(h => ({
        id: h.id,
        lat: h.latitude,
        lng: h.longitude,
        catchType: h.catchType,
        notes: h.notes,
        rating: h.rating,
        createdAt: h.createdAt instanceof Date ? h.createdAt : new Date(h.createdAt as any),
      }));
    } catch (e) {
      return [];
    }
  }

  async deleteHotspot(id: string): Promise<void> {
    await database.write(async () => {
      const h = await database.get<Hotspot>('hotspots').find(id);
      await h.destroyPermanently();
    });
  }

  async getHotspotCount(): Promise<number> {
    try {
      const rows = await database.get<Hotspot>('hotspots').query().fetch();
      return rows.length;
    } catch {
      return 0;
    }
  }
}

export default new HotspotService();
