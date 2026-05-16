import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import GradientBackground from '../../../components/GradientBackground';
import GlassCard from '../../../components/GlassCard';
import SOSService, { SOSContact } from '../services/SOSService';
import { theme } from '../../../core/theme';

const RELATIONSHIPS = ['Family', 'Friend', 'Coast Guard', 'Other'];

const EmergencyContactsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();

  const [contacts, setContacts] = useState<SOSContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('Family');
  const [isPrimary, setIsPrimary] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadContacts = useCallback(async () => {
    await SOSService.seedCoastGuard();
    const list = await SOSService.getEmergencyContacts();
    setContacts(list);
    setLoading(false);
  }, []);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  const openAddModal = () => {
    setName('');
    setPhone('');
    setRelationship('Family');
    setIsPrimary(false);
    setShowModal(true);
  };

  const saveContact = async () => {
    if (!name.trim() || !phone.trim()) return;
    setSaving(true);
    try {
      await SOSService.addContact(name.trim(), phone.trim(), relationship, isPrimary);
      await loadContacts();
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (contact: SOSContact) => {
    Alert.alert(
      t('sos.deleteContact'),
      contact.name,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await SOSService.deleteContact(contact.id);
            await loadContacts();
          },
        },
      ],
    );
  };

  return (
    <GradientBackground>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('sos.emergencyContacts')}</Text>
        <TouchableOpacity onPress={openAddModal} style={styles.addBtn}>
          <Icon name="plus" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      ) : contacts.length === 0 ? (
        <View style={styles.center}>
          <Icon name="users" size={52} color="#2A3560" />
          <Text style={styles.emptyText}>{t('sos.noContacts')}</Text>
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <GlassCard style={styles.contactCard}>
              <View style={styles.contactRow}>
                {item.isPrimary && (
                  <Icon name="star" size={14} color={theme.colors.warning} style={styles.starIcon} />
                )}
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{item.name}</Text>
                  <Text style={styles.contactPhone}>{item.phone}</Text>
                </View>
                <View style={styles.relBadge}>
                  <Text style={styles.relBadgeText}>{item.relationship}</Text>
                </View>
                <TouchableOpacity onPress={() => confirmDelete(item)} style={styles.deleteBtn}>
                  <Icon name="trash-2" size={16} color={theme.colors.danger} />
                </TouchableOpacity>
              </View>
              {item.isPrimary && (
                <Text style={styles.primaryBadge}>★ {t('sos.primaryContact')}</Text>
              )}
            </GlassCard>
          )}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <Icon name="user-plus" size={20} color="#0B1426" />
        <Text style={styles.fabText}>{t('sos.addContact')}</Text>
      </TouchableOpacity>

      {/* Add contact bottom sheet modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayDismiss} onPress={() => setShowModal(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{t('sos.addContact')}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Icon name="x" size={22} color="#8892B0" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>{t('sos.contactName')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('sos.contactName')}
                placeholderTextColor="#5A6380"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />

              <Text style={styles.fieldLabel}>{t('sos.contactPhone')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('sos.contactPhone')}
                placeholderTextColor="#5A6380"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />

              <Text style={styles.fieldLabel}>{t('sos.relationship')}</Text>
              <View style={styles.relChips}>
                {RELATIONSHIPS.map(rel => (
                  <TouchableOpacity
                    key={rel}
                    onPress={() => setRelationship(rel)}
                    style={[styles.relChip, relationship === rel && styles.relChipActive]}
                  >
                    <Text style={[styles.relChipText, relationship === rel && styles.relChipTextActive]}>
                      {rel}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.primaryRow}>
                <View>
                  <Text style={styles.primaryLabel}>{t('sos.primaryContact')}</Text>
                  <Text style={styles.primarySub}>{t('sos.primaryFirst')}</Text>
                </View>
                <Switch
                  value={isPrimary}
                  onValueChange={setIsPrimary}
                  trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(0,212,170,0.4)' }}
                  thumbColor={isPrimary ? theme.colors.primary : '#5A6380'}
                />
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, (!name.trim() || !phone.trim() || saving) && styles.saveBtnDisabled]}
                onPress={saveContact}
                disabled={!name.trim() || !phone.trim() || saving}
              >
                <Text style={styles.saveBtnText}>
                  {saving ? t('common.loading') : t('common.save')}
                </Text>
              </TouchableOpacity>
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: { padding: 4 },
  addBtn: { padding: 4 },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#8892B0', fontSize: 14 },
  emptyText: { color: '#5A6380', fontSize: 15, textAlign: 'center', marginTop: 8 },
  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 100, gap: 10 },
  contactCard: { padding: 14 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  starIcon: { marginRight: -2 },
  contactInfo: { flex: 1 },
  contactName: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  contactPhone: { color: theme.colors.primary, fontSize: 14, marginTop: 2 },
  relBadge: {
    backgroundColor: 'rgba(108,99,255,0.2)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  relBadgeText: { color: '#6C63FF', fontSize: 11, fontWeight: '600' },
  deleteBtn: { padding: 6 },
  primaryBadge: { color: theme.colors.warning, fontSize: 11, marginTop: 6 },
  fab: {
    position: 'absolute',
    bottom: 28,
    left: 20,
    right: 20,
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabText: { color: '#0B1426', fontSize: 16, fontWeight: '700' },
  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  overlayDismiss: { flex: 1 },
  sheet: {
    backgroundColor: '#111D35',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    maxHeight: '85%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sheetTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  fieldLabel: { color: '#8892B0', fontSize: 12, letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#FFFFFF',
    fontSize: 15,
    marginBottom: 18,
  },
  relChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  relChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  relChipActive: { backgroundColor: 'rgba(0,212,170,0.15)', borderColor: theme.colors.primary },
  relChipText: { color: '#8892B0', fontSize: 13 },
  relChipTextActive: { color: theme.colors.primary, fontWeight: '600' },
  primaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
  },
  primaryLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  primarySub: { color: '#8892B0', fontSize: 12, marginTop: 3 },
  saveBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#0B1426', fontSize: 16, fontWeight: '700' },
});

export default EmergencyContactsScreen;
