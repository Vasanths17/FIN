import React, { useMemo } from 'react';
import MapLibreGL from '@maplibre/maplibre-react-native';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const eezData = require('../../../assets/geojson/india_eez_boundary.geojson');

const EEZ_LINE_STYLE: MapLibreGL.LineLayerStyle = {
  lineColor: '#FF4757',
  lineWidth: 2,
  lineOpacity: 0.7,
  lineDasharray: [6, 3],
};

const BorderAlertOverlay: React.FC = () => {
  // Memoize so the shape reference is stable
  const shape = useMemo(() => eezData, []);

  return (
    <MapLibreGL.ShapeSource id="eez-boundary-source" shape={shape}>
      <MapLibreGL.LineLayer id="eez-boundary-line" style={EEZ_LINE_STYLE} />
    </MapLibreGL.ShapeSource>
  );
};

export default BorderAlertOverlay;
