import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { getTrackingData } from '../services/apiService';
import { joinTrip, onLocationUpdate } from '../services/socketService';
import './TrackingMap.css';

const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const KARACHI_CENTER = [24.8607, 67.0011];
const DEFAULT_ZOOM = 15;

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const createPulsingDotIcon = () =>
  L.divIcon({
    html: `<div class="pulsing-dot">
      <div class="dot"></div>
      <div class="pulse"></div>
    </div>`,
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });

const getCoordinates = (location) => {
  if (!location) return null;

  const lat = parseFloat(location.latitude ?? location.lat ?? location[0]);
  const lng = parseFloat(location.longitude ?? location.lng ?? location[1]);

  if (isNaN(lat) || isNaN(lng)) return null;

  return {
    lat,
    lng,
    timestamp: location.timestamp ?? new Date().toISOString(),
  };
};

const filterAndSortLocations = (locations) => {
  const unique = locations.filter((loc, index, arr) => {
    return index === arr.findIndex(
      (l) => Math.abs(l.lat - loc.lat) < 0.00001 && Math.abs(l.lng - loc.lng) < 0.00001
    );
  });

  return unique.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
};

const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const computeStats = (locs) => {
  if (locs.length <= 1) {
    return { totalDistance: 0, journeyTime: 0, startTime: null };
  }

  let totalDistance = 0;
  for (let i = 0; i < locs.length - 1; i++) {
    totalDistance += calculateDistance(
      locs[i].lat,
      locs[i].lng,
      locs[i + 1].lat,
      locs[i + 1].lng
    );
  }

  const firstTime = new Date(locs[0].timestamp);
  const lastTime = new Date(locs[locs.length - 1].timestamp);

  return {
    totalDistance: totalDistance.toFixed(2),
    journeyTime: ((lastTime - firstTime) / (1000 * 60 * 60)).toFixed(2),
    startTime: firstTime,
  };
};

const MapController = ({ driverLocation }) => {
  const map = useMap();

  useEffect(() => {
    if (driverLocation) {
      map.setView([driverLocation.lat, driverLocation.lng], DEFAULT_ZOOM, {
        animate: true,
        duration: 0.8,
      });
    }
  }, [driverLocation, map]);

  return null;
};

const LoadingScreen = ({ message = 'Loading map...' }) => {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="inline-block">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-6"></div>
        </div>
        <p className="text-slate-700 font-semibold text-lg">{message}</p>
      </div>
    </div>
  );
};

