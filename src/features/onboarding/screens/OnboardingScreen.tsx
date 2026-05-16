import React, { useRef, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/Feather';
import GradientBackground from '../../../components/GradientBackground';
import AppLogo from '../../../components/AppLogo';
import GlassCard from '../../../components/GlassCard';
import { theme } from '../../../core/theme';
import OnboardingService from '../services/OnboardingService';

const { width } = Dimensions.get('window');

const PORTS = [
  { id: 'chennai',        label: 'Chennai'        },
  { id: 'visakhapatnam', label: 'Vizag'          },
  { id: 'kochi',          label: 'Kochi'          },
  { id: 'mumbai',         label: 'Mumbai'         },
  { id: 'tuticorin',      label: 'Tuticorin'      },
  { id: 'mangalore',      label: 'Mangalore'      },
];

interface FeatureSlide {
  icon: string;
  titleKey: string;
  descKey: string;
  color: string;
}

const SLIDES: FeatureSlide[] = [
  {
    icon: 'alert-triangle',
    titleKey: 'onboarding.safetyTitle',
    descKey:  'onboarding.safetyDesc',
    color: '#FF4757',
  },
  {
    icon: 'map',
    titleKey: 'onboarding.navigateTitle',
    descKey:  'onboarding.navigateDesc',
    color: '#00D4AA',
  },
  {
    icon: 'anchor',
    titleKey: 'onboarding.communityTitle',
    descKey:  'onboarding.communityDesc',
    color: '#FFA502',
  },
];

// Total pages: 1 welcome + 3 feature slides + 1 setup = 5
const TOTAL_PAGES = 5;

interface OnboardingScreenProps {
  onComplete?: () => void;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const { t } = useTranslation();
  const scrollRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);

  // Setup form state
  const [vesselName,    setVesselName]    = useState('');
  const [homePort,      setHomePort]      = useState('chennai');
  const [contactName,   setContactName]   = useState('');
  const [contactPhone,  setContactPhone]  = useState('');
  const [completing,    setCompleting]    = useState(false);

  const goToPage = (page: number) => {
    scrollRef.current?.scrollTo({ x: page * width, animated: true });
    setCurrentPage(page);
  };

  const handleNext = () => {
    if (currentPage < TOTAL_PAGES - 1) {
      goToPage(currentPage + 1);
    }
  };

  const handleComplete = async () => {
    if (completing) return;
    setCompleting(true);
    try {
      await OnboardingService.completeOnboarding({
        vesselName: vesselName || 'My Vessel',
        homePort,
        contactName,
        contactPhone,
      });
      onComplete?.();
    } finally {
      setCompleting(false);
    }
  };

  const onScroll = (e: any) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentPage(page);
  };

  return (
    <GradientBackground>
      <View style={styles.root}>
        {/* Dot indicators */}
        <View style={styles.dots}>
          {Array.from({ length: TOTAL_PAGES }).map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentPage && styles.dotActive]}
            />
          ))}
        </View>

        {/* Horizontal pager */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          onMomentumScrollEnd={onScroll}
          style={styles.pager}
        >

          {/* ── Page 0: Welcome ───────────────────────────────────── */}
          <View style={[styles.page, { width }]}>
            <AppLogo size="large" showCompass />
            <Text style={styles.welcomeTitle}>{t('onboarding.welcome')}</Text>
            <Text style={styles.tagline}>{t('onboarding.tagline')}</Text>
            <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
              <Text style={styles.nextBtnText}>{t('onboarding.next')}</Text>
              <Icon name="arrow-right" size={18} color="#0B1426" />
            </TouchableOpacity>
          </View>

          {/* ── Pages 1-3: Feature slides ─────────────────────────── */}
          {SLIDES.map((slide, idx) => (
            <View key={idx} style={[styles.page, { width }]}>
              <View style={[styles.iconBadge, { backgroundColor: slide.color + '22', borderColor: slide.color + '66' }]}>
                <Icon name={slide.icon} size={48} color={slide.color} />
              </View>
              <Text style={styles.slideTitle}>{t(slide.titleKey)}</Text>
              <Text style={styles.slideDesc}>{t(slide.descKey)}</Text>
              <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                <Text style={styles.nextBtnText}>
                  {idx === SLIDES.length - 1 ? t('onboarding.setupTitle') : t('onboarding.next')}
                </Text>
                <Icon name="arrow-right" size={18} color="#0B1426" />
              </TouchableOpacity>
            </View>
          ))}

          {/* ── Page 4: Setup form ────────────────────────────────── */}
          <View style={[styles.page, styles.setupPage, { width }]}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.setupScroll}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.setupTitle}>{t('onboarding.setupTitle')}</Text>

              {/* Vessel name */}
              <GlassCard style={styles.formCard}>
                <View style={styles.formRow}>
                  <Icon name="anchor" size={14} color={theme.colors.primary} />
                  <Text style={styles.formLabel}>{t('settings.vesselName')}</Text>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder={t('onboarding.enterVesselName')}
                  placeholderTextColor="#5A6380"
                  value={vesselName}
                  onChangeText={setVesselName}
                  autoCapitalize="words"
                />
              </GlassCard>

              {/* Port chips */}
              <GlassCard style={styles.formCard}>
                <View style={styles.formRow}>
                  <Icon name="map-pin" size={14} color={theme.colors.primary} />
                  <Text style={styles.formLabel}>{t('settings.homePort')}</Text>
                </View>
                <View style={styles.portGrid}>
                  {PORTS.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.portChip, homePort === p.id && styles.portChipActive]}
                      onPress={() => setHomePort(p.id)}
                    >
                      <Text style={[styles.portChipText, homePort === p.id && styles.portChipTextActive]}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </GlassCard>

              {/* Emergency contact */}
              <GlassCard style={styles.formCard}>
                <View style={styles.formRow}>
                  <Icon name="phone" size={14} color={theme.colors.primary} />
                  <Text style={styles.formLabel}>{t('sos.emergencyContacts')} ({t('onboarding.skip')})</Text>
                </View>
                <TextInput
                  style={[styles.input, { marginBottom: 8 }]}
                  placeholder={t('onboarding.emergencyContactName')}
                  placeholderTextColor="#5A6380"
                  value={contactName}
                  onChangeText={setContactName}
                  autoCapitalize="words"
                />
                <TextInput
                  style={styles.input}
                  placeholder={t('onboarding.emergencyContactPhone')}
                  placeholderTextColor="#5A6380"
                  value={contactPhone}
                  onChangeText={setContactPhone}
                  keyboardType="phone-pad"
                />
              </GlassCard>

              <TouchableOpacity
                style={[styles.getStartedBtn, completing && { opacity: 0.6 }]}
                onPress={handleComplete}
                disabled={completing}
              >
                <Icon name="check-circle" size={20} color="#0B1426" />
                <Text style={styles.getStartedText}>{t('onboarding.getStarted')}</Text>
              </TouchableOpacity>

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>

        </ScrollView>
      </View>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingTop: 56,
    paddingBottom: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  pager: { flex: 1 },
  // Welcome + feature pages
  page: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 48,
  },
  welcomeTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 28,
    marginBottom: 10,
  },
  tagline: {
    color: '#8892B0',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 48,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 16,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  nextBtnText: { color: '#0B1426', fontSize: 16, fontWeight: '700' },
  iconBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 28,
  },
  slideTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  slideDesc: {
    color: '#8892B0',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  // Setup page
  setupPage: { justifyContent: 'flex-start', paddingHorizontal: 0 },
  setupScroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
  setupTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  formCard: { padding: 16, marginBottom: 12 },
  formRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  formLabel: { color: '#8892B0', fontSize: 13 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: '#FFFFFF',
    fontSize: 15,
  },
  portGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  portChip: {
    width: '30%',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  portChipActive: {
    backgroundColor: 'rgba(0,212,170,0.15)',
    borderColor: theme.colors.primary,
  },
  portChipText: { color: '#8892B0', fontSize: 12, fontWeight: '500' },
  portChipTextActive: { color: theme.colors.primary, fontWeight: '700' },
  getStartedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  getStartedText: { color: '#0B1426', fontSize: 17, fontWeight: '700' },
});

export default OnboardingScreen;
