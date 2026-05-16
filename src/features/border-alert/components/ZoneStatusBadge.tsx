import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/Feather';
import { ZoneLevel } from '../../../core/geo/BorderGeofenceService';

interface ZoneConfig {
  icon: string;
  color: string;
  borderColor: string;
  backgroundTint: string;
  labelKey: string;
  subtitleKey: string;
}

const ZONE_CONFIG: Record<ZoneLevel, ZoneConfig> = {
  safe: {
    icon: 'shield',
    color: '#00D4AA',
    borderColor: 'rgba(0,212,170,0.35)',
    backgroundTint: 'rgba(0,212,170,0.08)',
    labelKey: 'border.safe',
    subtitleKey: 'border.distanceToBorder',
  },
  warning: {
    icon: 'alert-triangle',
    color: '#FFA502',
    borderColor: 'rgba(255,165,2,0.4)',
    backgroundTint: 'rgba(255,165,2,0.08)',
    labelKey: 'border.warning',
    subtitleKey: 'border.distanceToBorder',
  },
  danger: {
    icon: 'alert-octagon',
    color: '#FF4757',
    borderColor: 'rgba(255,71,87,0.4)',
    backgroundTint: 'rgba(255,71,87,0.08)',
    labelKey: 'border.danger',
    subtitleKey: 'border.turnBack',
  },
  critical: {
    icon: 'alert-octagon',
    color: '#FF4757',
    borderColor: 'rgba(255,71,87,0.8)',
    backgroundTint: 'rgba(255,71,87,0.15)',
    labelKey: 'border.critical',
    subtitleKey: 'border.turnBack',
  },
};

interface Props {
  zone: ZoneLevel;
  distanceKm: number;
  bearingLabel: string;
  etaMinutes: number | null;
}

const ZoneStatusBadge: React.FC<Props> = ({ zone, distanceKm, bearingLabel, etaMinutes }) => {
  const { t } = useTranslation();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const config = ZONE_CONFIG[zone];

  useEffect(() => {
    pulseAnim.stopAnimation();
    if (zone === 'warning') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.55, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ]),
      ).start();
    } else if (zone === 'danger') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
      ).start();
    } else if (zone === 'critical') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.15, duration: 250, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      Animated.timing(pulseAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }
  }, [zone, pulseAnim]);

  const displayDistance =
    distanceKm >= 100 ? `${Math.round(distanceKm)}` : distanceKm.toFixed(1);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          borderColor: config.borderColor,
          backgroundColor: config.backgroundTint,
          opacity: zone === 'warning' || zone === 'danger' || zone === 'critical'
            ? pulseAnim
            : 1,
        },
      ]}
    >
      <View style={styles.iconWrap}>
        <Icon name={config.icon} size={26} color={config.color} />
      </View>

      <View style={styles.center}>
        <Text style={[styles.zoneLabel, { color: config.color }]}>
          {t(config.labelKey)}
        </Text>
        <Text style={styles.zoneSub}>{t(config.subtitleKey)}</Text>
        {etaMinutes !== null && (
          <Text style={styles.eta}>
            {t('border.eta')}: {etaMinutes} min
          </Text>
        )}
      </View>

      <View style={styles.right}>
        <Text style={[styles.distanceNum, { color: config.color }]}>
          {displayDistance}
        </Text>
        <Text style={styles.distanceUnit}>{t('border.km')}</Text>
        <Text style={styles.bearingSmall}>{bearingLabel}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    // Glass morphism
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  iconWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
  },
  zoneLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  zoneSub: {
    color: '#8892B0',
    fontSize: 11,
    marginTop: 1,
  },
  eta: {
    color: '#FFA502',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  right: {
    alignItems: 'flex-end',
  },
  distanceNum: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  distanceUnit: {
    color: '#8892B0',
    fontSize: 11,
    marginTop: -2,
  },
  bearingSmall: {
    color: '#5A6380',
    fontSize: 10,
    marginTop: 2,
  },
});

export default ZoneStatusBadge;
