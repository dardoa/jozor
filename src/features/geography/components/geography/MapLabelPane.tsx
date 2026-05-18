import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

export const MapLabelPane = () => {
  const map = useMap();

  useEffect(() => {
    if (!map.getPane('journey-labels')) {
      map.createPane('journey-labels');
    }

    const pane = map.getPane('journey-labels');
    if (pane) {
      pane.style.zIndex = '450';
      pane.style.pointerEvents = 'none';
    }
  }, [map]);

  return null;
};
