import React, { useState, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Fly to location when flyTo prop changes
const MapController = ({ flyTo }) => {
  const map = useMap();
  React.useEffect(() => {
    if (flyTo) {
      map.flyTo(flyTo, 15, { duration: 1.2 });
    }
  }, [flyTo, map]);
  return null;
};

const ClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => onMapClick(e.latlng),
  });
  return null;
};

const LocationPickerMap = ({ onSelect, externalCoords }) => {
  const [marker, setMarker] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [flyTo, setFlyTo] = useState(null);

  React.useEffect(() => {
    if (externalCoords?.lat && externalCoords?.lng) {
      setMarker([externalCoords.lat, externalCoords.lng]);
      setFlyTo([externalCoords.lat, externalCoords.lng]);
    }
  }, [externalCoords?.lat, externalCoords?.lng]);

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await res.json();
      return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  };

  const handleMapClick = useCallback(async (latlng) => {
    const { lat, lng } = latlng;
    setMarker([lat, lng]);
    const address = await reverseGeocode(lat, lng);
    onSelect(address, { lat, lng });
  }, [onSelect]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(searchQuery + ', Karachi, Pakistan')}`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = Number(data[0].lat);
        const lng = Number(data[0].lon);
        setMarker([lat, lng]);
        setFlyTo([lat, lng]);
        onSelect(data[0].display_name, { lat, lng });
      }
    } catch {
      // silent fail
    } finally {
      setSearching(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleSearch();
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden mt-1">
      <div className="flex gap-2 p-2 bg-slate-50 border-b border-slate-200">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search area... (e.g. Gulshan, Korangi, Landhi)"
          className="flex-1 p-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50"
        >
          {searching ? '...' : 'Search'}
        </button>
      </div>

      <MapContainer
        center={[24.8607, 67.0011]}
        zoom={12}
        style={{ height: '220px', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="© OpenStreetMap"
        />
        <MapController flyTo={flyTo} />
        <ClickHandler onMapClick={handleMapClick} />
        {marker && <Marker position={marker} icon={markerIcon} />}
      </MapContainer>

      <p className="text-xs text-slate-400 text-center py-1 bg-slate-50">
        Click on map or search above — address will be auto filled
      </p>
    </div>
  );
};

export default LocationPickerMap;
