import io from 'socket.io-client';

const SOCKET_URL =
  process.env.REACT_APP_SOCKET_URL ||
  `http://${window.location.hostname}:5000`;

let socket = null;

export const initSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    console.log('Socket initialized:', SOCKET_URL);
  }

  return socket;
};

export const getSocket = () => initSocket();

export const joinTrip = (trackingId) => {
  const s = initSocket();
  s.emit('join-trip-customer', trackingId);
};

export const joinDriverTrip = (trackingId) => {
  const s = initSocket();
  s.emit('join-trip', { trackingId, role: 'driver' });
};

export const onLocationUpdate = (callback) => {
  const s = initSocket();
  s.off('location-updated', callback);
  s.on('location-updated', callback);

  return () => s.off('location-updated', callback);
};

export const onTripStatusUpdate = (callback) => {
  const s = initSocket();
  s.off('trip-status-updated', callback);
  s.on('trip-status-updated', callback);

  return () => s.off('trip-status-updated', callback);
};

export const onLocationError = (callback) => {
  const s = initSocket();
  s.off('location-error', callback);
  s.on('location-error', callback);

  return () => s.off('location-error', callback);
};

export const onRoomJoined = (callback) => {
  const s = initSocket();
  s.off('room-joined-customer', callback);
  s.on('room-joined-customer', callback);

  return () => s.off('room-joined-customer', callback);
};

export const emitRealLocation = (latitude, longitude, trackingId, tripId) => {
  const s = initSocket();
  s.emit('update-location', {
    latitude,
    longitude,
    trackingId,
    tripId,
    timestamp: new Date().toISOString(),
  });
};

export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};

export default socket;