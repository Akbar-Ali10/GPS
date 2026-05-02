import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import TrackingMap from '../components/TrackingMap';
import { getTrackingData, updateTripBudget, submitReview } from '../services/apiService';
import './CustomerTrackingPage.css';

const goHome = () => { window.location.href = '/'; };

const CustomerTrackingPage = () => {
  const { trackingId } = useParams();
  const [tripData, setTripData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [budgetInput, setBudgetInput] = useState('');
  const [updatingBudget, setUpdatingBudget] = useState(false);

  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [uiMessage, setUiMessage] = useState(null);

  const fetchTripData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getTrackingData(trackingId);
      setTripData(data);

      if (data?.budgetAmount) {
        setBudgetInput(data.budgetAmount);
      }
    } catch (err) {
      setError('Failed to load tracking data');
    } finally {
      setLoading(false);
    }
  }, [trackingId]);

  useEffect(() => {
    fetchTripData();
    const interval = setInterval(fetchTripData, 5000);
    return () => clearInterval(interval);
  }, [fetchTripData]);

  if (loading && !tripData) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  const customerName = tripData.customerName || 'Customer';
  const driverName = tripData.driverName || 'Driver';
  const status = tripData.status;

  const handleUpdateBudget = async () => {
    try {
      setUpdatingBudget(true);
      await updateTripBudget(tripData.tripId, budgetInput);
      await fetchTripData();
    } finally {
      setUpdatingBudget(false);
    }
  };

  const handleReviewSubmit = async () => {
    try {
      setSubmittingReview(true);
      await submitReview(tripData.tripId, {
        rating,
        review_text: reviewText,
      });
      setReviewSuccess(true);
      await fetchTripData();
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="customer-tracking-page pb-20">

      {status === 'completed' ? (
        <div className="max-w-xl mx-auto p-6 bg-white rounded-2xl shadow-lg mt-8 text-center">

          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-black mb-2">Order Completed!</h2>
          <p className="mb-6">Your delivery was successful.</p>

          {!tripData.hasReview && !reviewSuccess ? (

            <div className="bg-gray-100 p-4 rounded-xl">

              <h3 className="mb-3 font-bold">Rate Driver ({driverName})</h3>

              <div className="flex justify-center gap-2 mb-4">
                {[1,2,3,4,5].map(star => (
                  <button key={star} onClick={() => setRating(star)}>
                    {rating >= star ? '⭐' : '☆'}
                  </button>
                ))}
              </div>

              <textarea
                value={reviewText}
                onChange={(e)=>setReviewText(e.target.value)}
                className="w-full p-2 mb-3"
                placeholder="Write review..."
              />

              <button
                onClick={handleReviewSubmit}
                className="w-full bg-blue-600 text-white py-2 rounded"
              >
                Submit Review
              </button>

              {/* 🔥 SKIP BUTTON */}
              <button
                onClick={() => (goHome())}
                className="w-full mt-3 bg-black text-white py-2 rounded"
              >
                Skip / Go Home
              </button>

            </div>

          ) : (

            <div>
              <div className="bg-green-100 p-4 rounded mb-4">
                Thank you for your feedback ⭐ {tripData.rating || rating}/5
              </div>

              {/* 🔥 FINAL HOME BUTTON */}
              <button
                onClick={() => (goHome())}
                className="w-full bg-blue-600 text-white py-3 rounded"
              >
                Go to Home
              </button>
            </div>

          )}

        </div>

      ) : (

        <TrackingMap
          trackingId={trackingId}
          customerName={customerName}
          driverName={driverName}
          tripData={tripData}
          onRefreshTrip={fetchTripData}
        />

      )}

    </div>
  );
};

export default CustomerTrackingPage;