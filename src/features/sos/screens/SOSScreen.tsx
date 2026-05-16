import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import GradientBackground from '../../../components/GradientBackground';
import GlassCard from '../../../components/GlassCard';
import SOSService, { SOSContact, SOSResult } from '../services/SOSService';
import { theme } from '../../../core/theme';

// ─── Progress ring using two-half-clip technique ───────────────────────────────
const RING_SIZE = 216;
const RING_HALF = RING_SIZE / 2;
const RING_STROKE = 8;

const ProgressRing: React.FC<{ progress: Animated.Value }> = ({ progress }) => {
  // Right half fills from 0% → 50% (rotates -180deg → 0deg)
  const rightRot = progress.interpolate({
    inputRange: [0, 0.5],
    outputRange: ['-180deg', '0deg'],
    extrapolateRight: 'clamp',
  });
  // Left half fills from 50% → 100% (rotates -180deg → 0deg)
  const leftRot = progress.interpolate({
    inputRange: [0.5, 1],
    outputRange: ['-180deg', '0deg'],
    extrapolateLeft: 'clamp',
  });

  const arc = {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_HALF,
    borderWidth: RING_STROKE,
    borderColor: '#FF4757',
    position: 'absolute' as const,
    backgroundColor: 'transparent',
  };

  return (
    <View style={{ width: RING_SIZE, height: RING_SIZE, position: 'absolute' }}>
      {/* Track */}
      <View style={[arc, { borderColor: 'rgba(255,71,87,0.18)' }]} />
      {/* Right clip — reveals first half of ring */}
      <View style={styles.rightClip}>
        <Animated.View style={[arc, { left: -RING_HALF, transform: [{ rotate: rightRot }] }]} />
      </View>
      {/* Left clip — reveals second half of ring */}
      <View style={styles.leftClip}>
        <Animated.View style={[arc, { left: 0, transform: [{ rotate: leftRot }] }]} />
      </View>
    </View>
  );
};

// ─── Types ────────────────────────────────────────────────────────────────────
type SOSState = 'idle' | 'holding' | 'sending' | 'sent' | 'failed';

const HOLD_DURATION = 3000;