const TrackingMap = ({ trackingId, customerName, driverName }) => {
  const [driverLocation, setDriverLocation] = useState(null);
  const [pathHistory, setPathHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [waitingForData, setWaitingForData] = useState(false);
  const [stats, setStats] = useState({ totalDistance: 0, journeyTime: 0, startTime: null });
  const [tripStatus, setTripStatus] = useState(null);
  const [isLinkCopied, setIsLinkCopied] = useState(false);

  const isTripCompletedRef = useRef(false);
  const carIcon = useMemo(() => createPulsingDotIcon(), []);

  useEffect(() => {
    setPathHistory([]);
    setDriverLocation(null);
    setLoading(true);
    setWaitingForData(false);
    setStats({ totalDistance: 0, journeyTime: 0, startTime: null });
    setTripStatus(null);
    isTripCompletedRef.current = false;
  }, [trackingId]);

  const handleShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setIsLinkCopied(true);
      setTimeout(() => setIsLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const tripDataResponse = await getTrackingData(trackingId);
        const initialStatus = tripDataResponse?.status?.toLowerCase();

        if (initialStatus) {
          setTripStatus(initialStatus);
          if (initialStatus === 'completed' || initialStatus === 'done') {
            isTripCompletedRef.current = true;
          }
        }

        const initialHistory = Array.isArray(tripDataResponse.locationHistory)
          ? tripDataResponse.locationHistory.map(getCoordinates).filter(Boolean)
          : [];

        const filteredHistory = filterAndSortLocations(initialHistory);
        setPathHistory(filteredHistory);
        setStats(computeStats(filteredHistory));

        if (tripDataResponse.location) {
          const latest = getCoordinates(tripDataResponse.location);
          if (latest) {
            setDriverLocation(latest);
            setWaitingForData(false);
          } else if (filteredHistory.length > 0) {
            setDriverLocation(filteredHistory[filteredHistory.length - 1]);
            setWaitingForData(false);
          } else {
            setWaitingForData(true);
          }
        } else if (filteredHistory.length > 0) {
          setDriverLocation(filteredHistory[filteredHistory.length - 1]);
          setWaitingForData(false);
        } else {
          setWaitingForData(true);
        }
      } catch (error) {
        console.error('Error fetching initial tracking data:', error);
        setWaitingForData(true);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
    joinTrip(trackingId);

    const unsubscribe = onLocationUpdate((data) => {
      if (data.trackingId !== trackingId) return;

      if (data.tripStatus === 'completed' || data.tripStatus === 'done') {
        setTripStatus(data.tripStatus);
        isTripCompletedRef.current = true;
        return;
      }

      if (isTripCompletedRef.current) return;

      const coords = getCoordinates(data);
      if (!coords) return;

      setTripStatus(data.tripStatus || 'active');
      setDriverLocation(coords);
      setWaitingForData(false);

      setPathHistory((prev) => {
        if (prev.length > 0) {
          const lastCoord = prev[prev.length - 1];
          const lastTimestamp = new Date(lastCoord.timestamp).getTime();
          const newTimestamp = new Date(coords.timestamp).getTime();

          if (newTimestamp <= lastTimestamp) return prev;

          const distanceKm = calculateDistance(
            lastCoord.lat,
            lastCoord.lng,
            coords.lat,
            coords.lng
          );

          if (distanceKm * 1000 < 2) return prev;
        }

        const updated = [...prev, coords];
        setStats(computeStats(updated));
        return updated;
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
      isTripCompletedRef.current = false;
    };
  }, [trackingId]);

  if (loading) return <LoadingScreen message="Loading map..." />;
  if (!driverLocation && waitingForData) {
    return <LoadingScreen message="Waiting for driver location..." />;
  }
  if (!driverLocation) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-indigo-100">
        <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-md text-center border border-slate-200">
          <div className="text-6xl mb-4">📍</div>
          <p className="text-slate-700 font-semibold text-lg">No location data available</p>
        </div>
      </div>
    );
  }

  const markerPosition = [driverLocation.lat, driverLocation.lng];
  const polylinePositions = pathHistory.map(({ lat, lng }) => [lat, lng]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-blue-50 to-slate-100 py-6 md:py-10">
      <div className="max-w-7xl mx-auto px-4 space-y-5">
        <div className="rounded-3xl overflow-hidden border border-white/70 bg-white/90 backdrop-blur shadow-xl shadow-slate-200/50">
          <div className="px-6 md:px-8 py-6 bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-700 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-blue-100 text-xs uppercase tracking-[0.2em] font-bold mb-2">
                Live Delivery Tracking
              </p>
              <h1 className="text-white font-black text-2xl md:text-3xl leading-tight">
                Track Your Delivery
              </h1>
              <p className="text-blue-100 text-sm mt-2">
                Real-time movement, route history, and status updates
              </p>
            </div>

            <div
              className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wide border ${
                tripStatus === 'active' || tripStatus === 'in-progress'
                  ? 'bg-white/15 text-white border-white/20'
                  : tripStatus === 'completed'
                  ? 'bg-emerald-400/15 text-emerald-50 border-emerald-300/20'
                  : tripStatus === 'cancelled'
                  ? 'bg-rose-400/15 text-rose-50 border-rose-300/20'
                  : 'bg-amber-300/15 text-amber-50 border-amber-200/20'
              }`}
            >
              {tripStatus ? tripStatus.toUpperCase() : 'PENDING'}
            </div>
          </div>

          <div className="px-6 md:px-8 py-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-2">
                Driver
              </p>
              <p className="font-black text-slate-900 text-lg">{driverName || 'Unknown Driver'}</p>
            </div>

            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-2">
                Customer
              </p>
              <p className="font-black text-slate-900 text-lg">{customerName || 'Unknown Customer'}</p>
            </div>

            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-2">
                Tracking ID
              </p>
              <p className="font-mono text-xs text-slate-600 break-all">
                {trackingId}
              </p>
            </div>
          </div>
        </div>

        <div className="relative rounded-3xl shadow-2xl overflow-hidden border border-white/70 h-[62vh] bg-white">
          <MapContainer
            center={KARACHI_CENTER}
            zoom={DEFAULT_ZOOM}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              url={OSM_TILE_URL}
              attribution="&copy; OpenStreetMap contributors"
              maxZoom={19}
            />

            <MapController driverLocation={driverLocation} />

            <Marker position={markerPosition} icon={carIcon}>
              <Popup>
                <div className="text-sm">
                  <strong className="block mb-2">🚗 Driver Location</strong>
                  <p>
                    <strong>Latitude:</strong> {driverLocation.lat.toFixed(6)}
                  </p>
                  <p>
                    <strong>Longitude:</strong> {driverLocation.lng.toFixed(6)}
                  </p>
                  {driverLocation.timestamp && (
                    <p className="text-xs text-gray-600 mt-2">
                      {new Date(driverLocation.timestamp).toLocaleString()}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>

            {polylinePositions.length > 1 && (
              <Polyline
                positions={polylinePositions}
                pathOptions={{
                  color: '#2563eb',
                  weight: 5,
                  opacity: 0.9,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            )}
          </MapContainer>

          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-[999] pointer-events-auto">
            <button
              onClick={handleShareLink}
              className={`flex items-center gap-2.5 px-6 py-3.5 rounded-full font-bold text-sm shadow-2xl transition-all duration-300 active:scale-95 ${
                isLinkCopied
                  ? 'bg-emerald-500 text-white scale-105'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200'
              }`}
            >
              {isLinkCopied ? 'Copied!' : 'Share Live Location'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-3xl p-6 bg-white border border-white/80 shadow-lg">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3">
              Distance
            </p>
            <p className="text-4xl font-black text-slate-900">{stats.totalDistance}</p>
            <p className="text-sm text-slate-500 mt-1">Kilometers covered</p>
          </div>

          <div className="rounded-3xl p-6 bg-white border border-white/80 shadow-lg">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3">
              Duration
            </p>
            <p className="text-4xl font-black text-slate-900">{stats.journeyTime}</p>
            <p className="text-sm text-slate-500 mt-1">Hours on route</p>
          </div>

          <div className="rounded-3xl p-6 bg-white border border-white/80 shadow-lg">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3">
              Waypoints
            </p>
            <p className="text-4xl font-black text-slate-900">{pathHistory.length}</p>
            <p className="text-sm text-slate-500 mt-1">Saved route points</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackingMap;