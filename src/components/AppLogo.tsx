import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type LogoSize = 'small' | 'medium' | 'large';

interface AppLogoProps {
  size?: LogoSize;
  showCompass?: boolean;
}

const sizeMap = {
  small: { title: 18, gap: 2, compass: 28 },
  medium: { title: 26, gap: 4, compass: 40 },
  large: { title: 36, gap: 6, compass: 56 },
};

const CompassIcon: React.FC<{ size: number }> = ({ size }) => {
  const dot = size * 0.08;
  const diamond = size * 0.28;
  return (
    <View style={[styles.compass, { width: size, height: size, borderRadius: size / 2 }]}>
      {/* North needle */}
      <View
        style={[
          styles.needle,
          {
            width: dot,
            height: size * 0.4,
            backgroundColor: '#00D4AA',
            top: size * 0.05,
            left: size / 2 - dot / 2,
          },
        ]}
      />
      {/* South needle */}
      <View
        style={[
          styles.needle,
          {
            width: dot,
            height: size * 0.4,
            backgroundColor: '#8892B0',
            bottom: size * 0.05,
            left: size / 2 - dot / 2,
          },
        ]}
      />
      {/* Diamond center */}
      <View
        style={[
          styles.diamond,
          {
            width: diamond,
            height: diamond,
            top: size / 2 - diamond / 2,
            left: size / 2 - diamond / 2,
          },
        ]}
      />
      {/* Center dot */}
      <View
        style={[
          styles.centerDot,
          {
            width: dot * 1.5,
            height: dot * 1.5,
            borderRadius: dot,
            top: size / 2 - dot * 0.75,
            left: size / 2 - dot * 0.75,
          },
        ]}
      />
    </View>
  );
};

const AppLogo: React.FC<AppLogoProps> = ({ size = 'medium', showCompass = false }) => {
  const dims = sizeMap[size];
  return (
    <View style={styles.container}>
      {showCompass && (
        <View style={{ marginBottom: dims.gap * 2 }}>
          <CompassIcon size={dims.compass} />
        </View>
      )}
      <View style={styles.textRow}>
        <Text style={[styles.maritime, { fontSize: dims.title }]}>MARITIME</Text>
        <Text style={[styles.guard, { fontSize: dims.title }]}>GUARD</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  maritime: {
    color: '#FFFFFF',
    fontWeight: '300',
    letterSpacing: 2,
  },
  guard: {
    color: '#00D4AA',
    fontWeight: '700',
    letterSpacing: 2,
  },
  compass: {
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 170, 0.4)',
    backgroundColor: 'rgba(0, 212, 170, 0.05)',
    position: 'relative',
    overflow: 'hidden',
  },
  needle: {
    position: 'absolute',
    borderRadius: 2,
  },
  diamond: {
    position: 'absolute',
    backgroundColor: 'rgba(0,212,170,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,170,0.5)',
    transform: [{ rotate: '45deg' }],
  },
  centerDot: {
    position: 'absolute',
    backgroundColor: '#00D4AA',
  },
});

export default AppLogo;
