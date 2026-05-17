import React, { useCallback, useEffect, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/Feather';

import { rootNavigate } from '../../../navigation/navigationRef';
import GpsStatusBar, { GpsLocation } from '../components/GpsStatusBar';
import ZoneStatusBadge from '../../border-alert/components/ZoneStatusBadge';
import BorderDetailPanel from '../../border-alert/components/BorderDetailPanel';
import { useBorderAlert } from '../../border-alert/hooks/useBorderAlert';
import { requestLocationPermission } from '../../../core/location/LocationPermissions';

const MAP_OCEAN_FALLBACK = '#0a1628';

const DEMO_LOCATION: GpsLocation = {
  lat: 12.5,
  lng: 69.43,
  speedKnots: 5.2,
  heading: 265,
  accuracy: 12,
  hasFix: false,
};

interface RawLocation {
  coords: {
    latitude: number;
    longitude: number;
    altitude: number | null;
    heading: number | null;
    accuracy: number | null;
    speed: number | null;
  };
  timestamp: number;
}

const { height } = Dimensions.get('window');
const MAP_HEIGHT = height * 0.58;

const fmt = (val: number, isLat: boolean) => {
  const abs = Math.abs(val);
  const deg = Math.floor(abs);
  const min = ((abs - deg) * 60).toFixed(3);
  const dir = isLat ? (val >= 0 ? 'N' : 'S') : val >= 0 ? 'E' : 'W';
  return `${deg}° ${min}' ${dir}`;
};

const MapScreen: React.FC = () => {
  const { t } = useTranslation();

  const [permissionGranted, setPermissionGranted] = useState(false);
  const [rawLocation, setRawLocation] = useState<RawLocation | null>(null);

  const gpsLocation: GpsLocation = rawLocation
    ? {
        lat: rawLocation.coords.latitude,
        lng: rawLocation.coords.longitude,
        speedKnots:
          rawLocation.coords.speed != null
            ? rawLocation.coords.speed * 1.943844
            : 0,
        heading: rawLocation.coords.heading ?? 0,
        accuracy: rawLocation.coords.accuracy ?? 0,
        hasFix: true,
      }
    : DEMO_LOCATION;

  const borderAlert = useBorderAlert({
    lat: gpsLocation.lat,
    lng: gpsLocation.lng,
    speedKnots: gpsLocation.speedKnots,
    heading: gpsLocation.heading,
  });

  useEffect(() => {
    requestLocationPermission().then(setPermissionGranted);
  }, []);

  void permissionGranted;
  void setRawLocation;

  const launchMOB = useCallback(() => {
    rootNavigate('MOBModal');
  }, []);

  const downloadTiles = useCallback(() => {
    // Offline tile download placeholder
  }, []);

  const zoneColor =
    borderAlert.zone === 'critical' ? '#FF4757'
    : borderAlert.zone === 'danger'   ? '#FF6B35'
    : borderAlert.zone === 'warning'  ? '#FFA502'
    : '#00D4AA';

  return (
    <View style={styles.root}>
      {/* ── Ocean map placeholder ──────────────────────────────────────── */}
      <View style={[styles.mapContainer, { height: MAP_HEIGHT }]}>

        {/* Ocean background with grid */}
        <View style={styles.ocean}>
          {/* Horizontal scan lines */}
          {[0.15, 0.3, 0.45, 0.6, 0.75, 0.9].map(f => (
            <View
              key={`h${f}`}
              style={[styles.gridLine, { top: `${f * 100}%` as any }]}
            />
          ))}

          {/* Center crosshair */}
          <View style={styles.crosshairWrap}>
            <View style={styles.crosshairH} />
            <View style={styles.crosshairV} />
            <View style={[styles.crosshairDot, { borderColor: zoneColor }]} />
          </View>

          {/* EEZ zone arc label */}
          <View style={styles.bearingChip}>
            <Icon name="navigation" size={12} color={zoneColor} />
            <Text style={[styles.bearingText, { color: zoneColor }]}>
              {borderAlert.bearingLabel}  ·  {borderAlert.distanceKm} km to EEZ
            </Text>
          </View>

          {/* Coordinate display */}
          <View style={styles.coordBox}>
            <Text style={styles.coordRow}>{fmt(gpsLocation.lat, true)}</Text>
            <Text style={styles.coordRow}>{fmt(gpsLocation.lng, false)}</Text>
            {!gpsLocation.hasFix && (
              <Text style={styles.simTag}>SIMULATED</Text>
            )}
          </View>

          {/* Speed / heading row */}
          <View style={styles.speedRow}>
            <View style={styles.speedChip}>
              <Icon name="wind" size={11} color="#5A6380" />
              <Text style={styles.speedText}>{gpsLocation.speedKnots.toFixed(1)} kn</Text>
            </View>
            <View style={styles.speedChip}>
              <Icon name="compass" size={11} color="#5A6380" />
              <Text style={styles.speedText}>{Math.round(gpsLocation.heading)}°</Text>
            </View>
          </View>
        </View>

        {/* GPS status bar */}
        <GpsStatusBar location={gpsLocation} />

        {/* FAB: MOB (top-left) */}
        <TouchableOpacity style={[styles.fab, styles.fabTopLeft]} onPress={launchMOB}>
          <Icon name="anchor" size={20} color="#FFFFFF" />
          <Text style={styles.fabLabel}>MOB</Text>
        </TouchableOpacity>

        {/* FAB: Download (top-right) */}
        <TouchableOpacity style={[styles.fab, styles.fabTopRight]} onPress={downloadTiles}>
          <Icon name="download-cloud" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Zone status badge */}
        <ZoneStatusBadge
          zone={borderAlert.zone}
          distanceKm={borderAlert.distanceKm}
          bearingLabel={borderAlert.bearingLabel}
          etaMinutes={borderAlert.etaMinutes}
        />
      </View>

      {/* ── Detail panel ──────────────────────────────────────────────────── */}
      <ScrollView
        style={styles.panel}
        contentContainerStyle={styles.panelContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.panelTitle}>{t('border.distanceToBorder')}</Text>
        <BorderDetailPanel borderAlert={borderAlert} />
        <View style={{ height: 8 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B1426' },
  mapContainer: {
    width: '100%',
    backgroundColor: MAP_OCEAN_FALLBACK,
    overflow: 'hidden',
  },
  ocean: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#08111e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(0,212,170,0.05)',
  },
  crosshairWrap: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  crosshairH: {
    position: 'absolute',
    width: 60,
    height: 1,
    backgroundColor: 'rgba(0,212,170,0.3)',
  },
  crosshairV: {
    position: 'absolute',
    width: 1,
    height: 60,
    backgroundColor: 'rgba(0,212,170,0.3)',
  },
  crosshairDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    backgroundColor: 'rgba(0,212,170,0.15)',
  },
  bearingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  bearingText: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
  coordBox: { alignItems: 'center', gap: 2, marginBottom: 10 },
  coordRow: {
    color: '#8892B0',
    fontSize: 13,
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  simTag: {
    color: '#FFA502',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 4,
    backgroundColor: 'rgba(255,165,2,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  speedRow: {
    flexDirection: 'row',
    gap: 12,
  },
  speedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  speedText: { color: '#5A6380', fontSize: 12 },
  fab: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 212, 170, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 20,
  },
  fabTopLeft: {
    top: 118,
    left: 14,
    backgroundColor: 'rgba(255, 165, 2, 0.9)',
    flexDirection: 'row',
    gap: 4,
    width: 'auto' as any,
    paddingHorizontal: 10,
  },
  fabTopRight: { top: 118, right: 14 },
  fabLabel: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  panel: { flex: 1, backgroundColor: '#0B1426' },
  panelContent: { paddingBottom: 16 },
  panelTitle: {
    color: '#5A6380',
    fontSize: 11,
    letterSpacing: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 2,
    textTransform: 'uppercase',
  },
});

export default MapScreen;
