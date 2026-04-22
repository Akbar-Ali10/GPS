import React, { useEffect, useState } from 'react';
import { createTrip } from '../services/apiService';

const API_URL =
  process.env.REACT_APP_API_URL ||
  `http://${window.location.hostname}:5000/api`;

const CreateTripForm = ({ onTripCreated }) => {
  const [formData, setFormData] = useState({
    customerName: '',
    driverId: '',
    pickupAddress: '',
    destinationAddress: '',
  });

  const [drivers, setDrivers] = useState([]);
  const [driversLoading, setDriversLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [createdTrip, setCreatedTrip] = useState(null);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const fetchDrivers = async () => {
    try {
      setDriversLoading(true);
      const res = await fetch(`${API_URL}/drivers`);
      const data = await res.json();

      if (data.success) {
        setDrivers(data.drivers || []);
      } else {
        setDrivers([]);
      }
    } catch (error) {
      console.error('Failed to fetch drivers:', error);
      setDrivers([]);
    } finally {
      setDriversLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.customerName.trim() || !formData.driverId) {
      setMessage('❌ Customer Name aur Driver select karna required hai');
      return;
    }

    try {
      setLoading(true);
      setMessage(null);
      setCreatedTrip(null);

      const res = await createTrip(
        parseInt(formData.driverId, 10),
        formData.customerName.trim(),
        formData.pickupAddress.trim(),
        formData.destinationAddress.trim()
      );

      if (res.success) {
        setMessage('✅ Trip Created Successfully!');
        setCreatedTrip(res.trip);

        setFormData({
          customerName: '',
          driverId: '',
          pickupAddress: '',
          destinationAddress: '',
        });

        if (onTripCreated) onTripCreated();

        setTimeout(() => {
          setMessage(null);
        }, 3000);
      }
    } catch (err) {
      setMessage('❌ Error: ' + (err.response?.data?.error || 'Server Down'));
    } finally {
      setLoading(false);
    }
  };

  const customerLink = createdTrip?.trackingId
    ? `${window.location.origin}/track/${createdTrip.trackingId}`
    : '';

  const driverLink = createdTrip?.trackingId
    ? `${window.location.origin}/driver/${createdTrip.trackingId}`
    : '';

  const copyText = async (text, successMsg) => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage(successMsg);
      setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      setMessage('❌ Copy failed');
      setTimeout(() => setMessage(null), 2000);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-1">New Delivery</h2>
      <p className="text-sm text-slate-500 mb-4">
        Customer ke liye trip banao aur tracking links generate karo.
      </p>

      {message && (
        <div className="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-700">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
          placeholder="Customer Name"
          value={formData.customerName}
          onChange={(e) => handleChange('customerName', e.target.value)}
        />

        <select
          className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white"
          value={formData.driverId}
          onChange={(e) => handleChange('driverId', e.target.value)}
          disabled={driversLoading}
        >
          <option value="">
            {driversLoading ? 'Loading drivers...' : 'Select Driver'}
          </option>
          {drivers.map((driver) => (
            <option key={driver.id} value={driver.id}>
              {driver.name} ({driver.phone}) {driver.status ? `- ${driver.status}` : ''}
            </option>
          ))}
        </select>

        <input
          className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
          placeholder="Pickup Address (optional)"
          value={formData.pickupAddress}
          onChange={(e) => handleChange('pickupAddress', e.target.value)}
        />

        <input
          className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
          placeholder="Destination Address (optional)"
          value={formData.destinationAddress}
          onChange={(e) => handleChange('destinationAddress', e.target.value)}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-3 rounded-xl font-semibold hover:bg-blue-700 transition-all disabled:bg-slate-400"
        >
          {loading ? 'Creating...' : 'Create Trip'}
        </button>
      </form>

      {createdTrip && (
        <div className="mt-5 p-4 rounded-2xl border border-emerald-200 bg-emerald-50">
          <h3 className="font-bold text-emerald-900 text-lg mb-3">Trip Created</h3>

          <div className="space-y-2 text-sm text-slate-700">
            <p>
              <strong>Trip DB ID:</strong> {createdTrip.id}
            </p>
            <p className="break-all">
              <strong>Tracking ID:</strong> {createdTrip.trackingId}
            </p>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-1">Customer Link</p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={customerLink}
                  className="flex-1 min-w-0 p-2.5 text-xs border border-slate-200 rounded-xl bg-white"
                />
                <button
                  type="button"
                  onClick={() => copyText(customerLink, '✅ Customer link copied')}
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700"
                >
                  Copy
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-600 mb-1">Driver Link</p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={driverLink}
                  className="flex-1 min-w-0 p-2.5 text-xs border border-slate-200 rounded-xl bg-white"
                />
                <button
                  type="button"
                  onClick={() => copyText(driverLink, '✅ Driver link copied')}
                  className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateTripForm;