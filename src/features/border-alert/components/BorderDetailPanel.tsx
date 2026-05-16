import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/Feather';
import { UseBorderAlertResult } from '../hooks/useBorderAlert';
import GlassCard from '../../../components/GlassCard';
import { ZoneLevel } from '../../../core/geo/BorderGeofenceService';

const ZONE_COLORS: Record<ZoneLevel, string> = {
  safe: '#00D4AA',
  warning: '#FFA502',
  danger: '#FF4757',
  critical: '#FF4757',
};

const toMarinerFormat = (decimal: number, isLat: boolean): string => {
  const abs = Math.abs(decimal);
  const degrees = Math.floor(abs);
  const minutes = (abs - degrees) * 60;
  const direction = isLat ? (decimal >= 0 ? 'N' : 'S') : decimal >= 0 ? 'E' : 'W';
  const degStr = degrees.toString().padStart(isLat ? 2 : 3, '0');
  const minStr = minutes.toFixed(1).padStart(4, '0');
  return `${degStr}°${minStr}'${direction}`;
};

interface Row {
  icon: string;
  label: string;
  value: string;
  color?: string;
}

interface Props {
  borderAlert: UseBorderAlertResult;
}

const BorderDetailPanel: React.FC<Props> = ({ borderAlert }) => {
  const { t } = useTranslation();
  const { zone, distanceKm, nearestPoint, bearing, bearingLabel, etaMinutes, lastUpdateTime } =
    borderAlert;

  const zoneColor = ZONE_COLORS[zone];

  const secondsAgo = lastUpdateTime
    ? Math.round((Date.now() - lastUpdateTime.getTime()) / 1000)
    : null;

  const rows: Row[] = [
    {
      icon: 'maximize-2',
      label: t('border.distanceToBorder'),
      value:
        distanceKm >= 100
          ? `${Math.round(distanceKm)} ${t('border.km')}`
          : `${distanceKm.toFixed(1)} ${t('border.km')}`,
      color: zoneColor,
    },
    {
      icon: 'navigation',
      label: t('border.bearingToBorder'),
      value: bearingLabel,
    },
    {
      icon: 'map-pin',
      label: t('border.nearestPoint'),
      value:
        nearestPoint.lat !== 0
          ? `${toMarinerFormat(nearestPoint.lat, true)},  ${toMarinerFormat(nearestPoint.lng, false)}`
          : '---',
    },
    {
      icon: 'clock',
      label: t('border.eta'),
      value: etaMinutes !== null ? `${etaMinutes} min` : 'N/A',
    },
    {
      icon: 'refresh-cw',
      label: t('border.lastUpdate'),
      value: secondsAgo !== null ? `${secondsAgo}${t('common.seconds')} ${t('common.ago')}` : '---',
    },
  ];

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.zoneDot, { backgroundColor: zoneColor }]} />
        <Text style={[styles.zoneTitle, { color: zoneColor }]}>
          {t(`border.${zone}`)}
        </Text>
      </View>

      {rows.map(row => (
        <View key={row.icon} style={styles.row}>
          <Icon name={row.icon} size={15} color="#5A6380" style={styles.rowIcon} />
          <Text style={styles.rowLabel}>{row.label}</Text>
          <Text style={[styles.rowValue, row.color ? { color: row.color } : undefined]}>
            {row.value}
          </Text>
        </View>
      ))}
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    padding: 0,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  zoneDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  zoneTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  rowIcon: {
    width: 22,
    marginRight: 10,
  },
  rowLabel: {
    color: '#8892B0',
    fontSize: 13,
    flex: 1,
  },
  rowValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});

export default BorderDetailPanel;
