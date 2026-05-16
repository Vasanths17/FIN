import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import MapLibreGL from '@maplibre/maplibre-react-native';
import * as turf from '@turf/turf';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import GradientBackground from '../../../components/GradientBackground';
import GlassCard from '../../../components/GlassCard';
import HotspotService, { HotspotData } from '../services/HotspotService';
import { theme } from '../../../core/theme';

MapLibreGL.setAccessToken(null);
const MAP_STYLE = 'https://demotiles.maplibre.org/style.json';

const DEMO_LAT = 12.5;
const DEMO_LNG = 69.43;

const CATCH_TYPES = ['Tuna', 'Mackerel', 'Sardine', 'Prawns', 'Crab', 'Other'] as const;
type CatchType = typeof CATCH_TYPES[number];

const CATCH_COLORS: Record<string, string> = {
  Tuna:    '#FF6B6B',
  Mackerel:'#4ECDC4',
  Sardine: '#45B7D1',
  Prawns:  '#F7B731',
  Crab:    '#FC5C65',
  Other:   '#A55EEA',
};

const FILTERS = ['All', ...CATCH_TYPES] as const;

const toMariner = (val: number, isLat: boolean) => {
  const abs = Math.abs(val);
  const deg = Math.floor(abs);
  const min = ((abs - deg) * 60).toFixed(2);
  const dir = isLat ? (val >= 0 ? 'N' : 'S') : val >= 0 ? 'E' : 'W';
  return `${deg}°${min}'${dir}`;
};

const StarRating: React.FC<{ rating: number; onRate?: (r: number) => void }> = ({ rating, onRate }) => (
  <View style={{ flexDirection: 'row', gap: 4 }}>
    {[1, 2, 3, 4, 5].map(s => (
      <TouchableOpacity key={s} onPress={() => onRate?.(s)} disabled={!onRate}>
        <Icon name="star" size={18} color={s <= rating ? '#F7B731' : '#2A3560'} />
      </TouchableOpacity>
    ))}
  </View>
);

const HotspotScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const cameraRef = useRef<MapLibreGL.Camera>(null);

  const [hotspots, setHotspots] = useState<HotspotData[]>([]);
  const [filter, setFilter] = useState<string>('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotData | null>(null);

  // Add modal form state
  const [newLat, setNewLat] = useState(DEMO_LAT);
  const [newLng, setNewLng] = useState(DEMO_LNG);
  const [newCatchType, setNewCatchType] = useState<CatchType>('Tuna');
  const [newRating, setNewRating] = useState(3);
  const [newNotes, setNewNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadHotspots = useCallback(async () => {
    const spots = await HotspotService.getHotspots();
    setHotspots(spots);
  }, []);

  useEffect(() => { loadHotspots(); }, [loadHotspots]);

  const filtered = useMemo(() =>
    filter === 'All' ? hotspots : hotspots.filter(h => h.catchType === filter),
    [hotspots, filter],
  );

  // GeoJSON feature collection for map markers
  const featureCollection = useMemo(() => turf.featureCollection(
    filtered.map(h =>
      turf.point([h.lng, h.lat], { id: h.id, catchType: h.catchType }),
    ),
  ), [filtered]);

  const openAddModal = (lat = DEMO_LAT, lng = DEMO_LNG) => {
    setNewLat(lat);
    setNewLng(lng);
    setNewCatchType('Tuna');
    setNewRating(3);
    setNewNotes('');
    setShowAddModal(true);
  };

  const handleMapLongPress = useCallback((e: any) => {
    const [lng, lat] = e.geometry.coordinates;
    openAddModal(lat, lng);
    cameraRef.current?.setCamera({
      centerCoordinate: [lng, lat],
      animationDuration: 400,
    });
  }, []);

  const handleMarkerPress = useCallback((e: any) => {
    const props = e.features?.[0]?.properties;
    if (props?.id) {
      const spot = hotspots.find(h => h.id === props.id);
      if (spot) setSelectedHotspot(spot);
    }
  }, [hotspots]);

  const saveHotspot = async () => {
    setSaving(true);
    try {
      await HotspotService.addHotspot(newLat, newLng, newCatchType, newNotes.trim(), newRating);
      await loadHotspots();
      setShowAddModal(false);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (hotspot: HotspotData) => {
    Alert.alert(
      t('hotspot.save'),
      `Delete "${hotspot.catchType}" spot?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await HotspotService.deleteHotspot(hotspot.id);
            await loadHotspots();
            setSelectedHotspot(null);
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
        <Text style={styles.title}>{t('hotspot.title')}</Text>
        <TouchableOpacity onPress={() => openAddModal()} style={styles.addBtn}>
          <Icon name="plus" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]}>
        {/* ── Map ───────────────────────────────────────────────────────────── */}
        <View style={styles.mapWrap}>
          <MapLibreGL.MapView
            style={StyleSheet.absoluteFill}
            styleURL={MAP_STYLE}
            attributionEnabled={false}
            logoEnabled={false}
            pitchEnabled={false}
            onLongPress={handleMapLongPress}
          >
            <MapLibreGL.Camera
              ref={cameraRef}
              centerCoordinate={[DEMO_LNG, DEMO_LAT]}
              zoomLevel={7}
              animationMode="flyTo"
              animationDuration={0}
            />

            {featureCollection.features.length > 0 && (
              <MapLibreGL.ShapeSource
                id="hotspots-src"
                shape={featureCollection}
                onPress={handleMarkerPress}
              >
                {/* @ts-ignore */}
                <MapLibreGL.CircleLayer
                  id="hotspot-circles"
                  style={{
                    circleRadius: 10,
                    circleColor: [
                      'match', ['get', 'catchType'],
                      'Tuna',    '#FF6B6B',
                      'Mackerel','#4ECDC4',
                      'Sardine', '#45B7D1',
                      'Prawns',  '#F7B731',
                      'Crab',    '#FC5C65',
                      '#A55EEA',
                    ],
                    circleStrokeWidth: 2,
                    circleStrokeColor: '#FFFFFF',
                    circleOpacity: 0.9,
                  }}
                />
              </MapLibreGL.ShapeSource>
            )}
          </MapLibreGL.MapView>

          <View style={styles.mapHint}>
            <Text style={styles.mapHintText}>Long-press map to add spot</Text>
          </View>
        </View>

        {/* ── Filter chips ────────────────────────────────────────────────── */}
        <View style={styles.filterOuter}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
            {FILTERS.map(f => (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={[
                  styles.filterChip,
                  filter === f && { backgroundColor: `${CATCH_COLORS[f] ?? theme.colors.primary}25`, borderColor: CATCH_COLORS[f] ?? theme.colors.primary },
                ]}
              >
                {f !== 'All' && (
                  <View style={[styles.filterDot, { backgroundColor: CATCH_COLORS[f] }]} />
                )}
                <Text style={[styles.filterChipText, filter === f && { color: CATCH_COLORS[f] ?? theme.colors.primary, fontWeight: '700' }]}>
                  {f === 'All' ? 'All' : t(`hotspot.catches.${f.toLowerCase()}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Hotspot list ─────────────────────────────────────────────────── */}
        <View style={styles.listWrap}>
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="map-pin" size={48} color="#2A3560" />
              <Text style={styles.emptyText}>{t('hotspot.noSpots')}</Text>
              <Text style={styles.emptyHint}>{t('hotspot.dropPin')}</Text>
            </View>
          ) : (
            filtered.map(spot => (
              <GlassCard key={spot.id} style={styles.spotCard}>
                <View style={styles.spotTop}>
                  <View style={[styles.catchBadge, { backgroundColor: `${CATCH_COLORS[spot.catchType]}20`, borderColor: CATCH_COLORS[spot.catchType] }]}>
                    <Text style={[styles.catchBadgeText, { color: CATCH_COLORS[spot.catchType] }]}>
                      {t(`hotspot.catches.${spot.catchType.toLowerCase()}`)}
                    </Text>
                  </View>
                  <Text style={styles.spotDate}>
                    {spot.createdAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </Text>
                  <TouchableOpacity onPress={() => confirmDelete(spot)} style={styles.deleteBtn}>
                    <Icon name="trash-2" size={14} color={theme.colors.danger} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.spotCoord}>
                  {toMariner(spot.lat, true)}  {toMariner(spot.lng, false)}
                </Text>
                {spot.notes ? <Text style={styles.spotNotes} numberOfLines={2}>{spot.notes}</Text> : null}
                <StarRating rating={spot.rating} />
              </GlassCard>
            ))
          )}
          <View style={{ height: 80 }} />
        </View>
      </ScrollView>

      {/* ── FAB ──────────────────────────────────────────────────────────────── */}
      <TouchableOpacity style={styles.fab} onPress={() => openAddModal()}>
        <Icon name="map-pin" size={22} color="#0B1426" />
      </TouchableOpacity>

      {/* ── Add spot modal ──────────────────────────────────────────────────── */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayDismiss} onPress={() => setShowAddModal(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{t('hotspot.save')}</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Icon name="x" size={22} color="#8892B0" />
              </TouchableOpacity>
            </View>

            <Text style={styles.coordPreview}>
              {toMariner(newLat, true)}  {toMariner(newLng, false)}
            </Text>

            <Text style={styles.fieldLabel}>{t('hotspot.catchType')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catchScroll} contentContainerStyle={{ gap: 8 }}>
              {CATCH_TYPES.map(ct => (
                <TouchableOpacity
                  key={ct}
                  onPress={() => setNewCatchType(ct)}
                  style={[
                    styles.catchChip,
                    newCatchType === ct && { backgroundColor: `${CATCH_COLORS[ct]}20`, borderColor: CATCH_COLORS[ct] },
                  ]}
                >
                  <View style={[styles.catchDot, { backgroundColor: CATCH_COLORS[ct] }]} />
                  <Text style={[styles.catchChipText, newCatchType === ct && { color: CATCH_COLORS[ct], fontWeight: '700' }]}>
                    {t(`hotspot.catches.${ct.toLowerCase()}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>{t('hotspot.rating')}</Text>
            <StarRating rating={newRating} onRate={setNewRating} />

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>{t('hotspot.notes')}</Text>
            <TextInput
              style={styles.notesInput}
              placeholder={t('hotspot.addNotes')}
              placeholderTextColor="#5A6380"
              value={newNotes}
              onChangeText={setNewNotes}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={saveHotspot}
              disabled={saving}
            >
              <Text style={styles.saveBtnText}>{saving ? t('common.loading') : t('hotspot.save')}</Text>
            </TouchableOpacity>
            <View style={{ height: 16 }} />
          </View>
        </View>
      </Modal>

      {/* ── Spot detail popup ────────────────────────────────────────────────── */}
      {selectedHotspot && (
        <View style={styles.detailPopup}>
          <TouchableOpacity style={styles.detailClose} onPress={() => setSelectedHotspot(null)}>
            <Icon name="x" size={16} color="#8892B0" />
          </TouchableOpacity>
          <Text style={[styles.detailType, { color: CATCH_COLORS[selectedHotspot.catchType] }]}>
            {t(`hotspot.catches.${selectedHotspot.catchType.toLowerCase()}`)}
          </Text>
          <Text style={styles.detailCoord}>
            {toMariner(selectedHotspot.lat, true)}  {toMariner(selectedHotspot.lng, false)}
          </Text>
          <StarRating rating={selectedHotspot.rating} />
          {selectedHotspot.notes ? (
            <Text style={styles.detailNotes}>{selectedHotspot.notes}</Text>
          ) : null}
        </View>
      )}
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: { padding: 4 },
  addBtn: { padding: 4 },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', flex: 1 },
  mapWrap: {
    height: 250,
    backgroundColor: '#0a1628',
  },
  mapHint: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  mapHintText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  filterOuter: { backgroundColor: '#0B1426' },
  filterScroll: { paddingVertical: 10 },
  filterContent: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  filterDot: { width: 8, height: 8, borderRadius: 4 },
  filterChipText: { color: '#8892B0', fontSize: 13 },
  listWrap: { padding: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyText: { color: '#5A6380', fontSize: 15 },
  emptyHint: { color: '#3A4460', fontSize: 12 },
  spotCard: { padding: 14, marginBottom: 10 },
  spotTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  catchBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  catchBadgeText: { fontSize: 12, fontWeight: '600' },
  spotDate: { color: '#5A6380', fontSize: 12, flex: 1 },
  deleteBtn: { padding: 4 },
  spotCoord: { color: '#8892B0', fontSize: 12, fontFamily: 'monospace', marginBottom: 6 },
  spotNotes: { color: '#8892B0', fontSize: 13, marginBottom: 8, fontStyle: 'italic' },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  overlayDismiss: { flex: 1 },
  sheet: {
    backgroundColor: '#111D35',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    maxHeight: '85%',
    borderTopWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center', marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sheetTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  coordPreview: {
    color: theme.colors.primary,
    fontSize: 13,
    fontFamily: 'monospace',
    marginBottom: 16,
  },
  fieldLabel: {
    color: '#8892B0',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  catchScroll: { marginBottom: 16 },
  catchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  catchDot: { width: 8, height: 8, borderRadius: 4 },
  catchChipText: { color: '#8892B0', fontSize: 13 },
  notesInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 16,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  saveBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#0B1426', fontSize: 16, fontWeight: '700' },
  // Detail popup
  detailPopup: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#111D35',
    borderRadius: 16,
    padding: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  detailClose: { position: 'absolute', top: 12, right: 12 },
  detailType: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  detailCoord: { color: '#8892B0', fontSize: 12, fontFamily: 'monospace', marginBottom: 8 },
  detailNotes: { color: '#8892B0', fontSize: 13, marginTop: 8, fontStyle: 'italic' },
});

export default HotspotScreen;
