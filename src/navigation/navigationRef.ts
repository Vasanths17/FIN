import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<Record<string, object | undefined>>();

/** Navigate from anywhere — services, hooks, outside React tree. */
export const rootNavigate = (name: string, params?: object) => {
  if (navigationRef.isReady()) {
    // @ts-ignore — generic params typing
    navigationRef.navigate(name, params);
  }
};
