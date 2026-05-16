import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Feather';
import i18n from '../../../core/i18n';
import GradientBackground from '../../../components/GradientBackground';
import GlassCard from '../../../components/GlassCard';
import { theme } from '../../../core/theme';
import SOSService from '../../sos/services/SOSService';
import OnboardingService from '../../onboarding/services/OnboardingService';

const LANGUAGES = [
  { code: 'en', label: 'English',    native: 'English'    },
  { code: 'ta', label: 'Tamil',      native: 'தமிழ்'      },
  { code: 'hi', label: 'Hindi',      native: 'हिन्दी'     },
  { code: 'te', label: 'Telugu',     native: 'తెలుగు'     },
  { code: 'ml', label: 'Malayalam',  native: 'മലയാളം'     },
  { code: 'kn', label: 'Kannada',    native: 'ಕನ್ನಡ'      },
];

const PORTS = [
  { id: 'chennai',        label: 'Chennai'        },
  { id: 'visakhapatnam', label: 'Visakhapatnam' },
  { id: 'kochi',          label: 'Kochi'          },
  { id: 'mumbai',         label: 'Mumbai'         },
  { id: 'tuticorin',      label: 'Tuticorin'      },
  { id: 'mangalore',      label: 'Mangalore'      },
];

const GPS_INTERVALS   = [5, 10, 30, 60];   // seconds
const BORDER_DISTS    = [3, 5, 10, 15];    // km
const ANCHOR_RADII    = [30, 50, 100, 200]; // meters

const SettingsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();

  const [vesselName,   setVesselName]   = useState('');
  const [homePort,     setHomePort]     = useState('chennai');
  const [selectedLang, setSelectedLang] = useState(i18n.language.split('-')[0]);
  const [contactCount, setContactCount] = useState(0);
  const [portModal,    setPortModal]    = useState(false);
  const [gpsInterval,  setGpsInterval]  = useState(5);
  const [borderDist,   setBorderDist]   = useState(5);
  const [anchorRadius, setAnchorRadius] = useState(50);
  const [saved,        setSaved]        = useState(false);

  const load = useCallback(async () => {
    const data = await OnboardingService.getSetupData();
    setVesselName(data.vesselName ?? '');
    setHomePort(data.homePort ?? 'chennai');
    const lang = await AsyncStorage.getItem('@mg_language');
    if (lang) setSelectedLang(lang);
    const contacts = await SOSService.getEmergencyContacts();
    setContactCount(contacts.length);
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveVessel = async () => {
    await AsyncStorage.setItem('@mg_vessel_name', vesselName.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const changeLanguage = async (code: string) => {
    setSelectedLang(code);
    await i18n.changeLanguage(code);
    await AsyncStorage.setItem('@mg_language', code);
  };

  const selectPort = async (portId: string) => {
    setHomePort(portId);
    await AsyncStorage.setItem('@mg_home_port', portId);
    setPortModal(false);
  };

  const confirmReset = () => {
    Alert.alert(
      t('settings.resetApp'),
      'All saved data will be cleared and onboarding will restart.',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.resetApp'),
          style: 'destructive',
          onPress: () => OnboardingService.resetOnboarding(),
        },
      ],
    );
  };

  const portLabel = PORTS.find(p => p.id === homePort)?.label ?? homePort;

  return (
    <GradientBackground>
      <View style={styles.header}>
        <Icon name="sliders" size={20} color={theme.colors.primary} />
        <Text style={styles.title}>{t('settings.title')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Profile ───────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>{t('settings.profile').toUpperCase()}</Text>
        <GlassCard style={styles.card}>
          <View style={styles.rowLabel}>
            <Icon name="anchor" size={14} color={theme.colors.primary} />
            <Text style={styles.fieldLabel}>{t('settings.vesselName')}</Text>
          </View>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="e.g. Murugan 01"
              placeholderTextColor="#5A6380"
              value={vesselName}
              onChangeText={setVesselName}
              autoCapitalize="words"
            />
            <TouchableOpacity style={styles.saveBtn} onPress={saveVessel}>
              <Text style={styles.saveBtnText}>{saved ? '✓' : t('common.save')}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.rowLabel, { marginTop: 16 }]}>
            <Icon name="map-pin" size={14} color={theme.colors.primary} />
            <Text style={styles.fieldLabel}>{t('settings.homePort')}</Text>
          </View>
          <TouchableOpacity style={styles.portPicker} onPress={() => setPortModal(true)}>
            <Text style={styles.portPickerText}>{portLabel}</Text>
            <Icon name="chevron-down" size={16} color="#8892B0" />
          </TouchableOpacity>
        </GlassCard>

        {/* ── Language ──────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>{t('settings.language').toUpperCase()}</Text>
        <GlassCard style={styles.card}>
          {LANGUAGES.map((lang, idx) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.langRow,
                idx === LANGUAGES.length - 1 && { borderBottomWidth: 0 },
              ]}
              onPress={() => changeLanguage(lang.code)}
            >
              <View>
                <Text style={styles.langNative}>{lang.native}</Text>
                <Text style={styles.langEnglish}>{lang.label}</Text>
              </View>
              <View style={[styles.radio, selectedLang === lang.code && styles.radioActive]}>
                {selectedLang === lang.code && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          ))}
        </GlassCard>

        {/* ── Safety Settings ───────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>{t('settings.safety').toUpperCase()}</Text>
        <GlassCard style={styles.card}>
          <Text style={styles.fieldLabel}>{t('settings.gpsInterval')}</Text>
          <View style={styles.segmented}>
            {GPS_INTERVALS.map(v => (
              <TouchableOpacity
                key={v}
                style={[styles.seg, gpsInterval === v && styles.segActive]}
                onPress={() => setGpsInterval(v)}
              >
                <Text style={[styles.segText, gpsInterval === v && styles.segTextActive]}>
                  {v}s
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 18 }]}>{t('settings.borderDistance')}</Text>
          <View style={styles.segmented}>
            {BORDER_DISTS.map(v => (
              <TouchableOpacity
                key={v}
                style={[styles.seg, borderDist === v && styles.segActive]}
                onPress={() => setBorderDist(v)}
              >
                <Text style={[styles.segText, borderDist === v && styles.segTextActive]}>
                  {v}km
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 18 }]}>{t('settings.anchorRadius')}</Text>
          <View style={styles.segmented}>
            {ANCHOR_RADII.map(v => (
              <TouchableOpacity
                key={v}
                style={[styles.seg, anchorRadius === v && styles.segActive]}
                onPress={() => setAnchorRadius(v)}
              >
                <Text style={[styles.segText, anchorRadius === v && styles.segTextActive]}>
                  {v}m
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </GlassCard>

        {/* ── Emergency Contacts ────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>{t('settings.emergencyContacts').toUpperCase()}</Text>
        <GlassCard style={styles.card}>
          <View style={styles.contactsRow}>
            <View>
              <Text style={styles.contactCount}>{contactCount}</Text>
              <Text style={styles.contactCountLabel}>{t('settings.emergencyContacts')}</Text>
            </View>
            <TouchableOpacity
              style={styles.manageBtn}
              onPress={() => navigation.navigate('SOS')}
            >
              <Text style={styles.manageBtnText}>{t('settings.manageContacts')}</Text>
              <Icon name="chevron-right" size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* ── About ─────────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>{t('settings.about').toUpperCase()}</Text>
        <GlassCard style={styles.card}>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>{t('settings.version')}</Text>
            <Text style={styles.aboutValue}>2.0.0</Text>
          </View>
          <View style={[styles.aboutRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.aboutLabel}>Build</Text>
            <Text style={styles.aboutValue}>Offline-First</Text>
          </View>
        </GlassCard>

        <TouchableOpacity style={styles.resetBtn} onPress={confirmReset}>
          <Icon name="trash-2" size={16} color={theme.colors.danger} />
          <Text style={styles.resetText}>{t('settings.resetApp')}</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Port Picker Modal */}
      <Modal visible={portModal} transparent animationType="slide">
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setPortModal(false)}
        >
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t('settings.homePort')}</Text>
            {PORTS.map((p, idx) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.sheetOption, idx === PORTS.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => selectPort(p.id)}
              >
                <Text style={[
                  styles.sheetOptionText,
                  homePort === p.id && styles.sheetOptionActive,
                ]}>
                  {p.label}
                </Text>
                {homePort === p.id && (
                  <Icon name="check" size={16} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 16 },
  sectionLabel: {
    color: '#5A6380',
    fontSize: 11,
    letterSpacing: 1.5,
    marginTop: 20,
    marginBottom: 8,
  },
  card: { padding: 16 },
  rowLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  fieldLabel: { color: '#8892B0', fontSize: 13 },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 15,
  },
  saveBtn: {
    backgroundColor: 'rgba(0,212,170,0.12)',
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(0,212,170,0.4)',
  },
  saveBtnText: { color: theme.colors.primary, fontWeight: '700', fontSize: 14 },
  portPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  portPickerText: { color: '#FFFFFF', fontSize: 15 },
  // Language
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderBottomWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  langNative: { color: '#FFFFFF', fontSize: 15, fontWeight: '500' },
  langEnglish: { color: '#5A6380', fontSize: 12, marginTop: 1 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#5A6380',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: theme.colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.primary },
  // Safety segmented
  segmented: { flexDirection: 'row', gap: 6 },
  seg: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  segActive: {
    backgroundColor: 'rgba(0,212,170,0.15)',
    borderColor: theme.colors.primary,
  },
  segText: { color: '#5A6380', fontSize: 13, fontWeight: '500' },
  segTextActive: { color: theme.colors.primary, fontWeight: '700' },
  // Contacts
  contactsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  contactCount: { color: theme.colors.primary, fontSize: 36, fontWeight: '700' },
  contactCountLabel: { color: '#8892B0', fontSize: 12, marginTop: 2 },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,212,170,0.1)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(0,212,170,0.3)',
  },
  manageBtnText: { color: theme.colors.primary, fontSize: 14, fontWeight: '600' },
  // About
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  aboutLabel: { color: '#8892B0', fontSize: 14 },
  aboutValue: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  // Reset
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,71,87,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,71,87,0.4)',
  },
  resetText: { color: theme.colors.danger, fontSize: 14, fontWeight: '600' },
  // Port modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#111D35',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    borderTopWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sheetTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', marginBottom: 16 },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  sheetOptionText: { color: '#8892B0', fontSize: 15 },
  sheetOptionActive: { color: theme.colors.primary, fontWeight: '600' },
});

export default SettingsScreen;
