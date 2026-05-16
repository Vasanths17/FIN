import './src/core/i18n';
import React, { useState, useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from './src/core/i18n';
import { navigationRef } from './src/navigation/navigationRef';
import AppNavigator from './src/navigation/AppNavigator';
import MOBScreen from './src/features/mob/screens/MOBScreen';
import OnboardingScreen from './src/features/onboarding/screens/OnboardingScreen';
import SplashScreen from './src/components/SplashScreen';
import OnboardingService from './src/features/onboarding/services/OnboardingService';

type AppState = 'splash' | 'onboarding' | 'main';

const darkTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#0B1426',
    card: '#111D35',
    text: '#FFFFFF',
    border: 'rgba(255,255,255,0.08)',
    primary: '#00D4AA',
    notification: '#FF4757',
  },
};

const RootStack = createNativeStackNavigator();

function App(): React.JSX.Element {
  const [appState, setAppState] = useState<AppState>('splash');

  // Called by SplashScreen after its 2 s animation
  const handleSplashReady = async () => {
    // Restore saved language
    try {
      const lang = await AsyncStorage.getItem('@mg_language');
      if (lang) await i18n.changeLanguage(lang);
    } catch { /* ignore */ }

    const onboarded = await OnboardingService.isOnboardingComplete();
    setAppState(onboarded ? 'main' : 'onboarding');
  };

  const handleOnboardingComplete = () => setAppState('main');

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0B1426" />

      {/* Always render main nav underneath; SplashScreen overlays it */}
      {appState === 'main' && (
        <NavigationContainer ref={navigationRef} theme={darkTheme}>
          <RootStack.Navigator screenOptions={{ headerShown: false }}>
            <RootStack.Screen name="Main" component={AppNavigator} />
            <RootStack.Screen
              name="MOBModal"
              component={MOBScreen}
              options={{ presentation: 'fullScreenModal' }}
            />
          </RootStack.Navigator>
        </NavigationContainer>
      )}

      {appState === 'onboarding' && (
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      )}

      {appState === 'splash' && (
        <SplashScreen onReady={handleSplashReady} />
      )}
    </SafeAreaProvider>
  );
}

export default App;
