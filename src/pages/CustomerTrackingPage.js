import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import TrackingMap from '../components/TrackingMap';
import { getTrackingData } from '../services/apiService';
import './CustomerTrackingPage.css';

const CustomerTrackingPage = () => {
  const { trackingId } = useParams();
  const [tripData, setTripData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTripData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!trackingId) {
          throw new Error('No tracking ID provided');
        }

        const data = await getTrackingData(trackingId);

        if (!data || typeof data !== 'object') {
          throw new Error('Invalid response from server');
        }

        setTripData(data);
      } catch (err) {
        const errorMessage =
          err.response?.data?.error ||
          err.message ||
          'Failed to load tracking data';

        console.error('Tracking error:', err);
        setError(errorMessage);
        setTripData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTripData();
  }, [trackingId]);

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner"></div>
        <p>Loading tracking information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-error">
        <h2>⚠️ Error Loading Tracking Data</h2>
        <p>{error}</p>
        <div className="error-tips">
          <p><strong>Troubleshooting:</strong></p>
          <ul>
            <li>Verify the tracking ID in the URL is correct</li>
            <li>Make sure the trip has been created via the admin panel</li>
            <li>Check that the backend server is running on port 5000</li>
          </ul>
        </div>
      </div>
    );
  }

  if (!tripData) {
    return (
      <div className="page-error">
        <h2>No Data Available</h2>
        <p>Could not find tracking information</p>
      </div>
    );
  }

  const customerName = tripData.customerName || 'Unknown Customer';
  const driverName = tripData.driverName || 'Driver';
  const status = tripData.status || 'unknown';

  return (
    <div className="customer-tracking-page">
      <div className="page-header">
        <h1>🚚 Track Your Delivery</h1>
      </div>

      <TrackingMap
        trackingId={trackingId}
        customerName={customerName}
        driverName={driverName}
        tripData={tripData}
      />

      <div className="trip-status">
        <h3>Delivery Status</h3>
        <div className={`status-badge status-${status.toLowerCase()}`}>
          {status.toUpperCase()}
        </div>
      </div>
    </div>
  );
};

export default CustomerTrackingPage;