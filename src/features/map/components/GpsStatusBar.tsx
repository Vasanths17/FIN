import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

export interface GpsLocation {
  lat: number;
  lng: number;
  speedKnots?: number;
  heading?: number;
  accuracy?: number;
  hasFix: boolean;
}

interface Props {
  location: GpsLocation | null;
}

/**
 * Converts decimal degrees to mariner notation.
 * lat  13.0827° → "13°04.9'N"
 * lng  80.2707° → "080°16.2'E"
 */
const toMariner = (decimal: number, isLat: boolean): string => {
  const abs = Math.abs(decimal);
  const degrees = Math.floor(abs);
  const minutes = (abs - degrees) * 60;
  const direction = isLat
    ? decimal >= 0
      ? 'N'
      : 'S'
    : decimal >= 0
    ? 'E'
    : 'W';
  const degStr = degrees.toString().padStart(isLat ? 2 : 3, '0');
  // minutes formatted as MM.m (e.g. 04.9)
  const minStr = minutes.toFixed(1).padStart(4, '0');
  return `${degStr}°${minStr}'${direction}`;
};

const GpsStatusBar: React.FC<Props> = ({ location }) => {
  const { t } = useTranslation();

  const hasFix = location?.hasFix ?? false;
  const lat = location?.lat ?? 0;
  const lng = location?.lng ?? 0;
  const speed = location?.speedKnots ?? 0;
  const heading = location?.heading ?? 0;
  const accuracy = location?.accuracy ?? 0;

  return (
    <View style={styles.container}>
      {/* Row 1 — position + fix indicator */}
      <View style={styles.row}>
        <View style={[styles.fixDot, { backgroundColor: hasFix ? '#00D4AA' : '#FF4757' }]} />
        <Text style={styles.coords}>
          {location ? `${toMariner(lat, true)},  ${toMariner(lng, false)}` : t('map.noFix')}
        </Text>
      </View>

      {/* Row 2 — speed | heading | accuracy */}
      <View style={styles.row}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>{t('map.speed')}</Text>
          <Text style={styles.metricValue}>
            {speed.toFixed(1)} <Text style={styles.metricUnit}>{t('trip.knots')}</Text>
          </Text>
        </View>
        <View style={styles.sep} />
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>{t('map.heading')}</Text>
          <Text style={styles.metricValue}>
            {Math.round(heading)}
            <Text style={styles.metricUnit}>°</Text>
          </Text>
        </View>
        <View style={styles.sep} />
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>{t('map.accuracy')}</Text>
          <Text style={styles.metricValue}>
            ±{Math.round(accuracy)} <Text style={styles.metricUnit}>{t('common.meters')}</Text>
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(11, 20, 38, 0.88)',
    borderBottomWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingTop: 52, // status bar offset
    paddingBottom: 8,
    paddingHorizontal: 14,
    gap: 4,
    zIndex: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fixDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    flexShrink: 0,
  },
  coords: {
    color: '#FFFFFF',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    // Fallback monospace
    fontFamily: 'monospace',
    letterSpacing: 0.3,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  metricLabel: {
    color: '#5A6380',
    fontSize: 10,
    letterSpacing: 0.3,
  },
  metricValue: {
    color: '#00D4AA',
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  metricUnit: {
    color: '#5A6380',
    fontSize: 10,
    fontWeight: '400',
  },
  sep: {
    width: 0.5,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginHorizontal: 4,
  },
});

export default GpsStatusBar;
