import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

interface Props {
  distanceNm: number;
  durationSeconds: number;
  currentSpeedKnots: number;
}

const pad = (n: number) => n.toString().padStart(2, '0');

const formatDuration = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
};

const TripStatsBar: React.FC<Props> = ({ distanceNm, durationSeconds, currentSpeedKnots }) => (
  <View style={styles.bar}>
    <View style={styles.segment}>
      <Icon name="navigation" size={12} color="#00D4AA" />
      <Text style={styles.value}>{distanceNm.toFixed(2)}</Text>
      <Text style={styles.unit}>nm</Text>
    </View>
    <View style={styles.divider} />
    <View style={styles.segment}>
      <Icon name="clock" size={12} color="#00D4AA" />
      <Text style={styles.value}>{formatDuration(durationSeconds)}</Text>
    </View>
    <View style={styles.divider} />
    <View style={styles.segment}>
      <Icon name="wind" size={12} color="#00D4AA" />
      <Text style={styles.value}>{currentSpeedKnots.toFixed(1)}</Text>
      <Text style={styles.unit}>kn</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(11,20,38,0.88)',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(0,212,170,0.3)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 0,
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    justifyContent: 'center',
  },
  divider: {
    width: 0.5,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  value: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', fontFamily: 'monospace' },
  unit: { color: '#8892B0', fontSize: 11 },
});

export default TripStatsBar;
