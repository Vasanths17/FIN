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

  async completeOnboarding(data: OnboardingData): Promise<void> {
    await AsyncStorage.multiSet([
      [KEYS.complete, 'true'],
      [KEYS.vessel,   data.vesselName.trim()],
      [KEYS.port,     data.homePort || 'chennai'],
    ]);

    // Create emergency contact if provided
    if (data.contactName.trim() && data.contactPhone.trim()) {
      await SOSService.addContact(
        data.contactName.trim(),
        data.contactPhone.trim(),
        'Family',
        true,
      );
    }
    // Always seed Coast Guard
    await SOSService.seedCoastGuard();
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
