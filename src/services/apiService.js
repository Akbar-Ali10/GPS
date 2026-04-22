import axios from 'axios';

const API_URL =
  process.env.REACT_APP_API_URL ||
  `http://${window.location.hostname}:5000/api`;

const api = axios.create({
  baseURL: API_URL,
});

export const getTrackingData = async (trackingId) => {
  try {
    const response = await api.get(`/track/${trackingId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching tracking data:', error);
    throw error;
  }
};

export const getLocationHistory = async (trackingId, limit = 50) => {
  try {
    const response = await api.get(`/track/${trackingId}/history`, {
      params: { limit },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching location history:', error);
    throw error;
  }
};

export const getAllTrips = async (status = null, limit = 100, offset = 0) => {
  try {
    const params = { limit, offset };
    if (status) params.status = status;

    const response = await api.get('/trips', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching trips:', error);
    throw error;
  }
};

export const createTrip = async (
  driverId,
  customerName,
  pickupAddress = '',
  destinationAddress = ''
) => {
  try {
    const payload = {
      driver_id: driverId,
      customer_name: customerName,
      pickup_address: pickupAddress || null,
      destination_address: destinationAddress || null,
    };

    const response = await api.post('/trips', payload);
    return response.data;
  } catch (error) {
    console.error('Error creating trip:', error);
    throw error;
  }
};

export const updateTripStatus = async (tripId, status) => {
  try {
    const response = await api.put(`/trips/${tripId}/status`, {
      status,
    });
    return response.data;
  } catch (error) {
    console.error('Error updating trip status:', error);
    throw error;
  }
};

export const cancelTrip = async (tripId) => {
  try {
    const response = await api.put(`/trips/${tripId}/status`, {
      status: 'cancelled',
    });
    return response.data;
  } catch (error) {
    console.error('Error cancelling trip:', error);
    throw error;
  }
};

export const clearTripHistory = async (tripId) => {
  try {
    const response = await api.post(`/trips/${tripId}/clear-history`);
    return response.data;
  } catch (error) {
    console.error('Error clearing trip history:', error);
    throw error;
  }
};

export const getAllDrivers = async () => {
  try {
    const response = await api.get('/drivers');
    return response.data;
  } catch (error) {
    console.error('Error fetching drivers:', error);
    throw error;
  }
};

export const createDriver = async (name, phone, status = 'offline') => {
  try {
    const response = await api.post('/drivers', {
      name,
      phone,
      status,
    });
    return response.data;
  } catch (error) {
    console.error('Error creating driver:', error);
    throw error;
  }
};

// Optional placeholder for future backend route
export const deleteTrip = async (tripId) => {
  try {
    const response = await api.delete(`/trips/${tripId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting trip:', error);
    throw error;
  }
};

export default api;