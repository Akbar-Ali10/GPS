import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CustomerTrackingPage from './pages/CustomerTrackingPage';
import AdminDashboard from './pages/AdminDashboard';
import DriverApp from './pages/DriverApp';
import 'leaflet/dist/leaflet.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen">
        <Routes>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/driver/:trackingId" element={<DriverApp />} />
          <Route path="/track/:trackingId" element={<CustomerTrackingPage />} />

          <Route
            path="/"
            element={
              <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
                <nav className="bg-white shadow-md">
                  <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="text-2xl font-bold text-blue-600">🚚 GPS Tracker</div>
                    <a
                      href="/admin"
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Admin Dashboard
                    </a>
                  </div>
                </nav>

                <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
                  <div className="max-w-2xl w-full mx-4">
                    <div className="bg-white rounded-lg shadow-xl p-8 md:p-12">
                      <div className="text-center">
                        <div className="text-6xl mb-6">📍</div>
                        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
                          GPS Tracking System
                        </h1>
                        <p className="text-xl text-gray-600 mb-8">
                          Real-time delivery tracking with live markers and route history
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                          <a
                            href="/admin"
                            className="p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center gap-2"
                          >
                            <span>⚙️</span> Admin Dashboard
                          </a>
                          <div className="p-4 bg-gray-100 text-gray-800 rounded-lg font-semibold">
                            <span className="block text-sm text-gray-600 mb-1">Track a Delivery</span>
                            <code className="text-sm">/track/tracking-id</code>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                          <div className="p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl mb-2">🗺️</div>
                            <h3 className="font-bold text-gray-800 mb-1">Live Map</h3>
                            <p className="text-sm text-gray-600">Real-time location tracking</p>
                          </div>
                          <div className="p-4 bg-green-50 rounded-lg">
                            <div className="text-2xl mb-2">📊</div>
                            <h3 className="font-bold text-gray-800 mb-1">Admin Panel</h3>
                            <p className="text-sm text-gray-600">Manage trips and drivers</p>
                          </div>
                          <div className="p-4 bg-purple-50 rounded-lg">
                            <div className="text-2xl mb-2">⚡</div>
                            <h3 className="font-bold text-gray-800 mb-1">WebSocket</h3>
                            <p className="text-sm text-gray-600">Instant updates via sockets</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;