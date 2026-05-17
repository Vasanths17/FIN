import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MapView, Camera, UserLocation, ShapeSource, FillLayer, LineLayer, CircleLayer } from '@maplibre/maplibre-react-native';
import * as turf from '@turf/turf';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import GradientBackground from '../../../components/GradientBackground';
import GlassCard from '../../../components/GlassCard';
import AnchorWatchService from '../services/AnchorWatchService';
import database from '../../../core/database/database';
import AnchorEvent from '../models/AnchorEvent';
import { theme } from '../../../core/theme';

const MAP_STYLE = 'https://demotiles.maplibre.org/style.json';
const RADII = [30, 50, 100, 200];

// Demo position — Arabian Sea (same as MapScreen)
const DEMO_LAT = 12.5;
const DEMO_LNG = 69.43;

interface HistoryEntry {
  id: string;
  lat: number;
  lng: number;
  radius: number;
  maxDrift: number;
  dragCount: number;
}

interface RawLocation {
  coords: {
    latitude: number;
    longitude: number;
    speed: number | null;
    heading: number | null;
    accuracy: number | null;
  };
}

const AnchorScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const cameraRef = useRef<Camera>(null);
  const dragPulse = useRef(new Animated.Value(1)).current;

  const [status, setStatus] = useState(AnchorWatchService.getStatus());
  const [selectedRadius, setSelectedRadius] = useState(50);
  const [boatLat, setBoatLat] = useState(DEMO_LAT);
  const [boatLng, setBoatLng] = useState(DEMO_LNG);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Poll service status every 500 ms
  useEffect(() => {
    const iv = setInterval(() => setStatus(AnchorWatchService.getStatus()), 500);
    return () => clearInterval(iv);
  }, []);

  // Drag pulse animation
  useEffect(() => {
    if (status.isDragging) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dragPulse, { toValue: 1.06, duration: 400, useNativeDriver: true }),
          Animated.timing(dragPulse, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      dragPulse.setValue(1);
    }
  }, [status.isDragging, dragPulse]);

  const loadHistory = useCallback(async () => {
    try {
      const rows = await database.get<AnchorEvent>('anchor_events').query().fetch();
      setHistory(
        rows
          .map(r => ({
            id: r.id,
            lat: r.latitude,
            lng: r.longitude,
            radius: r.radius,
            maxDrift: r.maxDrift,
            dragCount: r.dragAlertCount,
          }))
          .reverse()
          .slice(0, 5),
      );
    } catch (e) {
      console.error('[AnchorScreen] loadHistory:', e);
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // @ts-ignore — onUpdate type differs between MapLibre versions
  const handleLocationUpdate = useCallback((loc: RawLocation) => {
    const lat = loc.coords.latitude;
    const lng = loc.coords.longitude;
    setBoatLat(lat);
    setBoatLng(lng);
    AnchorWatchService.updatePosition(lat, lng);
  }, []);

  const dropAnchor = useCallback(() => {
    AnchorWatchService.dropAnchor(boatLat, boatLng, selectedRadius);
    cameraRef.current?.setCamera({
      centerCoordinate: [boatLng, boatLat],
      zoomLevel: 16,
      animationDuration: 600,
    });
  }, [boatLat, boatLng, selectedRadius]);

  const liftAnchor = useCallback(async () => {
    AnchorWatchService.liftAnchor();
    await loadHistory();
  }, [loadHistory]);

  // Map GeoJSON shapes — memoised to avoid churn
  const radiusCircleShape = useMemo(() => {
    if (!status.isAnchored || !status.anchorPoint) return null;
    return turf.circle(
      [status.anchorPoint.lng, status.anchorPoint.lat],
      status.radius,
      { steps: 64, units: 'meters' },
    );
  }, [status.isAnchored, status.anchorPoint, status.radius]);

  const anchorLineShape = useMemo(() => {
    if (!status.isAnchored || !status.anchorPoint) return null;
    return turf.lineString([
      [status.anchorPoint.lng, status.anchorPoint.lat],
      [boatLng, boatLat],
    ]);
  }, [status.isAnchored, status.anchorPoint, boatLat, boatLng]);

  const anchorPointShape = useMemo(() => {
    if (!status.isAnchored || !status.anchorPoint) return null;
    return turf.point([status.anchorPoint.lng, status.anchorPoint.lat]);
  }, [status.isAnchored, status.anchorPoint]);

  const mapCenter: [number, number] = status.isAnchored && status.anchorPoint
    ? [status.anchorPoint.lng, status.anchorPoint.lat]
    : [boatLng, boatLat];

  const driftPct = status.isAnchored && status.radius > 0
    ? Math.min(status.currentDistance / status.radius, 1)
    : 0;

  const driftColor = status.isDragging
    ? theme.colors.danger
    : driftPct > 0.75
    ? theme.colors.warning
    : theme.colors.safe;

  return (
    <GradientBackground>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('anchor.title')}</Text>
        {status.isDragging && (
          <Animated.View style={[styles.alertPill, { transform: [{ scale: dragPulse }] }]}>
            <Text style={styles.alertText}>⚠ {t('anchor.dragging')}</Text>
          </Animated.View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Mini map ────────────────────────────────────────────────────── */}
        <View style={styles.mapWrap}>
          <MapView
            style={StyleSheet.absoluteFill}
            styleURL={MAP_STYLE}
            attributionEnabled={false}
            logoEnabled={false}
            pitchEnabled={false}
            compassEnabled={false}
          >
            <Camera
              ref={cameraRef}
              centerCoordinate={mapCenter}
              zoomLevel={status.isAnchored ? 16 : 14}
              animationMode="flyTo"
              animationDuration={600}
            />

            <UserLocation
              visible={true}
              // @ts-ignore
              onUpdate={handleLocationUpdate}
              renderMode="native"
            />

            {/* Radius circle */}
            {radiusCircleShape && (
              <ShapeSource id="anch-radius-src" shape={radiusCircleShape}>
                <FillLayer
                  id="anch-radius-fill"
                  style={{
                    fillColor: status.isDragging
                      ? 'rgba(255,71,87,0.12)'
                      : 'rgba(0,212,170,0.10)',
                    fillOutlineColor: status.isDragging
                      ? theme.colors.danger
                      : theme.colors.primary,
                  }}
                />
              </ShapeSource>
            )}

            {/* Dashed anchor-to-boat line */}
            {anchorLineShape && (
              <ShapeSource id="anch-line-src" shape={anchorLineShape}>
                <LineLayer
                  id="anch-line-layer"
                  style={{
                    lineColor: theme.colors.warning,
                    lineWidth: 2,
                    lineDasharray: [4, 3],
                  }}
                />
              </ShapeSource>
            )}

            {/* Anchor marker */}
            {anchorPointShape && (
              <ShapeSource id="anch-pt-src" shape={anchorPointShape}>
                <CircleLayer
                  id="anch-pt-layer"
                  style={{
                    circleRadius: 9,
                    circleColor: theme.colors.primary,
                    circleStrokeWidth: 2,
                    circleStrokeColor: '#FFFFFF',
                  }}
                />
              </ShapeSource>
            )}
          </MapView>

          {/* Overlay when not anchored */}
          {!status.isAnchored && (
            <View style={styles.mapOverlay}>
              <Icon name="anchor" size={36} color="rgba(0,212,170,0.4)" />
              <Text style={styles.mapOverlayText}>{t('anchor.dropAnchor')}</Text>
            </View>
          )}
        </View>

        {/* ── Stats row ────────────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statLabel}>{t('anchor.drift')}</Text>
            <Text style={[styles.statValue, { color: driftColor }]}>
              {status.currentDistance.toFixed(1)}
            </Text>
            <Text style={styles.statUnit}>m</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statLabel}>{t('anchor.radius')}</Text>
            <Text style={styles.statValue}>
              {status.isAnchored ? status.radius : selectedRadius}
            </Text>
            <Text style={styles.statUnit}>m</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statLabel}>{t('anchor.maxDrift')}</Text>
            <Text style={[styles.statValue, { color: status.maxDrift > 0 ? theme.colors.warning : '#8892B0' }]}>
              {status.maxDrift.toFixed(1)}
            </Text>
            <Text style={styles.statUnit}>m</Text>
          </GlassCard>
        </View>

        {/* ── Drift progress bar ───────────────────────────────────────────── */}
        {status.isAnchored && (
          <GlassCard style={styles.driftCard}>
            <View style={styles.driftLabelRow}>
              <Text style={styles.driftLabel}>{t('anchor.drift')}</Text>
              <Text style={[styles.driftPct, { color: driftColor }]}>
                {Math.round(driftPct * 100)}% of radius
              </Text>
            </View>
            <View style={styles.driftTrack}>
              <View
                style={[
                  styles.driftFill,
                  { width: `${driftPct * 100}%` as any, backgroundColor: driftColor },
                ]}
              />
            </View>
            {status.dragCount > 0 && (
              <Text style={styles.dragCountText}>
                {t('anchor.dragAlerts')}: {status.dragCount}
              </Text>
            )}
          </GlassCard>
        )}

        {/* ── Radius selector (only when not anchored) ─────────────────────── */}
        {!status.isAnchored && (
          <GlassCard style={styles.radiusCard}>
            <Text style={styles.radiusTitle}>{t('anchor.radius')}</Text>
            <View style={styles.radiusChips}>
              {RADII.map(r => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setSelectedRadius(r)}
                  style={[styles.radiusChip, selectedRadius === r && styles.radiusChipActive]}
                >
                  <Text style={[styles.radiusChipText, selectedRadius === r && styles.radiusChipTextActive]}>
                    {r}m
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </GlassCard>
        )}

        {/* ── Drop / Lift button ───────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.mainBtn, status.isAnchored && styles.mainBtnLift]}
          onPress={status.isAnchored ? liftAnchor : dropAnchor}
        >
          <Icon
            name="anchor"
            size={22}
            color={status.isAnchored ? '#FFFFFF' : '#0B1426'}
          />
          <Text style={[styles.mainBtnText, status.isAnchored && styles.mainBtnTextLift]}>
            {status.isAnchored ? t('anchor.liftAnchor') : t('anchor.dropAnchor')}
          </Text>
        </TouchableOpacity>

        {/* ── Anchor history ───────────────────────────────────────────────── */}
        {history.length > 0 && (
          <GlassCard style={styles.historyCard}>
            <Text style={styles.historyTitle}>{t('anchor.history')}</Text>
            {history.map((h, idx) => (
              <View key={h.id} style={[styles.historyRow, idx > 0 && styles.historyBorder]}>
                <Icon name="anchor" size={13} color="#5A6380" />
                <Text style={styles.historyCoord}>
                  {h.lat.toFixed(3)}°N  {h.lng.toFixed(3)}°E
                </Text>
                <Text style={styles.historyRadius}>{h.radius}m</Text>
                <Text style={[styles.historyStatus, { color: h.dragCount > 0 ? theme.colors.danger : theme.colors.safe }]}>
                  {h.dragCount > 0 ? `${h.dragCount}× drag` : 'secure'}
                </Text>
              </View>
            ))}
          </GlassCard>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: { padding: 4 },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', flex: 1 },
  alertPill: {
    backgroundColor: 'rgba(255,71,87,0.2)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: theme.colors.danger,
  },
  alertText: { color: theme.colors.danger, fontSize: 12, fontWeight: '700' },
  scroll: { paddingHorizontal: 16, paddingTop: 4 },
  // Mini map
  mapWrap: {
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11,20,38,0.5)',
    gap: 10,
  },
  mapOverlayText: { color: 'rgba(0,212,170,0.6)', fontSize: 14, fontWeight: '600' },
  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: { flex: 1, alignItems: 'center', padding: 12 },
  statLabel: { color: '#8892B0', fontSize: 11, marginBottom: 4, textAlign: 'center' },
  statValue: { color: theme.colors.primary, fontSize: 22, fontWeight: '700' },
  statUnit: { color: '#5A6380', fontSize: 11, marginTop: 2 },
  // Drift bar
  driftCard: { padding: 14, marginBottom: 12 },
  driftLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  driftLabel: { color: '#8892B0', fontSize: 12 },
  driftPct: { fontSize: 12, fontWeight: '600' },
  driftTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  driftFill: { height: 6, borderRadius: 3 },
  dragCountText: { color: theme.colors.danger, fontSize: 12, marginTop: 8 },
  // Radius selector
  radiusCard: { padding: 14, marginBottom: 12 },
  radiusTitle: { color: '#8892B0', fontSize: 12, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  radiusChips: { flexDirection: 'row', gap: 8 },
  radiusChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  radiusChipActive: { backgroundColor: 'rgba(0,212,170,0.15)', borderColor: theme.colors.primary },
  radiusChipText: { color: '#8892B0', fontSize: 14, fontWeight: '500' },
  radiusChipTextActive: { color: theme.colors.primary, fontWeight: '700' },
  // Drop/Lift button
  mainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 16,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  mainBtnLift: { backgroundColor: theme.colors.danger, shadowColor: theme.colors.danger },
  mainBtnText: { color: '#0B1426', fontSize: 16, fontWeight: '700' },
  mainBtnTextLift: { color: '#FFFFFF' },
  // History
  historyCard: { padding: 14, marginBottom: 12 },
  historyTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginBottom: 10 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  historyBorder: { borderTopWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)' },
  historyCoord: { color: '#8892B0', fontSize: 12, fontFamily: 'monospace', flex: 1 },
  historyRadius: { color: '#5A6380', fontSize: 12 },
  historyStatus: { fontSize: 12, fontWeight: '600' },
});

export default AnchorScreen;
