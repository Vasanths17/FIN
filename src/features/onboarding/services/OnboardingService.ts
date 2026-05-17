import AsyncStorage from '@react-native-async-storage/async-storage';
import SOSService from '../../sos/services/SOSService';

const KEYS = {
  complete: '@mg_onboarding_complete',
  vessel:   '@mg_vessel_name',
  port:     '@mg_home_port',
  lang:     '@mg_language',
};

export interface OnboardingData {
  vesselName: string;
  homePort: string;
  contactName: string;
  contactPhone: string;
}

class OnboardingService {
  async isOnboardingComplete(): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(KEYS.complete);
      return val === 'true';
    } catch {
      return false;
    }
  }

  async completeOnboarding(data: {
  vesselName?: string;
  homePort?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}) {
  try {
    await AsyncStorage.setItem('@mg_onboarding_complete', 'true');
    if (data.vesselName) {
      await AsyncStorage.setItem('@mg_vessel_name', data.vesselName);
    }
    if (data.homePort) {
      await AsyncStorage.setItem('@mg_home_port', data.homePort);
    }
    if (data.emergencyContactName) {
      await AsyncStorage.setItem('@mg_emergency_contact_name', data.emergencyContactName);
    }
    if (data.emergencyContactPhone) {
      await AsyncStorage.setItem('@mg_emergency_contact_phone', data.emergencyContactPhone);
    }
    return true;
  } catch (error) {
    console.warn('Onboarding save error:', error);
    // Always return true so user can proceed
    return true;
  }
}

  async getSetupData(): Promise<Partial<OnboardingData>> {
    const results = await AsyncStorage.multiGet([KEYS.vessel, KEYS.port]);
    return {
      vesselName: results[0][1] ?? '',
      homePort:   results[1][1] ?? 'chennai',
    };
  }

  async resetOnboarding(): Promise<void> {
    await AsyncStorage.multiRemove([KEYS.complete, KEYS.vessel, KEYS.port]);
  }
}

export default new OnboardingService();
