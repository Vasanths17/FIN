import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import GradientBackground from '../../../components/GradientBackground';
import GlassCard from '../../../components/GlassCard';
import AppLogo from '../../../components/AppLogo';
import { rootNavigate } from '../../../navigation/navigationRef';

interface ToolItem {
  icon: string;
  titleKey: string;
  subtitleKey?: string;
  route?: string;
  action?: () => void;
  color: string;
}

const TOOLS: ToolItem[] = [
  {
    icon: 'alert-triangle',
    titleKey: 'mob.title',
    subtitleKey: 'mob.subtitle',
    action: () => rootNavigate('MOBModal'),
    color: '#FF4757',
  },
  { icon: 'navigation', titleKey: 'trip.title', subtitleKey: 'trip.noTrips', route: 'TripLog', color: '#00D4AA' },
  { icon: 'map-pin', titleKey: 'hotspot.title', subtitleKey: 'hotspot.dropPin', route: 'Hotspots', color: '#6C63FF' },
  { icon: 'anchor', titleKey: 'anchor.title', subtitleKey: 'anchor.secure', route: 'AnchorWatch', color: '#FFA502' },
  { icon: 'activity', titleKey: 'tides.title', subtitleKey: 'tides.weekForecast', route: 'Tides', color: '#00B4D8' },
];

const ToolsHomeScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();

  return (
    <GradientBackground>
      <View style={styles.header}>
        <AppLogo size="small" />
        <Text style={styles.subtitle}>{t('tabs.tools')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.grid}>
        {TOOLS.map(tool => (
          <GlassCard
            key={tool.route ?? tool.titleKey}
            style={styles.toolCard}
            onPress={() => tool.action ? tool.action() : navigation.navigate(tool.route!)}
          >
            <View style={[styles.iconWrap, { backgroundColor: `${tool.color}20`, borderColor: `${tool.color}40` }]}>
              <Icon name={tool.icon} size={28} color={tool.color} />
            </View>
            <View style={styles.textCol}>
              <Text style={styles.toolTitle} numberOfLines={1}>{t(tool.titleKey)}</Text>
              {tool.subtitleKey && (
                <Text style={styles.toolSub} numberOfLines={1}>{t(tool.subtitleKey)}</Text>
              )}
            </View>
            <Icon name="chevron-right" size={18} color="#5A6380" />
          </GlassCard>
        ))}
      </ScrollView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 },
  subtitle: { color: '#8892B0', fontSize: 13, marginTop: 6, letterSpacing: 1 },
  grid: { padding: 16, gap: 12, paddingBottom: 32 },
  toolCard: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flex: 1, justifyContent: 'center', gap: 3 },
  toolTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  toolSub: { color: '#8892B0', fontSize: 12 },
});

export default ToolsHomeScreen;
