import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { initSocket } from '../services/socketService';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const createDriverIcon = () =>
  L.divIcon({
    html: `<div style="
      width:18px;height:18px;
      background:#22c55e;
      border:3px solid white;
      border-radius:50%;
      box-shadow:0 0 0 4px rgba(34,197,94,0.35);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    className: '',
  });

const MapFollower = ({ coords }) => {
  const map = useMap();

  useEffect(() => {
    if (coords) {
      map.setView([coords.latitude, coords.longitude], 16, { animate: true });
    }
  }, [coords, map]);

  return null;
};

const DriverApp = () => {
  const { trackingId } = useParams();

  const [isTracking, setIsTracking] = useState(false);
  const [coords, setCoords] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [locationCount, setLocationCount] = useState(0);
  const [lastSent, setLastSent] = useState(null);
  const [tripId, setTripId] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [statusMsg, setStatusMsg] = useState('Server se connect ho raha hai...');
  const [linkCopied, setLinkCopied] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const socketRef = useRef(null);
  const watchIdRef = useRef(null);
  const wakeLockRef = useRef(null);
  const tripIdRef = useRef(null);
  const driverIcon = useRef(createDriverIcon());
  const isStartingRef = useRef(false);

  const customerLink = `${window.location.origin}/track/${trackingId}`;

  const copyCustomerLink = async () => {
    try {
      await navigator.clipboard.writeText(customerLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  useEffect(() => {
    const socket = initSocket();
    socketRef.current = socket;

    const onConnect = () => {
      setSocketConnected(true);
      setStatusMsg('Connected — trip join ho raha hai...');
      socket.emit('join-trip', { trackingId, role: 'driver' });
    };

    const onDisconnect = () => {
      setSocketConnected(false);
      setStatusMsg('Server se connection toot gaya');
    };

    const onRoomJoined = (data) => {
      if (data.success) {
        const parsed = parseInt(data.tripId, 10);
        setTripId(parsed);
        tripIdRef.current = parsed;
        setStatusMsg('Tayyar — START dabayein');
      } else {
        setStatusMsg(`Trip error: ${data.message}`);
      }
    };

    const onLocationSaved = () => {
      setLastSent(new Date());
    };

    const onLocationError = (data) => {
      setStatusMsg(data?.message || 'Location update failed');
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room-joined', onRoomJoined);
    socket.on('location-saved', onLocationSaved);
    socket.on('location-error', onLocationError);

    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room-joined', onRoomJoined);
      socket.off('location-saved', onLocationSaved);
      socket.off('location-error', onLocationError);
    };
  }, [trackingId]);

  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) return;

    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
    } catch (e) {
      console.warn('Wake lock failed:', e);
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch (e) {
        console.warn('Wake lock release failed:', e);
      }
      wakeLockRef.current = null;
    }
  }, []);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setIsTracking(false);
    setShowMap(!!coords);
    setStatusMsg('Tracking band ho gayi');
    isStartingRef.current = false;
    releaseWakeLock();
  }, [coords, releaseWakeLock]);

  const startTracking = useCallback(() => {
    if (isTracking || isStartingRef.current) return;

    if (!navigator.geolocation) {
      setGpsError('Geolocation browser me available nahi hai');
      return;
    }

    if (!tripIdRef.current) {
      setStatusMsg('Trip abhi load nahi hui');
      return;
    }

    isStartingRef.current = true;
    setGpsError(null);
    setIsTracking(true);
    setShowMap(true);
    setStatusMsg('GPS signal dhundh raha hai...');
    requestWakeLock();

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        setCoords({ latitude, longitude });
        setAccuracy(accuracy);
        setStatusMsg('LIVE location bhej raha hai...');
        setLocationCount((n) => n + 1);
        isStartingRef.current = false;

        if (socketRef.current && tripIdRef.current) {
          socketRef.current.emit('update-location', {
            latitude,
            longitude,
            tripId: tripIdRef.current,
            trackingId,
            timestamp: new Date().toISOString(),
          });
        }
      },
      (err) => {
        isStartingRef.current = false;
        setIsTracking(false);

        if (err.code === 1) {
          setGpsError('denied');
        } else if (err.code === 2) {
          setGpsError('Location unavailable. GPS ON karke dubara try karein.');
        } else if (err.code === 3) {
          setGpsError('Location request timeout. Open sky me dubara try karein.');
        } else {
          setGpsError(`GPS error: ${err.message}`);
        }

        setStatusMsg('GPS start nahi ho saka');
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 3000,
      }
    );
  }, [isTracking, trackingId, requestWakeLock]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      releaseWakeLock();
    };
  }, [releaseWakeLock]);

  const fmt = (v) => (v != null ? v.toFixed(6) : '——');

  if (gpsError === 'denied') {
    return (
      <div className="min-h-screen bg-red-900 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-sm text-center">
          <div className="text-5xl mb-4">🚫</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">GPS Access Denied</h2>
          <p className="text-gray-600 text-sm">
            Browser settings mein location allow karein, phir page reload karein.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col gap-3 p-4">
      <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Driver GPS Mode</h1>
          <p className="text-xs text-gray-500 font-mono mt-0.5">
            Trip DB ID: {tripId || 'loading...'}
          </p>
        </div>
        <div
          className={`text-xs font-bold px-3 py-1 rounded-full ${
            socketConnected ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'
          }`}
        >
          {socketConnected ? '● Online' : '● Offline'}
        </div>
      </div>

      <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
        <p className="text-xs text-gray-400 mb-2 uppercase font-bold tracking-wide">
          Customer Tracking Link
        </p>
        <div className="flex items-center gap-2">
          <p className="text-xs text-gray-300 flex-1 truncate font-mono bg-gray-800 px-3 py-2 rounded-lg">
            {customerLink}
          </p>
          <button
            onClick={copyCustomerLink}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              linkCopied ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {linkCopied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <p className="text-[11px] text-gray-500 mt-1">
          Yeh link customer ko bhejein — woh live map dekhega
        </p>
      </div>

      <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
        <p
          className={`text-xs font-medium mb-3 ${
            isTracking ? 'text-green-400 animate-pulse' : 'text-gray-400'
          }`}
        >
          {statusMsg}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-gray-800 p-3 rounded-xl">
            <span className="text-[10px] text-gray-400 uppercase block mb-1">Latitude</span>
            <div className="text-base font-mono font-bold">{fmt(coords?.latitude)}</div>
          </div>
          <div className="bg-gray-800 p-3 rounded-xl">
            <span className="text-[10px] text-gray-400 uppercase block mb-1">Longitude</span>
            <div className="text-base font-mono font-bold">{fmt(coords?.longitude)}</div>
          </div>
        </div>

        <div className="flex justify-between text-xs text-gray-400 flex-wrap gap-2">
          <span>
            Accuracy:{' '}
            <span className="text-blue-400">
              {accuracy ? `±${Math.round(accuracy)}m` : '—'}
            </span>
          </span>
          <span>
            Updates: <span className="text-green-400">{locationCount}</span>
          </span>
          {lastSent && (
            <span>
              Last: <span className="text-yellow-400">{lastSent.toLocaleTimeString()}</span>
            </span>
          )}
        </div>

        {gpsError && gpsError !== 'denied' && (
          <div className="mt-3 text-xs text-red-400">{gpsError}</div>
        )}
      </div>

      {showMap && coords && (
        <div className="rounded-2xl overflow-hidden border border-gray-700" style={{ height: '300px' }}>
          <MapContainer
            center={[coords.latitude, coords.longitude]}
            zoom={16}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
            scrollWheelZoom={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap"
              maxZoom={19}
            />
            <MapFollower coords={coords} />
            <Marker position={[coords.latitude, coords.longitude]} icon={driverIcon.current}>
              <Popup>
                <strong>Aap yahan hain</strong>
                <br />
                {fmt(coords.latitude)}, {fmt(coords.longitude)}
              </Popup>
            </Marker>
          </MapContainer>
        </div>
      )}

      <div className="pb-4">
        {!isTracking ? (
          <button
            onClick={startTracking}
            disabled={!tripId}
            className="w-full py-5 bg-green-600 hover:bg-green-700 active:scale-95 rounded-2xl font-black text-xl shadow-lg shadow-green-900/40 disabled:bg-gray-800 disabled:text-gray-600 transition-all"
          >
            {tripId ? '▶ START TRACKING' : 'Server se connect ho raha hai...'}
          </button>
        ) : (
          <button
            onClick={stopTracking}
            className="w-full py-5 bg-red-600 hover:bg-red-700 active:scale-95 rounded-2xl font-black text-xl shadow-lg shadow-red-900/40 transition-all"
          >
            ⏹ STOP TRACKING
          </button>
        )}
      </div>
    </div>
  );
};

export default DriverApp;