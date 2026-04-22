import React, { useEffect, useState } from 'react';
import {
  getAllTrips,
  updateTripStatus,
  cancelTrip,
  clearTripHistory,
} from '../services/apiService';

const TripList = ({ refreshTrigger }) => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedLinkId, setCopiedLinkId] = useState(null);
  const [copiedDriverLinkId, setCopiedDriverLinkId] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [startingTripId, setStartingTripId] = useState(null);
  const [completingTripId, setCompletingTripId] = useState(null);
  const [cancellingTripId, setCancellingTripId] = useState(null);
  const [clearingTripId, setClearingTripId] = useState(null);
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0 });

  const fetchTrips = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getAllTrips(null, 100, 0);

      if (data.success) {
        const tripsList = data.trips || [];
        setTrips(tripsList);

        setStats({
          total: data.total || 0,
          active: tripsList.filter(
            (t) => t.status === 'active' || t.status === 'in-progress'
          ).length,
          pending: tripsList.filter((t) => t.status === 'pending').length,
        });
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load trips');
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
        return 'bg-amber-100 text-amber-800';
      case 'active':
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-emerald-100 text-emerald-800';
      case 'cancelled':
        return 'bg-rose-100 text-rose-800';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const showToastMsg = (msg) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const copyCustomerLink = async (trackingId) => {
    if (!trackingId) return;

    const link = `${window.location.origin}/track/${String(trackingId)}`;

    try {
      await navigator.clipboard.writeText(link);
      setCopiedLinkId(trackingId);
      showToastMsg('Customer link copied');
      setTimeout(() => setCopiedLinkId(null), 2000);
    } catch (error) {
      setError('Failed to copy customer link');
    }
  };

  const copyDriverLink = async (trackingId) => {
    if (!trackingId) return;

    const link = `${window.location.origin}/driver/${String(trackingId)}`;

    try {
      await navigator.clipboard.writeText(link);
      setCopiedDriverLinkId(trackingId);
      showToastMsg('Driver link copied');
      setTimeout(() => setCopiedDriverLinkId(null), 2000);
    } catch (error) {
      setError('Failed to copy driver link');
    }
  };

  const handleStartTrip = async (id) => {
    setStartingTripId(id);
    try {
      await updateTripStatus(id, 'active');
      showToastMsg('Trip started');
      await fetchTrips();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start');
    } finally {
      setStartingTripId(null);
    }
  };

  const handleComplete = async (id) => {
    setCompletingTripId(id);
    try {
      await updateTripStatus(id, 'completed');
      showToastMsg('Trip completed');
      await fetchTrips();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to complete');
    } finally {
      setCompletingTripId(null);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this trip?')) return;

    setCancellingTripId(id);
    try {
      await cancelTrip(id);
      showToastMsg('Trip cancelled');
      await fetchTrips();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel');
    } finally {
      setCancellingTripId(null);
    }
  };

  const handleClearHistory = async (id) => {
    if (!window.confirm('Clear trip history?')) return;

    setClearingTripId(id);
    try {
      await clearTripHistory(id);
      showToastMsg('Trip history cleared');
      await fetchTrips();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to clear history');
    } finally {
      setClearingTripId(null);
    }
  };

  return (
    <div className="w-full min-w-0">
      {showToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-2.5 rounded-full shadow-lg text-sm font-medium">
          {toastMsg}
        </div>
      )}

      <div className="flex items-end justify-between gap-4 flex-wrap mb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Trips</h2>
          <p className="text-sm text-slate-500 mt-1">Manage and monitor all delivery trips</p>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
          <span className="flex items-center gap-1">🔗 Customer link</span>
          <span className="flex items-center gap-1">🚗 Driver link</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className="bg-slate-900 text-white rounded-2xl p-4">
          <div className="text-xs uppercase tracking-wide text-slate-300">Total</div>
          <div className="text-3xl font-bold mt-2">{stats.total}</div>
        </div>

        <div className="bg-blue-600 text-white rounded-2xl p-4">
          <div className="text-xs uppercase tracking-wide text-blue-100">Active</div>
          <div className="text-3xl font-bold mt-2">{stats.active}</div>
        </div>

        <div className="bg-amber-500 text-white rounded-2xl p-4">
          <div className="text-xs uppercase tracking-wide text-amber-50">Pending</div>
          <div className="text-3xl font-bold mt-2">{stats.pending}</div>
        </div>
      </div>

      <div className="space-y-4">
        {loading && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400">
            Loading trips...
          </div>
        )}

        {!loading && trips.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400">
            Koi trip nahi mili
          </div>
        )}

        {!loading &&
          trips.map((trip) => (
            <div
              key={trip.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-sm"
            >
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
                <div className="lg:col-span-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="bg-slate-100 px-3 py-1.5 rounded-lg text-xs text-slate-700 font-medium">
                      {trip.tracking_id
                        ? `${String(trip.tracking_id).substring(0, 8)}...`
                        : 'N/A'}
                    </code>

                    <button
                      onClick={() => copyCustomerLink(trip.tracking_id)}
                      className="w-8 h-8 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 flex items-center justify-center"
                      title="Copy customer link"
                    >
                      {copiedLinkId === trip.tracking_id ? '✅' : '🔗'}
                    </button>

                    <button
                      onClick={() => copyDriverLink(trip.tracking_id)}
                      className="w-8 h-8 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center"
                      title="Copy driver link"
                    >
                      {copiedDriverLinkId === trip.tracking_id ? '✅' : '🚗'}
                    </button>
                  </div>

                  <div className="text-xs text-slate-400 mt-2 break-all">
                    {trip.tracking_id}
                  </div>
                </div>

                <div className="lg:col-span-1 min-w-0">
                  <div className="font-semibold text-slate-900 text-lg">
                    {trip.customer_name || 'N/A'}
                  </div>

                  {trip.pickup_address && (
                    <div className="text-sm text-slate-500 mt-2">
                      <span className="font-medium text-slate-600">Pickup:</span>{' '}
                      {trip.pickup_address}
                    </div>
                  )}

                  {trip.destination_address && (
                    <div className="text-sm text-slate-500 mt-1">
                      <span className="font-medium text-slate-600">Destination:</span>{' '}
                      {trip.destination_address}
                    </div>
                  )}
                </div>

                <div className="lg:col-span-1">
                  <div className="font-semibold text-slate-900 text-lg">
                    {trip.driver_name || `Driver #${trip.driver_id || 'N/A'}`}
                  </div>
                  {trip.driver_id && (
                    <div className="text-sm text-slate-500 mt-2">
                      Driver ID: {trip.driver_id}
                    </div>
                  )}
                </div>

                <div className="lg:col-span-1">
                  <span
                    className={`inline-flex px-3 py-1.5 rounded-full text-xs font-bold uppercase ${getStatusColor(
                      trip.status
                    )}`}
                  >
                    {trip.status || 'N/A'}
                  </span>
                </div>

                <div className="lg:col-span-1">
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {trip.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleStartTrip(trip.id)}
                          disabled={startingTripId === trip.id}
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50"
                        >
                          {startingTripId === trip.id ? '...' : 'Start'}
                        </button>

                        <button
                          onClick={() => handleCancel(trip.id)}
                          disabled={cancellingTripId === trip.id}
                          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium disabled:opacity-50"
                        >
                          {cancellingTripId === trip.id ? '...' : 'Cancel'}
                        </button>
                      </>
                    )}

                    {(trip.status === 'active' || trip.status === 'in-progress') && (
                      <>
                        <button
                          onClick={() => handleComplete(trip.id)}
                          disabled={completingTripId === trip.id}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-50"
                        >
                          {completingTripId === trip.id ? '...' : 'Done'}
                        </button>

                        <button
                          onClick={() => handleCancel(trip.id)}
                          disabled={cancellingTripId === trip.id}
                          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium disabled:opacity-50"
                        >
                          {cancellingTripId === trip.id ? '...' : 'Cancel'}
                        </button>

                        <button
                          onClick={() => handleClearHistory(trip.id)}
                          disabled={clearingTripId === trip.id}
                          className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium disabled:opacity-50"
                        >
                          {clearingTripId === trip.id ? '...' : 'Clear'}
                        </button>
                      </>
                    )}

                    {trip.status === 'completed' && (
                      <button
                        onClick={() => handleClearHistory(trip.id)}
                        disabled={clearingTripId === trip.id}
                        className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium disabled:opacity-50"
                      >
                        {clearingTripId === trip.id ? '...' : 'Clear'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

export default TripList;