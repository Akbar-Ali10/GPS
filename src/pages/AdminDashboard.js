import React, { useState } from 'react';
import TripList from '../components/TripList';
import CreateTripForm from '../components/CreateTripForm';
import { createDriver } from '../services/apiService';

const AdminDashboard = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [driverForm, setDriverForm] = useState({
    name: '',
    phone: '',
    status: 'offline',
  });

  const [driverLoading, setDriverLoading] = useState(false);
  const [driverMessage, setDriverMessage] = useState(null);

  const handleTripCreated = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleDriverCreated = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleDriverFormChange = (field, value) => {
    setDriverForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCreateDriver = async (e) => {
    e.preventDefault();

    if (!driverForm.name.trim() || !driverForm.phone.trim()) {
      setDriverMessage('❌ Driver name aur phone required hain');
      return;
    }

    try {
      setDriverLoading(true);
      setDriverMessage(null);

      const res = await createDriver(
        driverForm.name.trim(),
        driverForm.phone.trim(),
        driverForm.status
      );

      if (res.success) {
        setDriverMessage('✅ Driver created successfully');
        setDriverForm({
          name: '',
          phone: '',
          status: 'offline',
        });

        handleDriverCreated();

        setTimeout(() => {
          setDriverMessage(null);
        }, 3000);
      }
    } catch (err) {
      setDriverMessage(
        '❌ Error: ' + (err.response?.data?.error || 'Failed to create driver')
      );
    } finally {
      setDriverLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-7">
          <h1 className="text-3xl md:text-4xl font-bold">Admin Dashboard</h1>
          <p className="text-blue-100 mt-2 text-sm md:text-base">
            Manage trips, drivers, and real-time tracking
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          <div className="xl:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-5 overflow-hidden">
              <TripList refreshTrigger={refreshTrigger} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-5">
              <CreateTripForm onTripCreated={handleTripCreated} />

              <div className="mt-8 pt-6 border-t border-slate-200">
                <h2 className="text-xl font-bold text-slate-900 mb-1">Add Driver</h2>
                <p className="text-sm text-slate-500 mb-4">
                  Naya driver add karo taake trip assign kar sako.
                </p>

                {driverMessage && (
                  <div className="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-700">
                    {driverMessage}
                  </div>
                )}

                <form onSubmit={handleCreateDriver} className="space-y-4">
                  <input
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    placeholder="Driver Name"
                    value={driverForm.name}
                    onChange={(e) => handleDriverFormChange('name', e.target.value)}
                  />

                  <input
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    placeholder="Phone Number"
                    value={driverForm.phone}
                    onChange={(e) => handleDriverFormChange('phone', e.target.value)}
                  />

                  <select
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white"
                    value={driverForm.status}
                    onChange={(e) => handleDriverFormChange('status', e.target.value)}
                  >
                    <option value="offline">Offline</option>
                    <option value="online">Online</option>
                  </select>

                  <button
                    type="submit"
                    disabled={driverLoading}
                    className="w-full bg-emerald-600 text-white p-3 rounded-xl font-semibold hover:bg-emerald-700 transition-all disabled:bg-slate-400"
                  >
                    {driverLoading ? 'Adding Driver...' : 'Add Driver'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Quick Actions</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/"
              className="p-4 rounded-2xl border border-blue-100 bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              <div className="text-2xl mb-2">🏠</div>
              <div className="font-semibold text-slate-900">Home</div>
              <div className="text-sm text-slate-600 mt-1">Go to main page</div>
            </a>

            <div className="p-4 rounded-2xl border border-emerald-100 bg-emerald-50">
              <div className="text-2xl mb-2">📍</div>
              <div className="font-semibold text-slate-900">Tracking</div>
              <div className="text-sm text-slate-600 mt-1">
                Create trip and share tracking links
              </div>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="p-4 rounded-2xl border border-violet-100 bg-violet-50 hover:bg-violet-100 transition-colors text-left"
            >
              <div className="text-2xl mb-2">🔄</div>
              <div className="font-semibold text-slate-900">Refresh</div>
              <div className="text-sm text-slate-600 mt-1">Reload dashboard data</div>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;