export const mapStyles = `
  .leaflet-container {
    background: #f4f4f4 !important;
    font-family: 'Merriweather', Georgia, serif;
  }
  .leaflet-tile-pane {
    filter: grayscale(1) brightness(1.08) contrast(0.9);
  }
  .leaflet-control-zoom { border: none !important; margin: 20px !important; }
  .leaflet-control-zoom-in, .leaflet-control-zoom-out {
    background: rgba(250, 248, 244, 0.96) !important;
    border: 1px solid rgba(197, 186, 168, 0.9) !important;
    color: #4c4438 !important;
    border-radius: 14px !important;
    margin-bottom: 8px !important;
    display: flex !important;
    align-items: center;
    justify-content: center;
    width: 40px !important;
    height: 40px !important;
    box-shadow: 0 16px 40px rgba(57, 52, 43, 0.12) !important;
  }
  .leaflet-control-zoom-in:hover, .leaflet-control-zoom-out:hover {
    background: #ffffff !important;
  }
  .leaflet-popup-content-wrapper {
    background: rgba(252, 250, 246, 0.98) !important;
    border: 1px solid rgba(196, 168, 130, 0.65) !important;
    color: #2c1810 !important;
    border-radius: 18px !important;
    padding: 0 !important;
    box-shadow: 0 24px 56px rgba(44, 24, 16, 0.18) !important;
  }
  .leaflet-popup-tip {
    background: rgba(252, 250, 246, 0.98) !important;
    box-shadow: none !important;
  }
  .cluster-marker {
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(145deg, #faf7f2 0%, #ece6dc 100%);
    color: #5b4632;
    border-radius: 50%;
    border: 1px solid rgba(196, 168, 130, 0.9);
    font-weight: 700;
    font-family: 'Merriweather', Georgia, serif;
    box-shadow: 0 20px 36px rgba(44, 24, 16, 0.16);
  }
  .journey-label-tiles {
    filter: grayscale(1) brightness(1.02) contrast(0.86);
    opacity: 0.38;
  }
`;
