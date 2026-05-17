import React, { useMemo } from 'react';
import { ShapeSource, LineLayer } from '@maplibre/maplibre-react-native';

const eezData = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    properties: { name: 'India EEZ Boundary' },
    geometry: {
      type: 'LineString',
      coordinates: [
        [66.5, 23.8], [66.2, 23.4], [66.0, 23.0], [65.7, 22.5], [65.5, 22.0],
        [65.3, 21.5], [65.2, 21.0], [65.1, 20.5], [65.0, 20.0], [65.0, 19.5],
        [65.1, 19.0], [65.3, 18.5], [65.5, 18.0], [65.8, 17.5], [66.1, 17.0],
        [66.5, 16.5], [66.9, 16.0], [67.3, 15.5], [67.8, 15.0], [68.2, 14.5],
        [68.6, 14.0], [68.9, 13.5], [69.2, 13.0], [69.4, 12.5], [69.5, 12.0],
        [69.5, 11.5], [69.4, 11.0], [69.3, 10.5], [69.1, 10.0], [68.9, 9.5],
        [68.6, 9.0], [68.3, 8.5], [68.0, 8.2], [77.4, 4.9], [78.0, 5.2],
        [78.5, 5.5], [79.0, 6.0], [79.5, 6.5], [80.0, 7.0], [80.5, 7.5],
        [81.0, 8.0], [81.5, 8.5], [82.0, 9.0], [82.5, 9.5], [83.0, 10.0],
        [83.5, 10.5], [84.0, 11.0], [84.5, 11.5], [85.0, 12.0], [85.5, 12.5],
        [86.0, 13.0], [86.5, 13.5], [87.0, 14.0], [87.5, 14.5], [88.0, 15.0],
        [88.3, 15.5], [88.5, 16.0], [88.7, 16.5], [88.8, 17.0], [88.9, 17.5],
        [89.0, 18.0], [89.0, 18.5], [89.0, 19.0], [89.0, 19.5], [89.0, 20.0],
        [89.17, 21.0],
      ],
    },
  }],
};

const EEZ_LINE_STYLE = {
  lineColor: '#FF4757',
  lineWidth: 2,
  lineOpacity: 0.7,
  lineDasharray: [6, 3],
};

const BorderAlertOverlay: React.FC = () => {
  // Memoize so the shape reference is stable
  const shape = useMemo(() => eezData, []);

  return (
    <ShapeSource id="eez-boundary-source" shape={shape}>
      <LineLayer id="eez-boundary-line" style={EEZ_LINE_STYLE} />
    </ShapeSource>
  );
};

export default BorderAlertOverlay;
