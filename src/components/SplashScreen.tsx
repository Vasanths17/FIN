import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import GradientBackground from './GradientBackground';
import AppLogo from './AppLogo';

interface SplashScreenProps {
  onReady: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onReady }) => {
  const scale   = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const wave1   = useRef(new Animated.Value(0)).current;
  const wave2   = useRef(new Animated.Value(0)).current;
  const wave3   = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Logo entrance
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Staggered wave animations
    const waveAnim = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, { toValue: 1, duration: 2000, delay, useNativeDriver: true }),
          Animated.timing(val, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ]),
      );

    waveAnim(wave1, 0).start();
    waveAnim(wave2, 300).start();
    waveAnim(wave3, 600).start();

    // Minimum 2 seconds, then fade out
    const timer = setTimeout(() => {
      Animated.timing(fadeOut, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => onReady());
    }, 2200);

    return () => clearTimeout(timer);
  }, []);// eslint-disable-line react-hooks/exhaustive-deps

  const waveTranslate = (val: Animated.Value) =>
    val.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });

  return (
    <Animated.View style={[styles.container, { opacity: fadeOut }]}>
      <GradientBackground>
        {/* Logo */}
        <Animated.View
          style={[
            styles.logoWrap,
            { opacity, transform: [{ scale }] },
          ]}
        >
          <AppLogo size="large" showCompass />
        </Animated.View>

        {/* Waves */}
        <View style={styles.waveContainer}>
          <Animated.View
            style={[
              styles.wave,
              { opacity: 0.08, transform: [{ translateY: waveTranslate(wave1) }] },
            ]}
          />
          <Animated.View
            style={[
              styles.wave,
              styles.wave2,
              { opacity: 0.05, transform: [{ translateY: waveTranslate(wave2) }] },
            ]}
          />
          <Animated.View
            style={[
              styles.wave,
              styles.wave3,
              { opacity: 0.03, transform: [{ translateY: waveTranslate(wave3) }] },
            ]}
          />
        </View>
      </GradientBackground>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  logoWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  wave: {
    position: 'absolute',
    bottom: -40,
    left: -20,
    right: -20,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#00D4AA',
  },
  wave2: {
    bottom: -20,
    height: 140,
  },
  wave3: {
    bottom: 0,
    height: 120,
  },
});

export default SplashScreen;
