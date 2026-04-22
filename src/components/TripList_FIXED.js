import React, { useEffect, useState } from 'react';
import { getAllTrips, updateTripStatus, deleteTrip, getTrackingData } from '../services/apiService';

const TripList = ({ refreshTrigger }) => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [copiedLinkId, setCopiedLinkId] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [startingTripId, setStartingTripId] = useState(null);
  const [completingTripId, setCompletingTripId] = useState(null);
  const [deletingTripId, setDeletingTripId] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
  });

  const fetchTrips = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllTrips(null, 100, 0);

      if (data.success) {
        setTrips(data.trips);
        setStats({
          total: data.total,
          active: data.trips.filter((t) => t.status === 'active' || t.status === 'in-progress').length,
          pending: data.trips.filter((t) => t.status === 'pending').length,
        });
      }
    } catch (err) {
      console.error('Error fetching trips:', err);
      setError(err.message || 'Failed to load trips');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, [refreshTrigger]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in-progress':
      case 'active':
        return 'bg-green-100 text-green-800 ring-1 ring-green-400';
      case 'completed':
      case 'done':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
      case 'closed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const copyToClipboard = (trackingId) => {
    if (!trackingId) return;
    const idString = String(trackingId);
    navigator.clipboard.writeText(idString).then(() => {
      setCopiedId(trackingId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const copyShareLink = (trackingId) => {
    if (!trackingId) return;
    const idString = String(trackingId);
    const link = `${window.location.origin}/track/${idString}`;

    const triggerSuccess = () => {
      setCopiedLinkId(trackingId);
      setShowToast(true);
      setTimeout(() => {
        setCopiedLinkId(null);
        setShowToast(false);
      }, 2000);
    };

    const fallbackCopy = () => {
      const ta = document.createElement('textarea');
      ta.value = link;
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand('copy');
        triggerSuccess();
      } catch (e) {
        console.error('Fallback copy failed:', e);
      }
      document.body.removeChild(ta);
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(link).then(triggerSuccess).catch(fallbackCopy);
    } else {
      fallbackCopy();
    }
  };

  const handleStartTrip = async (tripId) => {
    setStartingTripId(tripId);
    try {
      await updateTripStatus(tripId, 'active');
      // Update local state immediately — no need to refetch the whole list
      setTrips((prev) =>
        prev.map((t) => (t.id === tripId ? { ...t, status: 'active' } : t))
      );
      setStats((prev) => ({
        ...prev,
        active: prev.active + 1,
        pending: Math.max(0, prev.pending - 1),
      }));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start trip');
    } finally {
      setStartingTripId(null);
    }
  };

  const handleComplete = async (tripId) => {
    setCompletingTripId(tripId);
    try {
      // Find the trip to check distance
      const trip = trips.find(t => t.id === tripId);
      if (!trip) {
        setError('Trip not found');
        return;
      }

      // Skip destination check for simplified app
      await updateTripStatus(tripId, 'completed');
      // Update local state immediately
      setTrips((prev) =>
        prev.map((t) => (t.id === tripId ? { ...t, status: 'completed' } : t))
      );
      setStats((prev) => ({
        ...prev,
        active: Math.max(0, prev.active - 1),
      }));
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to complete trip');
    } finally {
      setCompletingTripId(null);
    }
  };

  const handleDelete = async (tripId) => {
    setDeletingTripId(tripId);
    try {
      await deleteTrip(tripId);
      // Remove trip from state
      setTrips((prev) => {
        const filteredTrips = prev.filter((t) => t.id !== tripId);
        return filteredTrips;
      });
      // Update stats
      const deletedTrip = trips.find((t) => t.id === tripId);
      setStats((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
        active: deletedTrip?.status === 'active' || deletedTrip?.status === 'in-progress'
          ? Math.max(0, prev.active - 1)
          : prev.active,
        pending: deletedTrip?.status === 'pending' ? Math.max(0, prev.pending - 1) : prev.pending,
      }));
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete trip');
    } finally {
      setDeletingTripId(null);
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return 'N/A';
    }
  };

  return (
    <div className="w-full">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-2 pointer-events-none">
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
          </svg>
          <span className="font-semibold text-sm">Link Copied!</span>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-600 font-medium">Total Trips</div>
          <div className="text-2xl font-bold text-blue-900 mt-1">{stats.total}</div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
          <div className="text-sm text-green-600 font-medium">Active</div>
          <div className="text-2xl font-bold text-green-900 mt-1">{stats.active}</div>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
          <div className="text-sm text-yellow-600 font-medium">Pending</div>
          <div className="text-2xl font-bold text-yellow-900 mt-1">{stats.pending}</div>
        </div>
      </div>

      {/* Header and Refresh Button */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">Active Trips</h2>
        <button
          onClick={fetchTrips}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        >
          {loading ? 'Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && trips.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading trips...</span>
        </div>
      )}

      {/* Table */}
      {!loading && trips.length > 0 && (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Tracking ID</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Customer</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Driver ID</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Created</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {trips.map((trip, index) => {
                // ✅ STRING SAFETY: Convert trip.id to string once at the top of the row
                const tripIdString = trip?.id ? String(trip.id) : 'N/A';
                const tripId = trip?.id || null;
                const customerName = trip?.customer_name ? String(trip.customer_name) : 'N/A';
                const driverId = trip?.driver_id ? String(trip.driver_id) : 'N/A';
                const status = trip?.status ? String(trip.status).toLowerCase() : 'unknown';
                const createdAt = trip?.created_at ? formatDate(trip.created_at) : 'N/A';

                return (
                  <tr
                    key={tripId || index}
                    className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    {/* TRACKING ID COLUMN - Full String Safety */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {/* Copy button with String() wrapper */}
                        <button
                          onClick={() => copyToClipboard(tripId)}
                          disabled={!tripId}
                          title={`Copy ID: ${tripIdString}`}
                          className="flex items-center gap-1 group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono text-gray-800 group-hover:bg-gray-200 transition-colors">
                            {tripIdString && tripIdString !== 'N/A' ? String(tripIdString).substring(0, 8) : 'N/A'}...
                          </code>
                          <span className="text-xs text-gray-400 group-hover:text-blue-500 transition-colors">
                            {copiedId === tripId ? '✅' : '📋'}
                          </span>
                        </button>

                        {/* Share link button with String() wrapper */}
                        <button
                          onClick={() => copyShareLink(tripId)}
                          disabled={!tripId}
                          title={`Copy link: ${window.location.origin}/track/${tripIdString}`}
                          className={`p-1.5 rounded-lg transition-all duration-300 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                            copiedLinkId === tripId
                              ? 'bg-green-500 text-white shadow-md'
                              : 'bg-blue-50 text-blue-600 hover:bg-blue-100 hover:shadow-sm'
                          }`}
                        >
                          {copiedLinkId === tripId ? (
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>

                    {/* CUSTOMER NAME COLUMN - String Safe */}
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {customerName}
                    </td>

                    {/* DRIVER ID COLUMN - String Safe */}
                    <td className="px-4 py-3 text-gray-600">
                      {driverId}
                    </td>

                    {/* STATUS COLUMN - String Safe */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(status)}`}
                      >
                        {status ? String(status).toUpperCase() : 'UNKNOWN'}
                      </span>
                    </td>

                    {/* CREATED DATE COLUMN - Safe Formatting */}
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {createdAt}
                    </td>

                    {/* ACTIONS COLUMN */}
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {trip?.status === 'pending' && (
                          <button
                            onClick={() => handleStartTrip(tripId)}
                            disabled={startingTripId === tripId}
                            className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                          >
                            {startingTripId === tripId ? '...' : '▶ Start'}
                          </button>
                        )}

                        {(trip?.status === 'active' || trip?.status === 'in-progress') && (
                          <button
                            onClick={() => handleComplete(tripId)}
                            disabled={completingTripId === tripId}
                            className="px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                          >
                            {completingTripId === tripId ? '...' : '✓ Complete'}
                          </button>
                        )}

                        {trip?.status !== 'completed' && trip?.status !== 'done' && (
                          <button
                            onClick={() => handleDelete(tripId)}
                            disabled={deletingTripId === tripId}
                            className="px-3 py-1 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                          >
                            {deletingTripId === tripId ? '...' : '✕ Delete'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loading && trips.length === 0 && !error && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-4xl mb-2">📭</div>
          <p className="text-gray-600">No trips found. Create one to get started!</p>
        </div>
      )}
    </div>
  );
};

export default TripList;
