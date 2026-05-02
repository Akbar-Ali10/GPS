import React, { useMemo, useState } from 'react';
import { createOrder } from '../services/apiService';
import LocationPickerMap from './LocationPickerMap';

const validateAddress = async (address) => {
  if (!address || !String(address).trim()) return null;

  const cleanAddress = String(address)
    .replace(/koranghi/gi, 'Korangi')
    .replace(/korngi/gi, 'Korangi')
    .replace(/48\/b/gi, '48 B')
    .replace(/\s+/g, ' ')
    .trim();

  const query = `${cleanAddress}, Karachi, Pakistan`;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`
    );

    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    const lat = Number(data[0].lat);
    const lng = Number(data[0].lon);

    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

    return {
      lat,
      lng,
      displayName: data[0].display_name,
    };
  } catch (error) {
    console.error('Address validation failed:', error);
    return null;
  }
};

const CreateTripForm = ({ orderType = 'pickup_drop' }) => {
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    pickupAddress: '',
    destinationAddress: '',
    pickupLat: null,
    pickupLng: null,
    destinationLat: null,
    destinationLng: null,
    itemsText: '',
    budgetAmount: '',
    notes: '',
    paymentMethod: 'cash',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [createdTrip, setCreatedTrip] = useState(null);

  const pageMeta = useMemo(() => {
    if (orderType === 'shopping') {
      return {
        badge: 'Shopping',
        title: 'Shopping Order',
        subtitle: 'Enter items, delivery address, and place your order.',
        button: 'Place Shopping Order',
      };
    }

    if (orderType === 'ride') {
      return {
        badge: 'Ride',
        title: 'Ride Booking',
        subtitle: 'Enter pickup and destination. A driver will accept your ride.',
        button: 'Book Ride',
      };
    }

    return {
      badge: 'Pickup & Drop',
      title: 'Pickup & Drop Order',
      subtitle: 'Enter pickup and destination address, then place your order.',
      button: 'Place Order',
    };
  }, [orderType]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const parseItems = (itemsText) => {
    return itemsText
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const resetForm = () => {
    setFormData({
      customerName: '',
      customerPhone: '',
      pickupAddress: '',
      destinationAddress: '',
      pickupLat: null,
      pickupLng: null,
      destinationLat: null,
      destinationLng: null,
      itemsText: '',
      budgetAmount: '',
      notes: '',
      paymentMethod: 'cash',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.customerName.trim()) {
      setMessage('❌ Name required hai');
      return;
    }

    if (!formData.customerPhone.trim()) {
      setMessage('❌ Phone number required hai');
      return;
    }

    if (orderType === 'shopping') {
      const parsedItems = parseItems(formData.itemsText);

      if (parsedItems.length === 0) {
        setMessage('❌ Items are required for a shopping order');
        return;
      }

      if (!formData.destinationAddress.trim()) {
        setMessage('❌ Delivery address required hai');
        return;
      }
    }

    if (
      (orderType === 'pickup_drop' || orderType === 'ride') &&
      (!formData.pickupAddress.trim() || !formData.destinationAddress.trim())
    ) {
      setMessage('❌ Pickup aur destination dono required hain');
      return;
    }

    if (!formData.budgetAmount || !String(formData.budgetAmount).trim()) {
      setMessage('❌ Budget/Payment amount is required');
      return;
    }

    try {
      setLoading(true);
      setMessage('⏳ Address verify ho raha hai...');
      setCreatedTrip(null);

      let pickupGeo = null;
      let destinationGeo = null;

      if (orderType === 'pickup_drop' || orderType === 'ride') {
        if (formData.pickupLat && formData.pickupLng) {
          pickupGeo = { lat: formData.pickupLat, lng: formData.pickupLng, displayName: formData.pickupAddress };
        } else {
          pickupGeo = await validateAddress(formData.pickupAddress.trim());
          if (!pickupGeo) {
            setMessage('❌ Pickup address nahi mila. Map se location select karein ya mukammal address likhein. Misal: Korangi 5, Karachi');
            setLoading(false);
            return;
          }
        }
      }

      if (formData.destinationLat && formData.destinationLng) {
        destinationGeo = { lat: formData.destinationLat, lng: formData.destinationLng, displayName: formData.destinationAddress };
      } else {
        destinationGeo = await validateAddress(formData.destinationAddress.trim());
        if (!destinationGeo) {
          setMessage('❌ Destination address nahi mila. Map se location select karein ya mukammal address likhein. Misal: Korangi 5, Karachi');
          setLoading(false);
          return;
        }
      }

      setMessage('✅ Address verified. Order create ho raha hai...');

      const items = orderType === 'shopping' ? parseItems(formData.itemsText) : [];

      const res = await createOrder({
        orderType,
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone.trim(),
        pickupAddress:
          orderType === 'shopping'
            ? ''
            : pickupGeo?.displayName || formData.pickupAddress.trim(),
        destinationAddress: destinationGeo?.displayName || formData.destinationAddress.trim(),
        pickupLat: pickupGeo?.lat || null,
        pickupLng: pickupGeo?.lng || null,
        destinationLat: destinationGeo.lat,
        destinationLng: destinationGeo.lng,
        items,
        notes: formData.notes.trim(),
        budgetAmount: formData.budgetAmount,
        paymentMethod: formData.paymentMethod,
      });

      if (res.success) {
        const trackingId = res.trip?.trackingId || res.trip?.tracking_id;

        setCreatedTrip(res.trip);
        setMessage('✅ Order created successfully');
        resetForm();

        if (trackingId) {
          window.location.href = `/track/${trackingId}`;
        }
      }
    } catch (err) {
      setMessage(`❌ Error: ${err.response?.data?.error || err.message || 'Server error'}`);
    } finally {
      setLoading(false);
    }
  };

  const trackingLink = createdTrip?.trackingId
    ? `${window.location.origin}/track/${createdTrip.trackingId}`
    : '';

  const copyText = async (text, successMsg) => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage(successMsg);
      setTimeout(() => setMessage(null), 2000);
    } catch {
      setMessage('❌ Copy failed');
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6 md:p-8">
      <div className="mb-6">
        <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
          {pageMeta.badge}
        </span>

        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mt-3">
          {pageMeta.title}
        </h2>

        <p className="text-slate-500 mt-2">{pageMeta.subtitle}</p>
      </div>

      {message && (
        <div className="mb-5 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-700">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            className="w-full p-3 border border-slate-200 rounded-2xl outline-none"
            placeholder={orderType === 'ride' ? 'Passenger Name' : 'Customer Name'}
            value={formData.customerName}
            onChange={(e) => handleChange('customerName', e.target.value)}
          />

          <input
            className="w-full p-3 border border-slate-200 rounded-2xl outline-none"
            placeholder="Phone Number"
            value={formData.customerPhone}
            onChange={(e) => handleChange('customerPhone', e.target.value)}
          />
        </div>

        {(orderType === 'pickup_drop' || orderType === 'ride') && (
          <>
            <div>
              <input
                className="w-full p-3 border border-slate-200 rounded-2xl outline-none"
                placeholder={orderType === 'ride' ? 'Pickup Location - e.g. Korangi 5, Karachi' : 'Pickup Address - e.g. House no, street, area, Karachi'}
                value={formData.pickupAddress}
                onChange={(e) => {
                  handleChange('pickupAddress', e.target.value);
                  handleChange('pickupLat', null);
                  handleChange('pickupLng', null);
                }}
                onBlur={async (e) => {
                  const val = e.target.value.trim();
                  if (!val) return;
                  const geo = await validateAddress(val);
                  if (geo) {
                    handleChange('pickupLat', geo.lat);
                    handleChange('pickupLng', geo.lng);
                  }
                }}
              />
              {formData.pickupLat && (
                <p className="text-xs text-emerald-600 mt-1 ml-1">✅ Address map pe mil gaya</p>
              )}
              <p className="text-xs text-slate-400 mt-1 ml-1">Ya neeche map pe click karein</p>
              <LocationPickerMap
                externalCoords={formData.pickupLat ? { lat: formData.pickupLat, lng: formData.pickupLng } : null}
                onSelect={(addr, coords) => {
                  handleChange('pickupAddress', addr);
                  if (coords) { handleChange('pickupLat', coords.lat); handleChange('pickupLng', coords.lng); }
                }}
              />
            </div>

            <div>
              <input
                className="w-full p-3 border border-slate-200 rounded-2xl outline-none"
                placeholder={orderType === 'ride' ? 'Destination - e.g. Landhi 6, Karachi' : 'Destination Address - e.g. House no, street, area, Karachi'}
                value={formData.destinationAddress}
                onChange={(e) => {
                  handleChange('destinationAddress', e.target.value);
                  handleChange('destinationLat', null);
                  handleChange('destinationLng', null);
                }}
                onBlur={async (e) => {
                  const val = e.target.value.trim();
                  if (!val) return;
                  const geo = await validateAddress(val);
                  if (geo) {
                    handleChange('destinationLat', geo.lat);
                    handleChange('destinationLng', geo.lng);
                  }
                }}
              />
              {formData.destinationLat && (
                <p className="text-xs text-emerald-600 mt-1 ml-1">✅ Address map pe mil gaya</p>
              )}
              <p className="text-xs text-slate-400 mt-1 ml-1">Ya neeche map pe click karein</p>
              <LocationPickerMap
                externalCoords={formData.destinationLat ? { lat: formData.destinationLat, lng: formData.destinationLng } : null}
                onSelect={(addr, coords) => {
                  handleChange('destinationAddress', addr);
                  if (coords) { handleChange('destinationLat', coords.lat); handleChange('destinationLng', coords.lng); }
                }}
              />
            </div>
          </>
        )}

        {orderType === 'shopping' && (
          <>
            <textarea
              className="w-full p-3 border border-slate-200 rounded-2xl outline-none min-h-[120px]"
              placeholder="Enter items separated by comma. Example: rice 2kg, tomatoes 1kg, onion 1kg"
              value={formData.itemsText}
              onChange={(e) => handleChange('itemsText', e.target.value)}
            />

            <div>
              <input
                className="w-full p-3 border border-slate-200 rounded-2xl outline-none"
                placeholder="Delivery Address - e.g. House no, street/sector, area, Karachi"
                value={formData.destinationAddress}
                onChange={(e) => {
                  handleChange('destinationAddress', e.target.value);
                  handleChange('destinationLat', null);
                  handleChange('destinationLng', null);
                }}
                onBlur={async (e) => {
                  const val = e.target.value.trim();
                  if (!val) return;
                  const geo = await validateAddress(val);
                  if (geo) {
                    handleChange('destinationLat', geo.lat);
                    handleChange('destinationLng', geo.lng);
                  }
                }}
              />
              {formData.destinationLat && (
                <p className="text-xs text-emerald-600 mt-1 ml-1">✅ Address map pe mil gaya</p>
              )}
              <p className="text-xs text-slate-400 mt-1 ml-1">Ya neeche map pe click karein</p>
              <LocationPickerMap
                externalCoords={formData.destinationLat ? { lat: formData.destinationLat, lng: formData.destinationLng } : null}
                onSelect={(addr, coords) => {
                  handleChange('destinationAddress', addr);
                  if (coords) { handleChange('destinationLat', coords.lat); handleChange('destinationLng', coords.lng); }
                }}
              />
            </div>
          </>
        )}

        <input
          type="number"
          className="w-full p-3 border border-slate-200 rounded-2xl outline-none"
          placeholder="Your Budget"
          value={formData.budgetAmount}
          onChange={(e) => handleChange('budgetAmount', e.target.value)}
        />

        <select
          className="w-full p-3 border border-slate-200 rounded-2xl outline-none bg-white"
          value={formData.paymentMethod}
          onChange={(e) => handleChange('paymentMethod', e.target.value)}
        >
          <option value="cash">Cash on Delivery</option>
          <option value="jazzcash">JazzCash</option>
          <option value="easypaisa">EasyPaisa</option>
          <option value="card">Card</option>
        </select>

        <textarea
          className="w-full p-3 border border-slate-200 rounded-2xl outline-none min-h-[110px]"
          placeholder="Notes / special instructions (optional)"
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-3.5 rounded-2xl font-semibold hover:bg-blue-700 transition-all disabled:bg-slate-400"
        >
          {loading ? 'Submitting...' : pageMeta.button}
        </button>
      </form>

      {createdTrip && (
        <div className="mt-6 p-5 rounded-3xl border border-emerald-200 bg-emerald-50">
          <h3 className="font-bold text-emerald-900 text-xl mb-4">Order Created</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-700">
            <div className="bg-white rounded-2xl p-3 border border-emerald-100">
              <span className="text-xs uppercase text-slate-500 block mb-1">Order ID</span>
              <div className="font-semibold">{createdTrip.id}</div>
            </div>

            <div className="bg-white rounded-2xl p-3 border border-emerald-100">
              <span className="text-xs uppercase text-slate-500 block mb-1">Status</span>
              <div className="font-semibold">{createdTrip.status}</div>
            </div>

            <div className="bg-white rounded-2xl p-3 border border-emerald-100 md:col-span-2">
              <span className="text-xs uppercase text-slate-500 block mb-1">Tracking ID</span>
              <div className="font-mono text-xs break-all">{createdTrip.trackingId}</div>
            </div>

            <div className="bg-white rounded-2xl p-3 border border-emerald-100">
              <span className="text-xs uppercase text-slate-500 block mb-1">Suggested Price</span>
              <div className="font-semibold">
                Rs. {createdTrip.suggested_price || createdTrip.suggestedPrice || 0}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-3 border border-emerald-100">
              <span className="text-xs uppercase text-slate-500 block mb-1">Payment Method</span>
              <div className="font-semibold">
                {createdTrip.payment_method || createdTrip.paymentMethod || formData.paymentMethod}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-3 border border-emerald-100">
              <span className="text-xs uppercase text-slate-500 block mb-1">Payment Status</span>
              <div className="font-semibold">
                {createdTrip.payment_status || createdTrip.paymentStatus || 'pending'}
              </div>
            </div>

            {(createdTrip.budget_amount || createdTrip.budgetAmount) && (
              <div className="bg-white rounded-2xl p-3 border border-emerald-100">
                <span className="text-xs uppercase text-slate-500 block mb-1">Your Budget</span>
                <div className="font-semibold">
                  Rs. {createdTrip.budget_amount || createdTrip.budgetAmount}
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-1">
                Customer Tracking Link
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  readOnly
                  value={trackingLink}
                  className="flex-1 min-w-0 p-2.5 text-xs border border-slate-200 rounded-2xl bg-white"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => copyText(trackingLink, '✅ Tracking link copied')}
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-2xl text-xs font-semibold hover:bg-blue-700 whitespace-nowrap"
                  >
                    Copy
                  </button>
                  <a
                    href={trackingLink}
                    className="px-4 py-2.5 bg-emerald-600 text-white rounded-2xl text-xs font-semibold hover:bg-emerald-700 whitespace-nowrap flex items-center"
                  >
                    Track Now
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateTripForm;