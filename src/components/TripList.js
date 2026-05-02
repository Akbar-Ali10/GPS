import React, { useEffect, useMemo, useState } from 'react';
import {
  getAllTrips,
  updateTripStatus,
  cancelTrip,
  clearTripHistory,
} from '../services/apiService';
import AdminOrderPanel from './AdminOrderPanel';

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

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedTrip, setSelectedTrip] = useState(null);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getAllTrips(null, 100, 0);

      if (data.success) {
        setTrips(data.trips || []);
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
    switch (String(status || '').toLowerCase()) {
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'active':
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'cancelled':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (String(status || '').toLowerCase()) {
      case 'paid':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'failed':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'refunded':
        return 'bg-violet-100 text-violet-800 border-violet-200';
      case 'cash_on_delivery':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getReviewStatusColor = (value) => {
    return value
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const getOrderTypeLabel = (type) => {
    if (type === 'shopping') return 'Shopping';
    if (type === 'ride') return 'Ride';
    return 'Pickup & Drop';
  };

  const getOrderTypeIcon = (type) => {
    if (type === 'shopping') return '🛒';
    if (type === 'ride') return '🏍️';
    return '📦';
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
      showToastMsg('Order marked active');
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
      showToastMsg('Order completed');
      await fetchTrips();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to complete');
    } finally {
      setCompletingTripId(null);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this order?')) return;

    setCancellingTripId(id);
    try {
      await cancelTrip(id);
      showToastMsg('Order cancelled');
      await fetchTrips();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel');
    } finally {
      setCancellingTripId(null);
    }
  };

  const handleClearHistory = async (id) => {
    if (!window.confirm('Clear order history?')) return;

    setClearingTripId(id);
    try {
      await clearTripHistory(id);
      showToastMsg('Location history cleared');
      await fetchTrips();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to clear history');
    } finally {
      setClearingTripId(null);
    }
  };

  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      const q = searchText.trim().toLowerCase();

      const matchesSearch =
        !q ||
        String(trip.tracking_id || '').toLowerCase().includes(q) ||
        String(trip.customer_name || '').toLowerCase().includes(q) ||
        String(trip.customer_phone || '').toLowerCase().includes(q) ||
        String(trip.driver_name || '').toLowerCase().includes(q) ||
        String(trip.driver_id || '').toLowerCase().includes(q) ||
        String(trip.pickup_address || '').toLowerCase().includes(q) ||
        String(trip.destination_address || '').toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === 'all' ? true : String(trip.status || '') === statusFilter;

      const matchesType =
        typeFilter === 'all' ? true : String(trip.order_type || '') === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [trips, searchText, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    return {
      total: filteredTrips.length,
      active: filteredTrips.filter(
        (t) => t.status === 'active' || t.status === 'in-progress'
      ).length,
      pending: filteredTrips.filter((t) => t.status === 'pending').length,
      completed: filteredTrips.filter((t) => t.status === 'completed').length,
    };
  }, [filteredTrips]);

  return (
    <div className="w-full min-w-0">
      {selectedTrip && (
        <AdminOrderPanel trip={selectedTrip} onClose={() => setSelectedTrip(null)} />
      )}

      {showToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-2.5 rounded-full shadow-lg text-sm font-medium">
          {toastMsg}
        </div>
      )}

      <div className="flex items-end justify-between gap-4 flex-wrap mb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Orders Monitor</h2>
          <p className="text-sm text-slate-500 mt-1">
            Admin can monitor orders, payments, reviews and complaints from here
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
          <span className="flex items-center gap-1">🔗 Customer link</span>
          <span className="flex items-center gap-1">🚗 Driver link</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
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

        <div className="bg-emerald-600 text-white rounded-2xl p-4">
          <div className="text-xs uppercase tracking-wide text-emerald-100">Completed</div>
          <div className="text-3xl font-bold mt-2">{stats.completed}</div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Search by customer, tracking id, phone, driver, address..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full p-3 border border-slate-200 rounded-xl outline-none"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full p-3 border border-slate-200 rounded-xl outline-none bg-white"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full p-3 border border-slate-200 rounded-xl outline-none bg-white"
          >
            <option value="all">All Types</option>
            <option value="shopping">Shopping</option>
            <option value="pickup_drop">Pickup & Drop</option>
            <option value="ride">Ride</option>
          </select>
        </div>
      </div>

      <div className="space-y-5">
        {loading && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400">
            Loading orders...
          </div>
        )}

        {!loading && filteredTrips.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400">
            No matching orders found
          </div>
        )}

        {!loading &&
          filteredTrips.map((trip) => (
            <div
              key={trip.id}
              className="bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all overflow-hidden cursor-pointer"
              onClick={() => setSelectedTrip(trip)}
            >
              <div className="p-4 md:p-5 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold">
                        #
                        {trip.tracking_id
                          ? `${String(trip.tracking_id).substring(0, 8)}...`
                          : trip.id}
                      </span>

                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-bold uppercase">
                        {getOrderTypeIcon(trip.order_type)} {getOrderTypeLabel(trip.order_type)}
                      </span>

                      <span
                        className={`inline-flex px-3 py-1.5 rounded-xl text-xs font-bold uppercase border ${getStatusColor(
                          trip.status
                        )}`}
                      >
                        ● {trip.status || 'N/A'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 mt-2 break-all">
                      Tracking ID: {trip.tracking_id || 'N/A'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => copyCustomerLink(trip.tracking_id)}
                      className="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100 text-xs font-bold"
                      title="Copy customer link"
                    >
                      {copiedLinkId === trip.tracking_id ? '✅ Copied' : '🔗 Customer'}
                    </button>

                    <button
                      onClick={() => copyDriverLink(trip.tracking_id)}
                      className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 text-xs font-bold"
                      title="Copy driver link"
                    >
                      {copiedDriverLinkId === trip.tracking_id ? '✅ Copied' : '🚗 Driver'}
                    </button>

                    {trip.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleStartTrip(trip.id)}
                          disabled={startingTripId === trip.id}
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold disabled:opacity-50"
                        >
                          {startingTripId === trip.id ? '...' : 'Active'}
                        </button>

                        <button
                          onClick={() => handleCancel(trip.id)}
                          disabled={cancellingTripId === trip.id}
                          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold disabled:opacity-50"
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
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-50"
                        >
                          {completingTripId === trip.id ? '...' : 'Done'}
                        </button>

                        <button
                          onClick={() => handleCancel(trip.id)}
                          disabled={cancellingTripId === trip.id}
                          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold disabled:opacity-50"
                        >
                          {cancellingTripId === trip.id ? '...' : 'Cancel'}
                        </button>

                        <button
                          onClick={() => handleClearHistory(trip.id)}
                          disabled={clearingTripId === trip.id}
                          className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-sm font-bold disabled:opacity-50"
                        >
                          {clearingTripId === trip.id ? '...' : 'Clear'}
                        </button>
                      </>
                    )}

                    {trip.status === 'completed' && (
                      <button
                        onClick={() => handleClearHistory(trip.id)}
                        disabled={clearingTripId === trip.id}
                        className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-sm font-bold disabled:opacity-50"
                      >
                        {clearingTripId === trip.id ? '...' : 'Clear'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 md:p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                    <div className="text-xs font-black uppercase tracking-wide text-blue-600 mb-2">
                      👤 Customer
                    </div>
                    <div className="text-xl font-black text-slate-900">
                      {trip.customer_name || 'N/A'}
                    </div>
                    <div className="text-sm text-slate-600 mt-1">
                      📞 {trip.customer_phone || 'No phone'}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                    <div className="text-xs font-black uppercase tracking-wide text-emerald-600 mb-2">
                      🚗 Driver
                    </div>
                    <div className="text-xl font-black text-slate-900">
                      {trip.driver_name || 'Unassigned'}
                    </div>
                    <div className="text-sm text-slate-600 mt-1">
                      ID: {trip.driver_id || 'N/A'}
                    </div>
                    {!trip.driver_id && (
                      <div className="text-xs text-amber-700 mt-2 font-bold">
                        No driver assigned yet
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-black uppercase tracking-wide text-slate-500 mb-2">
                      📍 Pickup
                    </div>
                    <div className="text-sm text-slate-700 leading-relaxed">
                      {trip.pickup_address || 'N/A'}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4">
                    <div className="text-xs font-black uppercase tracking-wide text-rose-600 mb-2">
                      🎯 Destination
                    </div>
                    <div className="text-sm text-slate-700 leading-relaxed">
                      {trip.destination_address || 'N/A'}
                    </div>
                  </div>
                </div>

                {Array.isArray(trip.item_list) && trip.item_list.length > 0 && (
                  <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
                    <div className="text-xs font-black uppercase tracking-wide text-violet-600 mb-2">
                      🛒 Items
                    </div>
                    <div className="text-sm text-slate-700">
                      {trip.item_list.map((item) => item.name || item).join(', ')}
                    </div>
                  </div>
                )}

                {trip.notes && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-black uppercase tracking-wide text-slate-500 mb-2">
                      📝 Notes
                    </div>
                    <div className="text-sm text-slate-700">{trip.notes}</div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="inline-flex px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                    💰 Budget: Rs. {trip.budget_amount || 0}
                  </span>

                  {trip.suggested_price && (
                    <span className="inline-flex px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                      Suggested: Rs. {trip.suggested_price}
                    </span>
                  )}

                  <span className="inline-flex px-3 py-1.5 rounded-full text-xs font-bold bg-white text-slate-700 border border-slate-200">
                    💵 Method: {trip.payment_method || 'N/A'}
                  </span>

                  <span className="inline-flex px-3 py-1.5 rounded-full text-xs font-bold bg-white text-slate-700 border border-slate-200">
                    Paid: Rs. {trip.paid_amount || 0}
                  </span>

                  <span
                    className={`inline-flex px-3 py-1.5 rounded-full text-xs font-bold border ${getPaymentStatusColor(
                      trip.payment_status || 'pending'
                    )}`}
                  >
                    Payment: {trip.payment_status || 'pending'}
                  </span>

                  <span
                    className={`inline-flex px-3 py-1.5 rounded-full text-xs font-bold border ${getReviewStatusColor(
                      trip.has_review
                    )}`}
                  >
                    Review: {trip.has_review ? 'Submitted' : 'Pending'}
                  </span>

                  <span
                    className={`inline-flex px-3 py-1.5 rounded-full text-xs font-bold border ${
                      trip.has_complaint
                        ? 'bg-rose-100 text-rose-800 border-rose-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    Complaint: {trip.has_complaint ? 'Yes' : 'No'}
                  </span>

                  {trip.rating ? (
                    <span className="inline-flex px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      ⭐ Rating: {trip.rating}/5
                    </span>
                  ) : null}
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