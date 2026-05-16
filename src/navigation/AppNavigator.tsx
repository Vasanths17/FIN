import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Feather';
import { useTranslation } from 'react-i18next';

// Screens
import MapScreen from '../features/map/screens/MapScreen';
import SOSScreen from '../features/sos/screens/SOSScreen';
import EmergencyContactsScreen from '../features/sos/screens/EmergencyContactsScreen';
import ToolsHomeScreen from '../features/settings/screens/ToolsHomeScreen';
import TripScreen from '../features/trip/screens/TripScreen';
import HotspotScreen from '../features/hotspot/screens/HotspotScreen';
import AnchorScreen from '../features/anchor/screens/AnchorScreen';
import TidesScreen from '../features/tides/screens/TidesScreen';
import SettingsScreen from '../features/settings/screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const MapStack = createNativeStackNavigator();
const SOSStack = createNativeStackNavigator();
const ToolsStack = createNativeStackNavigator();
const SettingsStack = createNativeStackNavigator();

const MapNavigator = () => (
  <MapStack.Navigator screenOptions={{ headerShown: false }}>
    <MapStack.Screen name="MapMain" component={MapScreen} />
  </MapStack.Navigator>
);

const SOSNavigator = () => (
  <SOSStack.Navigator screenOptions={{ headerShown: false }}>
    <SOSStack.Screen name="SOSMain" component={SOSScreen} />
    <SOSStack.Screen name="EmergencyContacts" component={EmergencyContactsScreen} />
  </SOSStack.Navigator>
);

const ToolsNavigator = () => (
  <ToolsStack.Navigator screenOptions={{ headerShown: false }}>
    <ToolsStack.Screen name="ToolsHome" component={ToolsHomeScreen} />
    <ToolsStack.Screen name="TripLog" component={TripScreen} />
    <ToolsStack.Screen name="Hotspots" component={HotspotScreen} />
    <ToolsStack.Screen name="AnchorWatch" component={AnchorScreen} />
    <ToolsStack.Screen name="Tides" component={TidesScreen} />
  </ToolsStack.Navigator>
);

const SettingsNavigator = () => (
  <SettingsStack.Navigator screenOptions={{ headerShown: false }}>
    <SettingsStack.Screen name="SettingsMain" component={SettingsScreen} />
  </SettingsStack.Navigator>
);

interface TabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

const CustomTabBar: React.FC<TabBarProps> = ({ state, navigation }) => {
  const { t } = useTranslation();

  const tabs = [
    { name: 'Map', icon: 'map', label: t('tabs.map') },
    { name: 'SOS', icon: 'alert-circle', label: t('tabs.sos') },
    { name: 'Tools', icon: 'tool', label: t('tabs.tools') },
    { name: 'Settings', icon: 'settings', label: t('tabs.settings') },
  ];

  return (
    <View style={styles.tabBar}>
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;
        const tab = tabs[index];
        const isSOS = tab.name === 'SOS';

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={onPress}
            style={[styles.tabItem, isSOS && styles.sosTab]}
          >
            {isSOS ? (
              <View style={styles.sosButton}>
                <Icon name="alert-circle" size={28} color="#FF4757" />
              </View>
            ) : (
              <Icon
                name={tab.icon}
                size={22}
                color={isFocused ? '#00D4AA' : '#5A6380'}
              />
            )}
            <Text
              style={[
                styles.tabLabel,
                { color: isSOS ? '#FF4757' : isFocused ? '#00D4AA' : '#5A6380' },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const AppNavigator: React.FC = () => (
  <Tab.Navigator
    tabBar={(props) => <CustomTabBar {...props} />}
    screenOptions={{ headerShown: false }}
  >
    <Tab.Screen name="Map" component={MapNavigator} />
    <Tab.Screen name="SOS" component={SOSNavigator} />
    <Tab.Screen name="Tools" component={ToolsNavigator} />
    <Tab.Screen name="Settings" component={SettingsNavigator} />
  </Tab.Navigator>
);

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(11, 20, 38, 0.95)',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  sosTab: { flex: 1 },
  sosButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 71, 87, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 71, 87, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});

export default AppNavigator;
