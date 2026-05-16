import { useState, useEffect, useRef } from 'react';
import BorderGeofenceService, { BorderStatus, ZoneLevel } from '../../../core/geo/BorderGeofenceService';
import AlarmService from '../../../core/notifications/AlarmService';

export interface LocationInput {
  lat: number;
  lng: number;
  speedKnots?: number;
  heading?: number;
}

export interface UseBorderAlertResult {
  zone: ZoneLevel;
  distanceKm: number;
  nearestPoint: { lat: number; lng: number };
  bearing: number;
  bearingLabel: string;
  etaMinutes: number | null;
  lastUpdateTime: Date | null;
  isCalculating: boolean;
}

const DEFAULT_RESULT: UseBorderAlertResult = {
  zone: 'safe',
  distanceKm: 999,
  nearestPoint: { lat: 0, lng: 0 },
  bearing: 0,
  bearingLabel: '0° N',
  etaMinutes: null,
  lastUpdateTime: null,
  isCalculating: false,
};

export const useBorderAlert = (location: LocationInput | null): UseBorderAlertResult => {
  const [status, setStatus] = useState<BorderStatus | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const prevZoneRef = useRef<ZoneLevel | null>(null);
  const prevDistanceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!location) return;

    setIsCalculating(true);

    // Run in a micro-task to avoid blocking the UI thread
    const timer = setTimeout(() => {
      try {
        const newStatus = BorderGeofenceService.calculateDistance(
          location.lat,
          location.lng,
          location.speedKnots,
          location.heading,
        );

        const zoneChanged = prevZoneRef.current !== newStatus.zone;
        const distanceDelta =
          prevDistanceRef.current === null
            ? Infinity
            : Math.abs(prevDistanceRef.current - newStatus.distanceKm);

        if (zoneChanged || distanceDelta > 0.1) {
          setStatus(newStatus);
          prevZoneRef.current = newStatus.zone;
          prevDistanceRef.current = newStatus.distanceKm;
        }

        setLastUpdateTime(new Date());

        // Drive alarms
        if (newStatus.zone !== 'safe') {
          AlarmService.triggerAlarm(newStatus.zone as 'warning' | 'danger' | 'critical');
        } else {
          AlarmService.stopAlarm();
        }
      } catch (e) {
        console.error('[useBorderAlert] Calculation error:', e);
      } finally {
        setIsCalculating(false);
      }
    }, 0);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.lat, location?.lng, location?.speedKnots, location?.heading]);

  // Stop alarm on unmount
  useEffect(() => {
    return () => AlarmService.stopAlarm();
  }, []);

  if (!status) return DEFAULT_RESULT;

  return {
    zone: status.zone,
    distanceKm: status.distanceKm,
    nearestPoint: status.nearestPoint,
    bearing: status.bearing,
    bearingLabel: status.bearingLabel,
    etaMinutes: status.etaMinutes,
    lastUpdateTime,
    isCalculating,
  };
};
