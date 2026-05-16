import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import GradientBackground from '../../../components/GradientBackground';
import GlassCard from '../../../components/GlassCard';
import TripService, { TripStats } from '../services/TripService';
import { theme } from '../../../core/theme';

const pad = (n: number) => n.toString().padStart(2, '0');

const formatDuration = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
};

const formatDate = (d: Date) =>
  d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const TripScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();

  const [activeTrip, setActiveTrip] = useState<TripStats | null>(null);
  const [history, setHistory] = useState<TripStats[]>([]);
  const [tripName, setTripName] = useState('');
  const [starting, setStarting] = useState(false);

  const refresh = useCallback(async () => {
    const hist = await TripService.getTripHistory();
    setHistory(hist);
    setActiveTrip(TripService.getActiveTrip());
  }, []);

  // Poll active trip every second for live duration/stats
  useEffect(() => {
    const iv = setInterval(() => setActiveTrip(TripService.getActiveTrip()), 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const startTrip = async () => {
    setStarting(true);
    try {
      await TripService.startTrip(tripName);
      setTripName('');
      setActiveTrip(TripService.getActiveTrip());
    } finally {
      setStarting(false);
    }
  };

  const stopTrip = async () => {
    await TripService.stopTrip();
    setActiveTrip(null);
    await refresh();
  };

  const confirmDelete = (trip: TripStats) => {
    Alert.alert(
      t('trip.deleteTrip'),
      trip.name,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await TripService.deleteTrip(trip.id);
            await refresh();
          },
        },
      ],
    );
  };

  return (
    <GradientBackground>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('trip.title')}</Text>
        {activeTrip && (
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>REC</Text>
          </View>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Active trip panel ─────────────────────────────────────────────── */}
        {activeTrip ? (
          <GlassCard style={styles.activeCard}>
            <View style={styles.activeTripHeader}>
              <Text style={styles.activeTripName}>{activeTrip.name}</Text>
              <View style={styles.recBadge}>
                <View style={styles.recDot} />
                <Text style={styles.recText}>LIVE</Text>
              </View>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{activeTrip.distanceNm.toFixed(2)}</Text>
                <Text style={styles.statLabel}>{t('trip.distance')} (nm)</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, styles.statValueTimer]}>
                  {formatDuration(activeTrip.durationSeconds)}
                </Text>
                <Text style={styles.statLabel}>{t('trip.duration')}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{activeTrip.avgSpeedKnots.toFixed(1)}</Text>
                <Text style={styles.statLabel}>{t('trip.avgSpeed')} (kn)</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{activeTrip.maxSpeedKnots.toFixed(1)}</Text>
                <Text style={styles.statLabel}>{t('trip.maxSpeed')} (kn)</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.stopBtn} onPress={stopTrip}>
              <Icon name="square" size={18} color="#FFFFFF" />
              <Text style={styles.stopBtnText}>{t('trip.stopTrip')}</Text>
            </TouchableOpacity>
          </GlassCard>
        ) : (
          /* ── Start trip ────────────────────────────────────────────────────── */
          <GlassCard style={styles.startCard}>
            <Icon name="navigation" size={32} color={theme.colors.primary} style={styles.startIcon} />
            <Text style={styles.startCardTitle}>{t('trip.startTrip')}</Text>
            <TextInput
              style={styles.nameInput}
              placeholder={t('trip.renameTrip')}
              placeholderTextColor="#5A6380"
              value={tripName}
              onChangeText={setTripName}
              autoCapitalize="words"
            />
            <TouchableOpacity
              style={[styles.startBtn, starting && styles.startBtnDisabled]}
              onPress={startTrip}
              disabled={starting}
            >
              <Icon name="play" size={20} color="#0B1426" />
              <Text style={styles.startBtnText}>{t('trip.startTrip')}</Text>
            </TouchableOpacity>
          </GlassCard>
        )}

        {/* ── Trip history ──────────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>{t('trip.tripHistory')}</Text>

        {history.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="anchor" size={48} color="#2A3560" />
            <Text style={styles.emptyText}>{t('trip.noTrips')}</Text>
          </View>
        ) : (
          history.map(trip => (
            <GlassCard key={trip.id} style={styles.tripCard}>
              <View style={styles.tripCardTop}>
                <View style={styles.tripCardInfo}>
                  <Text style={styles.tripName}>{trip.name}</Text>
                  <Text style={styles.tripDate}>{formatDate(trip.startedAt)}</Text>
                </View>
                <TouchableOpacity onPress={() => confirmDelete(trip)} style={styles.deleteBtn}>
                  <Icon name="trash-2" size={16} color={theme.colors.danger} />
                </TouchableOpacity>
              </View>
              <View style={styles.tripMetrics}>
                <View style={styles.metric}>
                  <Icon name="navigation" size={12} color={theme.colors.primary} />
                  <Text style={styles.metricValue}>{trip.distanceNm.toFixed(2)} nm</Text>
                </View>
                <View style={styles.metric}>
                  <Icon name="clock" size={12} color={theme.colors.primary} />
                  <Text style={styles.metricValue}>{formatDuration(trip.durationSeconds)}</Text>
                </View>
                <View style={styles.metric}>
                  <Icon name="wind" size={12} color={theme.colors.primary} />
                  <Text style={styles.metricValue}>{trip.avgSpeedKnots.toFixed(1)} kn</Text>
                </View>
              </View>
            </GlassCard>
          ))
        )}

        <View style={{ height: 32 }} />
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
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: { padding: 4 },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', flex: 1 },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.danger },
  liveText: { color: theme.colors.danger, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 16 },
  // Active card
  activeCard: { padding: 18, marginBottom: 20 },
  activeTripHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  activeTripName: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', flex: 1 },
  recBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,71,87,0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 0.5,
    borderColor: 'rgba(255,71,87,0.4)',
  },
  recDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.danger },
  recText: { color: theme.colors.danger, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 18, rowGap: 14, columnGap: 0 },
  statItem: { width: '50%' },
  statValue: { color: theme.colors.primary, fontSize: 26, fontWeight: '700', fontFamily: 'monospace' },
  statValueTimer: { fontSize: 20 },
  statLabel: { color: '#8892B0', fontSize: 12, marginTop: 2 },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.danger,
    borderRadius: 12,
    paddingVertical: 14,
  },
  stopBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  // Start card
  startCard: { padding: 24, marginBottom: 20, alignItems: 'center' },
  startIcon: { marginBottom: 12 },
  startCardTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '600', marginBottom: 16 },
  nameInput: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 15,
    marginBottom: 16,
  },
  startBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  startBtnDisabled: { opacity: 0.5 },
  startBtnText: { color: '#0B1426', fontSize: 17, fontWeight: '700' },
  // History
  sectionTitle: {
    color: '#5A6380',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { color: '#5A6380', fontSize: 14 },
  tripCard: { padding: 14, marginBottom: 10 },
  tripCardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  tripCardInfo: { flex: 1 },
  tripName: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  tripDate: { color: '#8892B0', fontSize: 12, marginTop: 2 },
  deleteBtn: { padding: 4 },
  tripMetrics: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  metric: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metricValue: { color: '#8892B0', fontSize: 13 },
});

export default TripScreen;
