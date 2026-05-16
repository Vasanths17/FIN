import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import GradientBackground from '../../../components/GradientBackground';
import GlassCard from '../../../components/GlassCard';
import TideService, { PORTS, TidePoint } from '../services/TideService';
import MoonService, { MoonPhaseData, FishingQualityData, DailyMoon } from '../services/MoonService';
import { theme } from '../../../core/theme';

// Demo coordinates (Arabian Sea, same as MapScreen)
const DEMO_LAT = 12.5;
const DEMO_LNG = 69.43;
const STORAGE_KEY = 'tides_port';

const CHART_WIDTH = Dimensions.get('window').width - 64; // accounting for card padding
const CHART_HEIGHT = 90;

const fmtTime = (d: Date) =>
  d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

const fmtDay = (d: Date) =>
  d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });

const minutesUntil = (target: Date): string => {
  const diff = Math.max(0, Math.floor((target.getTime() - Date.now()) / 60_000));
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

// ─── Tide curve chart ──────────────────────────────────────────────────────────
const TideCurve: React.FC<{ points: TidePoint[]; now: Date }> = ({ points, now }) => {
  if (points.length === 0) return null;
  const heights = points.map(p => p.height);
  const minH = Math.min(...heights);
  const maxH = Math.max(...heights);
  const range = maxH - minH || 0.01;

  const toX = (i: number) => (i / (points.length - 1)) * CHART_WIDTH;
  const toY = (h: number) => CHART_HEIGHT - ((h - minH) / range) * (CHART_HEIGHT - 12) - 4;

  // Current time position (0-1 fraction of day)
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const dayFraction = (now.getTime() - startOfDay.getTime()) / 86_400_000;
  const nowX = dayFraction * CHART_WIDTH;

  return (
    <View style={{ width: CHART_WIDTH, height: CHART_HEIGHT + 24, position: 'relative' }}>
      {/* Fill area + dots */}
      {points.map((pt, i) => {
        const x = toX(i);
        const y = toY(pt.height);
        const fillH = CHART_HEIGHT - y - 4;
        return (
          <React.Fragment key={i}>
            {/* Fill bar */}
            <View
              style={{
                position: 'absolute',
                left: x - 1,
                bottom: 20,
                width: CHART_WIDTH / points.length + 1,
                height: Math.max(fillH, 0),
                backgroundColor: 'rgba(0,212,170,0.15)',
              }}
            />
            {/* Line dot */}
            <View
              style={{
                position: 'absolute',
                left: x - 1.5,
                bottom: 20 + Math.max(fillH, 0),
                width: 3,
                height: 3,
                borderRadius: 1.5,
                backgroundColor: '#00D4AA',
              }}
            />
          </React.Fragment>
        );
      })}

      {/* Current time line */}
      <View
        style={{
          position: 'absolute',
          left: nowX,
          top: 0,
          bottom: 20,
          width: 1.5,
          backgroundColor: theme.colors.warning,
          opacity: 0.8,
        }}
      />

      {/* X-axis hour labels */}
      {[0, 6, 12, 18, 24].map(h => (
        <Text
          key={h}
          style={{
            position: 'absolute',
            left: (h / 24) * CHART_WIDTH - 8,
            bottom: 2,
            color: '#5A6380',
            fontSize: 10,
          }}
        >
          {h === 24 ? '24' : `${h}`}
        </Text>
      ))}
    </View>
  );
};

// ─── Moon phase visual ─────────────────────────────────────────────────────────
const MoonVisual: React.FC<{ fraction: number }> = ({ fraction }) => {
  // fraction 0 = new moon, 0.5 = full moon
  // We use two overlapping half-circles to approximate
  const isFull = fraction >= 0.48 && fraction < 0.52;
  const isNew = fraction < 0.03 || fraction >= 0.97;
  const isWaxing = fraction < 0.5;

  // Illuminated side offset — positive shifts lit half to the right (waxing), negative left (waning)
  const offset = isWaxing ? (fraction / 0.5) * 32 - 16 : ((1 - fraction) / 0.5) * 32 - 16;

  return (
    <View style={styles.moonContainer}>
      {/* Dark base circle */}
      <View style={styles.moonBase} />
      {/* Illuminated half */}
      {!isNew && (
        <View
          style={[
            styles.moonIlluminated,
            {
              left: isFull ? 0 : isWaxing ? Math.max(0, 16 - fraction * 64) : Math.max(0, fraction * 64 - 48),
              width: isFull ? 60 : 30,
              opacity: isFull ? 1 : 0.9,
            },
          ]}
        />
      )}
    </View>
  );
};

// ─── Fishing quality badge ─────────────────────────────────────────────────────
const qualityColors: Record<string, string> = {
  excellent: '#00D4AA',
  good: '#6EC1E4',
  fair: '#FFA502',
  poor: '#FF4757',
};

// ─── Main screen ──────────────────────────────────────────────────────────────
const TidesScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();

  const [portKey, setPortKey] = useState('chennai');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [now, setNow] = useState(new Date());
  const [showPortPicker, setShowPortPicker] = useState(false);

  // Refresh clock every minute
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(iv);
  }, []);

  // Load saved port on mount; auto-select nearest to demo position
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(saved => {
      if (saved) {
        setPortKey(saved);
      } else {
        const nearest = TideService.getNearestPort(DEMO_LAT, DEMO_LNG);
        setPortKey(nearest);
      }
    });
  }, []);

  const selectPort = async (key: string) => {
    setPortKey(key);
    await AsyncStorage.setItem(STORAGE_KEY, key);
    setShowPortPicker(false);
  };

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d);
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();

  // Tide data
  const tideCurve = useMemo(() => TideService.getTideCurve(portKey, selectedDate), [portKey, selectedDate]);
  const dailyExtrema = useMemo(() => TideService.getDailyTides(portKey, selectedDate), [portKey, selectedDate]);
  const currentHeight = useMemo(() => TideService.getTideAtTime(portKey, now), [portKey, now]);
  const direction = useMemo(() => TideService.getTideDirection(portKey, now), [portKey, now]);
  const nextTide = useMemo(() => TideService.getNextTide(portKey, now), [portKey, now]);
  const weeklyTides = useMemo(() => TideService.getWeeklyTides(portKey, new Date()), [portKey]);

  // Moon data
  const moonPhase = useMemo(() => MoonService.getMoonPhase(selectedDate), [selectedDate]);
  const moonTimes = useMemo(() => {
    const port = PORTS[portKey];
    return MoonService.getMoonTimes(port.lat, port.lng, selectedDate);
  }, [portKey, selectedDate]);
  const fishingQuality = useMemo(() => MoonService.getFishingQuality(selectedDate), [selectedDate]);
  const weeklyMoon = useMemo(() => MoonService.getWeeklyMoon(new Date()), []);

  const port = PORTS[portKey];

  return (
    <GradientBackground>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('tides.title')}</Text>
        <TouchableOpacity style={styles.portPill} onPress={() => setShowPortPicker(true)}>
          <Icon name="map-pin" size={13} color={theme.colors.primary} />
          <Text style={styles.portPillText}>{port.name}</Text>
          <Icon name="chevron-down" size={13} color="#8892B0" />
        </TouchableOpacity>
      </View>

      {/* Date navigation */}
      <View style={styles.dateNav}>
        <TouchableOpacity onPress={() => shiftDate(-1)} style={styles.dateArrow}>
          <Icon name="chevron-left" size={22} color="#8892B0" />
        </TouchableOpacity>
        <Text style={styles.dateText}>
          {isToday ? 'Today, ' : ''}{selectedDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
        </Text>
        <TouchableOpacity onPress={() => shiftDate(1)} style={styles.dateArrow}>
          <Icon name="chevron-right" size={22} color="#8892B0" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Section 1: Current Tide ──────────────────────────────────────── */}
        <GlassCard style={styles.card}>
          <View style={styles.currentTideRow}>
            <View>
              <Text style={styles.tideHeightBig}>{currentHeight.toFixed(2)}m</Text>
              <View style={styles.directionRow}>
                <Icon
                  name={direction === 'rising' ? 'trending-up' : 'trending-down'}
                  size={16}
                  color={direction === 'rising' ? theme.colors.safe : theme.colors.warning}
                />
                <Text style={[styles.directionText, { color: direction === 'rising' ? theme.colors.safe : theme.colors.warning }]}>
                  {direction === 'rising' ? t('tides.rising') : t('tides.falling')}
                </Text>
              </View>
            </View>
            {nextTide && (
              <View style={styles.nextTideBox}>
                <Text style={styles.nextTideLabel}>
                  {nextTide.type === 'high' ? t('tides.highTide') : t('tides.lowTide')}
                </Text>
                <Text style={styles.nextTideTime}>{fmtTime(nextTide.time)}</Text>
                <Text style={styles.nextTideEta}>in {minutesUntil(nextTide.time)}</Text>
                <Text style={styles.nextTideHeight}>{nextTide.height.toFixed(2)}m</Text>
              </View>
            )}
          </View>

          {/* Today's high/low */}
          <View style={styles.extremaRow}>
            {dailyExtrema.slice(0, 4).map((e, i) => (
              <View key={i} style={styles.extremaItem}>
                <Icon
                  name={e.type === 'high' ? 'arrow-up' : 'arrow-down'}
                  size={12}
                  color={e.type === 'high' ? theme.colors.primary : '#8892B0'}
                />
                <Text style={styles.extremaTime}>{fmtTime(e.time)}</Text>
                <Text style={[styles.extremaHeight, { color: e.type === 'high' ? theme.colors.primary : '#8892B0' }]}>
                  {e.height.toFixed(2)}m
                </Text>
              </View>
            ))}
          </View>
        </GlassCard>

        {/* ── Section 2: Tide Curve ────────────────────────────────────────── */}
        <GlassCard style={styles.card}>
          <Text style={styles.cardTitle}>{t('tides.tideCurve')}</Text>
          <TideCurve points={tideCurve} now={isToday ? now : selectedDate} />
        </GlassCard>

        {/* ── Section 3: Moon Phase ────────────────────────────────────────── */}
        <GlassCard style={styles.card}>
          <View style={styles.moonRow}>
            <View style={styles.moonLeft}>
              <Text style={styles.moonEmoji}>{moonPhase.emoji}</Text>
              <MoonVisual fraction={moonPhase.fraction} />
            </View>
            <View style={styles.moonRight}>
              <Text style={styles.moonPhaseName}>{moonPhase.phase}</Text>
              <Text style={styles.moonIllumination}>
                {t('tides.illumination')}: {moonPhase.illumination}%
              </Text>
              {moonTimes.rise && (
                <View style={styles.moonTimeRow}>
                  <Icon name="sunrise" size={13} color={theme.colors.warning} />
                  <Text style={styles.moonTimeText}>{t('tides.moonrise')}: {fmtTime(moonTimes.rise)}</Text>
                </View>
              )}
              {moonTimes.set && (
                <View style={styles.moonTimeRow}>
                  <Icon name="sunset" size={13} color="#8892B0" />
                  <Text style={styles.moonTimeText}>{t('tides.moonset')}: {fmtTime(moonTimes.set)}</Text>
                </View>
              )}
            </View>
          </View>
        </GlassCard>

        {/* ── Section 4: Fishing Quality ───────────────────────────────────── */}
        <GlassCard style={styles.card}>
          <View style={styles.fishingRow}>
            <View style={[styles.fishingBadge, { backgroundColor: `${qualityColors[fishingQuality.quality]}20`, borderColor: qualityColors[fishingQuality.quality] }]}>
              <Text style={[styles.fishingQualityText, { color: qualityColors[fishingQuality.quality] }]}>
                {t(`tides.${fishingQuality.quality}`)}
              </Text>
            </View>
            <Text style={styles.fishingReason}>{fishingQuality.reason}</Text>
          </View>
        </GlassCard>

        {/* ── Section 5: 7-Day Forecast ────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>{t('tides.weekForecast')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekRow}>
          {weeklyTides.map((day, i) => {
            const moon = weeklyMoon[i] || MoonService.getMoonPhase(day.date);
            const moonData: MoonPhaseData = (moon as DailyMoon).phase ?? moon as MoonPhaseData;
            const qual: FishingQualityData = (moon as DailyMoon).quality ?? MoonService.getFishingQuality(day.date);
            const todayCard = day.date.toDateString() === new Date().toDateString();
            const high = day.extrema.find(e => e.type === 'high');
            const low = day.extrema.find(e => e.type === 'low');
            return (
              <View key={i} style={[styles.dayCard, todayCard && styles.dayCardToday]}>
                <Text style={styles.dayName}>{fmtDay(day.date)}</Text>
                <Text style={styles.dayMoonEmoji}>{moonData.emoji}</Text>
                {high && (
                  <View style={styles.dayTide}>
                    <Icon name="arrow-up" size={10} color={theme.colors.primary} />
                    <Text style={styles.dayTideText}>{fmtTime(high.time)}</Text>
                    <Text style={styles.dayTideH}>{high.height.toFixed(1)}m</Text>
                  </View>
                )}
                {low && (
                  <View style={styles.dayTide}>
                    <Icon name="arrow-down" size={10} color="#8892B0" />
                    <Text style={styles.dayTideText}>{fmtTime(low.time)}</Text>
                    <Text style={styles.dayTideH}>{low.height.toFixed(1)}m</Text>
                  </View>
                )}
                <View style={[styles.dayQualBadge, { backgroundColor: `${qualityColors[qual.quality]}25` }]}>
                  <Text style={[styles.dayQualText, { color: qualityColors[qual.quality] }]}>
                    {t(`tides.${qual.quality}`).charAt(0).toUpperCase() + t(`tides.${qual.quality}`).slice(1)}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Port picker modal */}
      <Modal visible={showPortPicker} animationType="slide" transparent>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayDismiss} onPress={() => setShowPortPicker(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{t('tides.selectPort')}</Text>
            {Object.entries(PORTS).map(([key, p]) => (
              <TouchableOpacity
                key={key}
                style={[styles.portOption, portKey === key && styles.portOptionActive]}
                onPress={() => selectPort(key)}
              >
                <View style={[styles.portRadio, portKey === key && styles.portRadioActive]} />
                <View>
                  <Text style={styles.portName}>{p.name}</Text>
                  <Text style={styles.portCoord}>{p.lat.toFixed(2)}°N  {p.lng.toFixed(2)}°E</Text>
                </View>
              </TouchableOpacity>
            ))}
            <View style={{ height: 24 }} />
          </View>
        </View>
      </Modal>
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
    gap: 10,
  },
  backBtn: { padding: 4 },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', flex: 1 },
  portPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,212,170,0.1)',
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: 'rgba(0,212,170,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  portPillText: { color: theme.colors.primary, fontSize: 12, fontWeight: '600' },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 16,
  },
  dateArrow: { padding: 8 },
  dateText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', minWidth: 160, textAlign: 'center' },
  scroll: { paddingHorizontal: 16, paddingBottom: 16 },
  card: { padding: 16, marginBottom: 12 },
  cardTitle: { color: '#8892B0', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  // Current tide
  currentTideRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  tideHeightBig: { color: theme.colors.primary, fontSize: 48, fontWeight: '700', fontFamily: 'monospace' },
  directionRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: -4 },
  directionText: { fontSize: 14, fontWeight: '600' },
  nextTideBox: { alignItems: 'flex-end' },
  nextTideLabel: { color: '#8892B0', fontSize: 11 },
  nextTideTime: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
  nextTideEta: { color: '#5A6380', fontSize: 11, marginTop: -2 },
  nextTideHeight: { color: theme.colors.primary, fontSize: 14, fontWeight: '600' },
  extremaRow: { flexDirection: 'row', marginTop: 14, paddingTop: 12, borderTopWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)' },
  extremaItem: { flex: 1, alignItems: 'center', gap: 2 },
  extremaTime: { color: '#8892B0', fontSize: 11 },
  extremaHeight: { fontSize: 13, fontWeight: '600' },
  // Moon
  moonRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  moonLeft: { alignItems: 'center', gap: 8 },
  moonEmoji: { fontSize: 36 },
  moonContainer: { width: 60, height: 60, position: 'relative' },
  moonBase: {
    position: 'absolute', width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#1A2040',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  moonIlluminated: {
    position: 'absolute', height: 60, borderRadius: 30,
    backgroundColor: '#E8E0C8',
  },
  moonRight: { flex: 1, gap: 4 },
  moonPhaseName: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  moonIllumination: { color: '#8892B0', fontSize: 13 },
  moonTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  moonTimeText: { color: '#8892B0', fontSize: 12 },
  // Fishing quality
  fishingRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  fishingBadge: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  fishingQualityText: { fontSize: 14, fontWeight: '700' },
  fishingReason: { color: '#8892B0', fontSize: 13, flex: 1 },
  // Section label
  sectionLabel: {
    color: '#5A6380',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  // Weekly forecast
  weekRow: { gap: 10, paddingBottom: 4 },
  dayCard: {
    width: 110,
    backgroundColor: 'rgba(22,32,64,0.7)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 4,
  },
  dayCardToday: { borderColor: theme.colors.primary, borderWidth: 1 },
  dayName: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  dayMoonEmoji: { fontSize: 20 },
  dayTide: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  dayTideText: { color: '#8892B0', fontSize: 10, flex: 1 },
  dayTideH: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  dayQualBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 4 },
  dayQualText: { fontSize: 10, fontWeight: '600' },
  // Port picker
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  overlayDismiss: { flex: 1 },
  sheet: {
    backgroundColor: '#111D35',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center', marginBottom: 16,
  },
  sheetTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginBottom: 16 },
  portOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  portOptionActive: {},
  portRadio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#5A6380',
  },
  portRadioActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary },
  portName: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  portCoord: { color: '#8892B0', fontSize: 11, fontFamily: 'monospace' },
});

export default TidesScreen;
