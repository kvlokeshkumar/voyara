import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Share from '../components/Share';
import { Loading, ErrorBox } from '../components/StatusViews';
import api from '../services/api';
import './TripCreated.css';

const TripCreated = () => {
  const [params] = useSearchParams();
  const tripId = params.get('tripId');
  const [tripData, setTripData] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const load = useCallback(() => {
    setError(null);
    if (!tripId) {
      setError('No trip selected. Open a trip from your dashboard.');
      return;
    }
    api.getTrip(tripId).then(setTripData).catch(setError);
  }, [tripId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleItineraryClick = () => navigate(`/itinerary?tripId=${tripData.id}`);

  if (error) return <ErrorBox error={error} onRetry={tripId ? load : undefined} />;
  if (!tripData) return <Loading text="Loading trip details..." />;

  return (
    <div className="trip-page-layout">
      <h1 className="main-title">Plan Your Trip</h1>
      <p className="main-subtitle">Fill in the details below to create your perfect itinerary.</p>

      <div className="success-card">
        {/* The Airplane Icon Circle */}
        <div className="icon-circle">
          <span className="airplane-icon">✈</span>
        </div>

        <h2 className="success-title">Trip Created!</h2>
        <p className="success-message">
          Your trip from <strong>{tripData.from}</strong> to <strong>{tripData.to}</strong> is planned from {tripData.startDate} to {tripData.endDate}.
        </p>

        {/* The Pinkish Data Summary Box */}
        <div className="info-summary-box">
          <p><strong>Travelers:</strong> {tripData.travelers}</p>
          <p><strong>Budget:</strong> ₹{tripData.budget}</p>
          <p><strong>Notes:</strong> {tripData.notes || "None"}</p>
        </div>

        <Share tripData={tripData} />

        <button className="itinerary-btn" onClick={handleItineraryClick}>
          Build Day-by-Day Itinerary
        </button>

        <Link to={`/budget?tripId=${tripData.id}`} className="back-link">Manage Budget</Link>
        <Link to="/planner" className="back-link">Plan Another Trip</Link>
      </div>
    </div>
  );
};

export default TripCreated;
