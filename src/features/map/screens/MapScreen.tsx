import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/Feather';

import { rootNavigate } from '../../../navigation/navigationRef';
import GpsStatusBar, { GpsLocation } from '../components/GpsStatusBar';
import BorderAlertOverlay from '../../border-alert/components/BorderAlertOverlay';
import ZoneStatusBadge from '../../border-alert/components/ZoneStatusBadge';
import BorderDetailPanel from '../../border-alert/components/BorderDetailPanel';
import { useBorderAlert } from '../../border-alert/hooks/useBorderAlert';
import { requestLocationPermission } from '../../../core/location/LocationPermissions';

// ─── Map config ───────────────────────────────────────────────────────────────
MapLibreGL.setAccessToken(null);

const MAP_STYLE = 'https://demotiles.maplibre.org/style.json';
const MAP_OCEAN_FALLBACK = '#0a1628';

// Default camera: centred on the demo position (Arabian Sea, ~47 km from EEZ)
const DEFAULT_CENTER: [number, number] = [69.43, 12.5];
const DEFAULT_ZOOM = 7;

// Demo position used when GPS is unavailable (emulator / no permission).
// Positioned in the Arabian Sea ~47 km east of India's EEZ boundary —
// produces a realistic "SAFE ZONE — 47 km" display for the exam demo.
// Change to { lat: 13.07, lng: 80.28 } for the Chennai (450 km) scenario.
const DEMO_LOCATION: GpsLocation = {
  lat: 12.5,
  lng: 69.43,
  speedKnots: 5.2,
  heading: 265, // heading west-southwest toward the border
  accuracy: 12,
  hasFix: false, // red dot → indicates simulated position
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface RawLocation {
  coords: {
    latitude: number;
    longitude: number;
    altitude: number | null;
    heading: number | null;
    accuracy: number | null;
    speed: number | null; // m/s
  };
  timestamp: number;
}

const { height } = Dimensions.get('window');
const MAP_HEIGHT = height * 0.58;

// ─── Component ────────────────────────────────────────────────────────────────
const MapScreen: React.FC = () => {
  const { t } = useTranslation();
  const cameraRef = useRef<MapLibreGL.Camera>(null);

  const [permissionGranted, setPermissionGranted] = useState(false);
  const [rawLocation, setRawLocation] = useState<RawLocation | null>(null);

  // Resolved GPS location (real or demo)
  const gpsLocation: GpsLocation = rawLocation
    ? {
        lat: rawLocation.coords.latitude,
        lng: rawLocation.coords.longitude,
        speedKnots:
          rawLocation.coords.speed != null
            ? rawLocation.coords.speed * 1.943844 // m/s → knots
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

  // ── Permissions ─────────────────────────────────────────────────────────────
  useEffect(() => {
    requestLocationPermission().then(granted => {
      setPermissionGranted(granted);
      if (!granted) {
        Alert.alert(
          t('map.gpsStatus'),
          'Location permission denied. Showing simulated position near Chennai.',
        );
      }
    });
  }, [t]);

  // ── Location update from MapLibre UserLocation ───────────────────────────
  const handleLocationUpdate = useCallback((loc: RawLocation) => {
    setRawLocation(loc);
  }, []);

  // ── Centre map on user ────────────────────────────────────────────────────
  const centerOnUser = useCallback(() => {
    cameraRef.current?.setCamera({
      centerCoordinate: [gpsLocation.lng, gpsLocation.lat],
      zoomLevel: 9,
      animationDuration: 800,
    });
  }, [gpsLocation.lat, gpsLocation.lng]);

  // ── MOB quick-launch ──────────────────────────────────────────────────────
  const launchMOB = useCallback(() => {
    rootNavigate('MOBModal');
  }, []);

  // ── Offline tiles prompt ──────────────────────────────────────────────────
  const downloadTiles = useCallback(() => {
    Alert.alert(t('map.downloadTiles'), t('map.downloadComplete'));
  }, [t]);

  return (
    <View style={styles.root}>
      {/* ── Map container ─────────────────────────────────────────────────── */}
      <View style={[styles.mapContainer, { height: MAP_HEIGHT }]}>
        <MapLibreGL.MapView
          style={StyleSheet.absoluteFill}
          styleURL={MAP_STYLE}
          localizeLabels={true}
          attributionEnabled={false}
          logoEnabled={false}
          pitchEnabled={false}
          compassEnabled={false}
          // Ocean-blue background while tiles load or offline
          // eslint-disable-next-line react-native/no-inline-styles
          contentInset={[0, 0, 0, 0]}
        >
          <MapLibreGL.Camera
            ref={cameraRef}
            zoomLevel={DEFAULT_ZOOM}
            centerCoordinate={DEFAULT_CENTER}
            animationMode="flyTo"
            animationDuration={0}
          />

          {/* User location dot */}
          {permissionGranted && (
            <MapLibreGL.UserLocation
              visible={true}
              // @ts-ignore — onUpdate type differs between versions
              onUpdate={handleLocationUpdate}
              renderMode="native"
            />
          )}

          {/* EEZ boundary line overlay */}
          <BorderAlertOverlay />
        </MapLibreGL.MapView>

        {/* ── Floating GPS status bar ──────────────────────────────────── */}
        <GpsStatusBar location={gpsLocation} />

        {/* ── FAB: MOB (top-left) ──────────────────────────────────────── */}
        <TouchableOpacity style={[styles.fab, styles.fabTopLeft]} onPress={launchMOB}>
          <Icon name="anchor" size={20} color="#FFFFFF" />
          <Text style={styles.fabLabel}>MOB</Text>
        </TouchableOpacity>

        {/* ── FAB: Download tiles (top-right) ─────────────────────────── */}
        <TouchableOpacity style={[styles.fab, styles.fabTopRight]} onPress={downloadTiles}>
          <Icon name="download-cloud" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {/* ── FAB: Locate me (bottom-right) ────────────────────────────── */}
        <TouchableOpacity style={[styles.fab, styles.fabBottomRight]} onPress={centerOnUser}>
          <Icon name="crosshair" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {/* ── Zone status badge (bottom of map) ────────────────────────── */}
        <ZoneStatusBadge
          zone={borderAlert.zone}
          distanceKm={borderAlert.distanceKm}
          bearingLabel={borderAlert.bearingLabel}
          etaMinutes={borderAlert.etaMinutes}
        />

        {/* Ocean background shown behind tiles */}
        <View style={[styles.oceanBg, { zIndex: -1 }]} pointerEvents="none" />
      </View>

      {/* ── Scrollable detail panel ──────────────────────────────────────── */}
      <ScrollView
        style={styles.panel}
        contentContainerStyle={styles.panelContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.panelTitle}>{t('border.distanceToBorder')}</Text>
        <BorderDetailPanel borderAlert={borderAlert} />
        <View style={styles.panelFiller} />
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B1426',
  },
  mapContainer: {
    width: '100%',
    backgroundColor: MAP_OCEAN_FALLBACK,
    overflow: 'hidden',
    position: 'relative',
  },
  oceanBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: MAP_OCEAN_FALLBACK,
  },

  // FABs
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
    top: 118,  // below GPS status bar
    left: 14,
    backgroundColor: 'rgba(255, 165, 2, 0.9)', // orange for MOB
    flexDirection: 'row',
    gap: 4,
    width: 'auto',
    paddingHorizontal: 10,
  },
  fabTopRight: {
    top: 118,
    right: 14,
  },
  fabBottomRight: {
    bottom: 80,  // above ZoneStatusBadge
    right: 14,
  },
  fabLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Detail panel
  panel: {
    flex: 1,
    backgroundColor: '#0B1426',
  },
  panelContent: {
    paddingBottom: 16,
  },
  panelTitle: {
    color: '#5A6380',
    fontSize: 11,
    letterSpacing: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 2,
    textTransform: 'uppercase',
  },
  panelFiller: {
    height: 8,
  },
});

export default MapScreen;