// ─── Main screen ──────────────────────────────────────────────────────────────
const SOSScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();

  const [sosState, setSOSState] = useState<SOSState>('idle');
  const [countdown, setCountdown] = useState(3);
  const [contacts, setContacts] = useState<SOSContact[]>([]);
  const [sendResults, setSendResults] = useState<SOSResult[]>([]);
  const [cancelTaps, setCancelTaps] = useState(0);

  const holdProgress = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(1)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load contacts
  useEffect(() => {
    SOSService.seedCoastGuard().then(() =>
      SOSService.getEmergencyContacts().then(setContacts),
    );
  }, []);

  // Idle glow animation
  useEffect(() => {
    if (sosState !== 'idle') return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [sosState, glowAnim]);

  // Flash red overlay when sending
  useEffect(() => {
    if (sosState === 'sending') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(flashAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(flashAnim, { toValue: 0.4, duration: 400, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      flashAnim.setValue(0);
    }
  }, [sosState, flashAnim]);

  const activateSOS = useCallback(async () => {
    setSOSState('sending');
    setSendResults([]);
    Vibration.vibrate([0, 200, 100, 200, 100, 500]);

    const results = await SOSService.sendSOS(
      12.5, // demo lat
      69.43, // demo lng
      5.2,
      265,
      result => setSendResults(prev => [...prev, result]),
    );

    const allSent = results.every(r => r.sent);
    setSOSState(allSent ? 'sent' : 'failed');
  }, []);

  const startHold = useCallback(() => {
    if (sosState !== 'idle') return;
    setSOSState('holding');
    setCountdown(3);
    Vibration.vibrate(50);

    holdAnimRef.current = Animated.timing(holdProgress, {
      toValue: 1,
      duration: HOLD_DURATION,
      useNativeDriver: false,
    });
    holdAnimRef.current.start(({ finished }) => {
      if (finished) activateSOS();
    });

    let c = 3;
    countdownRef.current = setInterval(() => {
      c -= 1;
      setCountdown(c);
      if (c > 0) Vibration.vibrate(100);
    }, 1000);

    holdTimerRef.current = setTimeout(() => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    }, HOLD_DURATION);
  }, [sosState, holdProgress, activateSOS]);

  const cancelHold = useCallback(() => {
    if (sosState !== 'holding') return;
    holdAnimRef.current?.stop();
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    Animated.timing(holdProgress, { toValue: 0, duration: 200, useNativeDriver: false }).start();
    setSOSState('idle');
    setCountdown(3);
  }, [sosState, holdProgress]);

  const handleCancelSOS = useCallback(() => {
    const taps = cancelTaps + 1;
    setCancelTaps(taps);
    if (taps >= 2) {
      setSOSState('idle');
      setSendResults([]);
      setCancelTaps(0);
    }
  }, [cancelTaps]);

  const reset = useCallback(() => {
    setSOSState('idle');
    setSendResults([]);
    setCancelTaps(0);
    holdProgress.setValue(0);
  }, [holdProgress]);

  // ── Sending/sent overlay ───────────────────────────────────────────────────
  if (sosState === 'sending' || sosState === 'sent' || sosState === 'failed') {
    return (
      <View style={styles.sendingContainer}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.redOverlay, { opacity: flashAnim }]} />
        <View style={styles.sendingContent}>
          <Text style={styles.sendingTitle}>
            {sosState === 'sending'
              ? t('sos.sending')
              : sosState === 'sent'
              ? t('sos.sent')
              : t('sos.failed')}
          </Text>
          <View style={styles.resultsList}>
            {sendResults.map(r => (
              <View key={r.contact.id} style={styles.resultRow}>
                <Icon
                  name={r.sent ? 'check-circle' : 'x-circle'}
                  size={18}
                  color={r.sent ? theme.colors.safe : theme.colors.danger}
                />
                <Text style={styles.resultName}>{r.contact.name}</Text>
                <Text style={styles.resultPhone}>{r.contact.phone}</Text>
              </View>
            ))}
            {sosState === 'sending' && sendResults.length < contacts.length && (
              <View style={styles.resultRow}>
                <Icon name="loader" size={18} color={theme.colors.warning} />
                <Text style={styles.resultName}>{t('common.loading')}</Text>
              </View>
            )}
          </View>
          {sosState !== 'sending' && (
            <TouchableOpacity style={styles.closeBtn} onPress={reset}>
              <Text style={styles.closeBtnText}>{t('common.back')}</Text>
            </TouchableOpacity>
          )}
          {sosState === 'sending' && (
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelSOS}>
              <Text style={styles.cancelBtnText}>
                {cancelTaps === 0 ? t('sos.cancel') : t('sos.cancelConfirm')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // ── Idle / holding ────────────────────────────────────────────────────────
  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll} bounces={false}>
        <Text style={styles.title}>{t('sos.title')}</Text>
        <Text style={styles.subtitle}>{t('sos.holdToActivate')}</Text>

        {/* SOS Button */}
        <View style={styles.buttonArea}>
          <Animated.View
            style={[styles.glowRing, { transform: [{ scale: glowAnim }] }]}
          />
          <ProgressRing progress={holdProgress} />
          <TouchableOpacity
            activeOpacity={0.9}
            onPressIn={startHold}
            onPressOut={cancelHold}
            style={styles.sosButton}
          >
            <Text style={styles.sosText}>SOS</Text>
            <Text style={styles.holdText}>
              {sosState === 'holding' ? `${countdown}` : 'HOLD'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* GPS card */}
        <GlassCard style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.fixDot, { backgroundColor: theme.colors.safe }]} />
            <Text style={styles.cardLabel}>{t('sos.yourPosition')}</Text>
            <Text style={styles.cardValue}>{t('sos.gpsLock')}</Text>
          </View>
          <Text style={styles.coordText}>12°30.0'N  069°25.8'E (demo)</Text>
        </GlassCard>

        {/* Contacts card */}
        <GlassCard style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{t('sos.emergencyContacts')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('EmergencyContacts')}>
              <Text style={styles.editLink}>{t('sos.editContact')}</Text>
            </TouchableOpacity>
          </View>
          {contacts.length === 0 ? (
            <Text style={styles.emptyText}>{t('sos.noContacts')}</Text>
          ) : (
            contacts.map(c => (
              <View key={c.id} style={styles.contactRow}>
                {c.isPrimary && (
                  <Icon name="star" size={12} color={theme.colors.warning} />
                )}
                <Text style={styles.contactName}>{c.name}</Text>
                <Text style={styles.contactPhone}>{c.phone}</Text>
                <View style={styles.relBadge}>
                  <Text style={styles.relText}>{c.relationship}</Text>
                </View>
              </View>
            ))
          )}
        </GlassCard>
      </ScrollView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  scroll: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 32,
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  subtitle: {
    color: '#8892B0',
    fontSize: 14,
    alignSelf: 'flex-start',
    marginBottom: 32,
  },
  // Ring clips
  rightClip: {
    position: 'absolute',
    width: RING_HALF,
    height: RING_SIZE,
    left: RING_HALF,
    overflow: 'hidden',
  },
  leftClip: {
    position: 'absolute',
    width: RING_HALF,
    height: RING_SIZE,
    left: 0,
    overflow: 'hidden',
  },
  buttonArea: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  glowRing: {
    position: 'absolute',
    width: RING_SIZE + 32,
    height: RING_SIZE + 32,
    borderRadius: (RING_SIZE + 32) / 2,
    backgroundColor: 'rgba(255,71,87,0.12)',
  },
  sosButton: {
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: '#CC1020',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 12,
    shadowColor: '#FF4757',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 24,
  },
  sosText: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 6,
  },
  holdText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 2,
    marginTop: -4,
  },
  card: { width: '100%', marginBottom: 12, padding: 14 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fixDot: { width: 8, height: 8, borderRadius: 4 },
  cardLabel: { color: '#8892B0', fontSize: 13, flex: 1 },
  cardValue: { color: '#00D4AA', fontSize: 13, fontWeight: '600' },
  coordText: { color: '#FFFFFF', fontSize: 13, fontFamily: 'monospace', marginTop: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  cardTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  editLink: { color: '#00D4AA', fontSize: 13 },
  emptyText: { color: '#5A6380', fontSize: 13 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, borderTopWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)' },
  contactName: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', flex: 1 },
  contactPhone: { color: '#8892B0', fontSize: 13 },
  relBadge: { backgroundColor: 'rgba(108,99,255,0.2)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  relText: { color: '#6C63FF', fontSize: 11 },
  // Sending overlay
  sendingContainer: { flex: 1, backgroundColor: '#0B1426' },
  redOverlay: { backgroundColor: '#FF4757' },
  sendingContent: { flex: 1, padding: 32, justifyContent: 'center' },
  sendingTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', textAlign: 'center', marginBottom: 32 },
  resultsList: { gap: 12, marginBottom: 32 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  resultName: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', flex: 1 },
  resultPhone: { color: '#8892B0', fontSize: 14 },
  cancelBtn: { alignItems: 'center', padding: 14 },
  cancelBtnText: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  closeBtn: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 14, alignItems: 'center' },
  closeBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});

export default SOSScreen;
