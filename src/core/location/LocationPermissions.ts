import { PermissionsAndroid, Platform } from 'react-native';

export const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;

  try {
    const fineResult = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission',
        message: 'MaritimeGuard needs GPS access for live tracking and border monitoring.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );

    if (fineResult !== PermissionsAndroid.RESULTS.GRANTED) return false;

    if (Platform.Version >= 29) {
      const bgResult = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
        {
          title: 'Background Location',
          message: 'Allow location access in background for continuous border monitoring and anchor watch.',
          buttonPositive: 'Allow',
          buttonNegative: 'Skip',
        },
      );
      return bgResult === PermissionsAndroid.RESULTS.GRANTED;
    }

    return true;
  } catch {
    return false;
  }
};
