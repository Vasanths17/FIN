import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import GlassCard from '../../../components/GlassCard';
import MOBService, { MOBStatus } from '../services/MOBService';
import { theme } from '../../../core/theme';

// Demo boat starts here; drifts east on every tick to simulate movement
const DEMO_LAT = 10.0;
const DEMO_LNG = 80.0;
const RESCUE_HOLD_MS = 3000;

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};

// ─── Compass arrow: triangle pointing north, rotated by bearing ────────────────
const CompassArrow: React.FC<{ bearing: number }> = ({ bearing }) => (
  <View style={styles.compassContainer}>
    <View style={styles.compassCircle}>
      <View style={[styles.arrowWrap, { transform: [{ rotate: `${bearing}deg` }] }]}>
        {/* Arrowhead (triangle via borders) */}
        <View style={styles.arrowHead} />
        {/* Stem */}
        <View style={styles.arrowStem} />
      </View>
    </View>
  </View>
);

// ─── Main component ────────────────────────────────────────────────────────────
const MOBScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();

  const [active, setActive] = useState(false);
  const [crewName, setCrewName] = useState('');
  const [mobStatus, setMobStatus] = useState<MOBStatus>(MOBService.getMOBStatus());

  const boatRef = useRef({ lat: DEMO_LAT, lng: DEMO_LNG });

  // Animations
  const headerScale = useRef(new Animated.Value(1)).current;
  const rescueProgress = useRef(new Animated.Value(0)).current;
  const rescueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rescueAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  // Poll service + simulate boat drift while active
  useEffect(() => {
    if (!active) return;
    const iv = setInterval(() => {
      boatRef.current.lng += 0.00003; // ~3 m/s east
      MOBService.updatePosition(boatRef.current.lat, boatRef.current.lng);
      setMobStatus(MOBService.getMOBStatus());
    }, 1000);
    return () => clearInterval(iv);
  }, [active]);

  // "MOB ACTIVE" pulsing header
  useEffect(() => {
    if (active) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(headerScale, { toValue: 1.04, duration: 600, useNativeDriver: true }),
          Animated.timing(headerScale, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
      );
      anim.start();
      return () => anim.stop();
    }
    headerScale.setValue(1);
  }, [active, headerScale]);

  const activate = useCallback(() => {
    boatRef.current = { lat: DEMO_LAT, lng: DEMO_LNG };
    MOBService.triggerMOB(DEMO_LAT, DEMO_LNG, crewName.trim());
    setActive(true);
    setMobStatus(MOBService.getMOBStatus());
  }, [crewName]);

  const startRescueHold = useCallback(() => {
    rescueAnimRef.current = Animated.timing(rescueProgress, {
      toValue: 1,
      duration: RESCUE_HOLD_MS,
      useNativeDriver: false,
    });
    rescueAnimRef.current.start();
    rescueTimerRef.current = setTimeout(() => {
      MOBService.markRescued();
      setActive(false);
      setCrewName('');
      rescueProgress.setValue(0);
      navigation.goBack();
    }, RESCUE_HOLD_MS);
  }, [rescueProgress, navigation]);

  const cancelRescueHold = useCallback(() => {
    rescueAnimRef.current?.stop();
    Animated.timing(rescueProgress, { toValue: 0, duration: 200, useNativeDriver: false }).start();
    if (rescueTimerRef.current) clearTimeout(rescueTimerRef.current);
  }, [rescueProgress]);

  const clearAndClose = useCallback(() => {
    MOBService.clearMOB();
    if (rescueTimerRef.current) clearTimeout(rescueTimerRef.current);
    rescueProgress.setValue(0);
    setActive(false);
    setCrewName('');
    navigation.goBack();
  }, [rescueProgress, navigation]);

  // ── ACTIVE overlay ─────────────────────────────────────────────────────────
  if (active) {
    return (
      <View style={styles.activeContainer}>
        {/* Pulsing header */}
        <Animated.View style={[styles.activeHeader, { transform: [{ scale: headerScale }] }]}>
          <Text style={styles.activeTitle}>{t('mob.active')}</Text>
          {crewName ? <Text style={styles.crewNameActive}>{crewName}</Text> : null}
        </Animated.View>

        {/* Elapsed timer */}
        <Text style={styles.timerText}>{formatTime(mobStatus.elapsedSeconds)}</Text>

        {/* Compass pointing to MOB */}
        <CompassArrow bearing={mobStatus.bearing} />
        <Text style={styles.bearingLabel}>{mobStatus.bearingLabel}</Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <GlassCard style={styles.statCard}>
            <Icon name="navigation" size={16} color={theme.colors.warning} />
            <Text style={styles.statValue}>{mobStatus.distanceMeters}</Text>
            <Text style={styles.statLabel}>m — {t('mob.distance')}</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <Icon name="clock" size={16} color={theme.colors.warning} />
            <Text style={styles.statValue}>{formatTime(mobStatus.elapsedSeconds)}</Text>
            <Text style={styles.statLabel}>{t('mob.elapsed')}</Text>
          </GlassCard>
        </View>

        {/* 3-second hold rescue button */}
        <View style={styles.rescueWrap}>
          <TouchableOpacity
            style={styles.rescueBtn}
            onPressIn={startRescueHold}
            onPressOut={cancelRescueHold}
            activeOpacity={0.85}
          >
            {/* Progress fill */}
            <Animated.View
              style={[
                styles.rescueProgressFill,
                {
                  width: rescueProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
            <View style={styles.rescueBtnContent}>
              <Icon name="check-circle" size={20} color={theme.colors.safe} />
              <Text style={styles.rescueBtnText}>{t('mob.rescuedConfirm')}</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.holdHint}>{t('mob.holdToConfirm')}</Text>
        </View>

        <TouchableOpacity style={styles.cancelBtn} onPress={clearAndClose}>
          <Text style={styles.cancelText}>{t('common.cancel')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── IDLE state ────────────────────────────────────────────────────────────
  return (
    <View style={styles.idleContainer}>
      {/* Close button (top-right) */}
      <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
        <Icon name="x" size={26} color="#8892B0" />
      </TouchableOpacity>

      <Text style={styles.idleTitle}>{t('mob.title')}</Text>
      <Text style={styles.idleSubtitle}>{t('mob.subtitle')}</Text>

      {/* Optional crew name */}
      <TextInput
        style={styles.crewInput}
        placeholder={t('mob.crewName')}
        placeholderTextColor="#5A6380"
        value={crewName}
        onChangeText={setCrewName}
        autoCapitalize="words"
      />

      {/* Big orange button — covers ~70% of screen */}
      <TouchableOpacity style={styles.mobBtn} onPress={activate} activeOpacity={0.85}>
        <Text style={styles.mobBtnInstruct}>{t('mob.tapToMark')}</Text>
        <Text style={styles.mobBtnMain}>{t('mob.manOverboard')}</Text>
        <Icon name="alert-triangle" size={36} color="#FFFFFF" style={styles.mobBtnIcon} />
      </TouchableOpacity>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ACTIVE
  activeContainer: {
    flex: 1,
    backgroundColor: '#0B1426',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  activeHeader: {
    backgroundColor: 'rgba(255,71,87,0.15)',
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingVertical: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,71,87,0.4)',
    alignItems: 'center',
  },
  activeTitle: {
    color: theme.colors.danger,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 4,
  },
  crewNameActive: { color: '#FFFFFF', fontSize: 14, marginTop: 4, opacity: 0.8 },
  timerText: {
    color: theme.colors.danger,
    fontSize: 56,
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: 4,
    marginBottom: 24,
  },
  // Compass
  compassContainer: { alignItems: 'center', marginBottom: 8 },
  compassCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: 'rgba(255,71,87,0.4)',
    backgroundColor: 'rgba(255,71,87,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowWrap: { alignItems: 'center' },
  arrowHead: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 30,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: theme.colors.danger,
  },
  arrowStem: {
    width: 6,
    height: 20,
    backgroundColor: theme.colors.danger,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  bearingLabel: { color: '#8892B0', fontSize: 13, marginTop: 8, marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 10, width: '100%', marginBottom: 28 },
  statCard: { flex: 1, alignItems: 'center', padding: 14, gap: 4 },
  statValue: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  statLabel: { color: '#8892B0', fontSize: 11, textAlign: 'center' },
  // Rescue hold button
  rescueWrap: { width: '100%', marginBottom: 16 },
  rescueBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,212,170,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,170,0.4)',
    height: 58,
    justifyContent: 'center',
  },
  rescueProgressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,212,170,0.25)',
    borderRadius: 14,
  },
  rescueBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    zIndex: 1,
  },
  rescueBtnText: { color: theme.colors.safe, fontSize: 16, fontWeight: '700' },
  holdHint: { color: '#5A6380', fontSize: 12, textAlign: 'center', marginTop: 8 },
  cancelBtn: { marginTop: 4, padding: 14 },
  cancelText: { color: '#5A6380', fontSize: 14 },

  // IDLE
  idleContainer: {
    flex: 1,
    backgroundColor: '#0B1426',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  closeBtn: {
    position: 'absolute',
    top: 52,
    right: 20,
    padding: 8,
  },
  idleTitle: {
    color: theme.colors.danger,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 3,
    textAlign: 'center',
    marginBottom: 8,
  },
  idleSubtitle: {
    color: '#8892B0',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
  },
  crewInput: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 15,
    marginBottom: 32,
    textAlign: 'center',
  },
  // Big MOB button
  mobBtn: {
    width: '100%',
    aspectRatio: 1,
    maxWidth: 300,
    borderRadius: 200,
    backgroundColor: '#CC1020',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,71,87,0.6)',
    shadowColor: '#FF4757',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 40,
    elevation: 20,
  },
  mobBtnInstruct: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 3,
    marginBottom: 8,
  },
  mobBtnMain: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 3,
    textAlign: 'center',
  },
  mobBtnIcon: { marginTop: 16 },
});

export default MOBScreen;
