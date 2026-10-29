import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Share from '../components/Share';
import { Loading, ErrorBox, Notice } from '../components/StatusViews';
import api from '../services/api';
import { inr } from '../utils/budgetMath';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState('');
  const [filter, setFilter] = useState('all');
  const [shareTrip, setShareTrip] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([api.listTrips(), api.dashboard()])
      .then(([t, d]) => {
        setTrips(t);
        setTotals(d);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  const getStatus = (start, end) => {
    const today = new Date().setHours(0, 0, 0, 0);
    const s = new Date(start).setHours(0, 0, 0, 0);
    const e = new Date(end).setHours(0, 0, 0, 0);
    return today < s ? 'upcoming' : today > e ? 'completed' : 'ongoing';
  };

  const getDays = (start, end) => Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1;

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const openTrip = (trip, page) => navigate(`/${page}?tripId=${trip.id}`);

  const deleteTrip = async (id) => {
    if (!window.confirm('Delete this trip?')) return;
    setActionError('');
    try {
      await api.deleteTrip(id);
      load();
    } catch (e) {
      setActionError(e.message);
    }
  };

  const statusIcons = { upcoming: '📅', ongoing: '✈️', completed: '✓' };
  const statusColors = { upcoming: '#4CAF50', ongoing: '#FF9800', completed: '#9E9E9E' };

  const filtered = filter === 'all' ? trips : trips.filter(t => getStatus(t.startDate, t.endDate) === filter);

  if (loading) return <Loading text="Loading your trips..." />;
  if (error) return <ErrorBox error={error} onRetry={load} />;

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <h1 className="dashboard-title">My Trips</h1>
        <p className="dashboard-subtitle">Manage and organize all your travel plans</p>
        <button className="create-trip-btn" onClick={() => navigate('/planner')}>➕ Create New Trip</button>
      </div>

      {/* Stats */}
      {trips.length > 0 && (
        <div className="stats-container">
          <div className="stat-card"><div className="stat-number">{trips.length}</div><div className="stat-label">Total Trips</div></div>
          <div className="stat-card"><div className="stat-number">{trips.filter(t => getStatus(t.startDate, t.endDate) === 'upcoming').length}</div><div className="stat-label">Upcoming</div></div>
          <div className="stat-card"><div className="stat-number">{trips.filter(t => getStatus(t.startDate, t.endDate) === 'ongoing').length}</div><div className="stat-label">Ongoing</div></div>
          <div className="stat-card"><div className="stat-number">{trips.filter(t => getStatus(t.startDate, t.endDate) === 'completed').length}</div><div className="stat-label">Completed</div></div>
        </div>
      )}

      {totals && trips.length > 0 && (
        <div className="stats-container">
          <div className="stat-card"><div className="stat-number">{inr(totals.plannedBudget)}</div><div className="stat-label">Planned Budget</div></div>
          <div className="stat-card"><div className="stat-number">{inr(totals.actualSpending)}</div><div className="stat-label">Actual Spending</div></div>
          <div className="stat-card"><div className="stat-number">{inr(totals.remainingBudget)}</div><div className="stat-label">Remaining</div></div>
          <div className="stat-card"><div className="stat-number">{totals.tripsInWarning + totals.tripsExceeded}</div><div className="stat-label">Budget Alerts</div></div>
        </div>
      )}
      <Notice kind="error">{actionError}</Notice>

      {/* Filters */}
      {trips.length > 0 && (
        <div className="filter-section">
          {['all', 'upcoming', 'ongoing', 'completed'].map(f => (
            <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All Trips' : `${statusIcons[f]} ${f}`}
            </button>
          ))}
        </div>
      )}

      {/* Trips Grid */}
      {filtered.length > 0 ? (
        <div className="trips-grid">
          {filtered.map(trip => {
            const status = getStatus(trip.startDate, trip.endDate);
            const days = getDays(trip.startDate, trip.endDate);
            return (
              <div key={trip.id} className="trip-card">
                <div className="trip-header">
                  <div>
                    <div className="trip-destination">{trip.to}</div>
                    <div className="trip-route">From {trip.from} → {trip.to}</div>
                  </div>
                  <div className="trip-status-badge" style={{ backgroundColor: `${statusColors[status]}20`, color: statusColors[status] }}>
                    {statusIcons[status]} {status}
                  </div>
                </div>
                <div className="trip-details">
                  <div className="detail-row"><span className="detail-label">📅 Duration</span><span className="detail-value">{days} days</span></div>
                  <div className="detail-row"><span className="detail-label">📆 Dates</span><span className="detail-value">{formatDate(trip.startDate)} - {formatDate(trip.endDate)}</span></div>
                  <div className="detail-row"><span className="detail-label">👥 Travelers</span><span className="detail-value">{trip.travelers || 1}</span></div>
                  <div className="detail-row"><span className="detail-label">💰 Budget</span><span className="detail-value">{inr(trip.budget)}</span></div>
                </div>
                <div className="trip-actions">
                  <button className="action-btn primary" onClick={() => openTrip(trip, 'itinerary')}>📋 Itinerary</button>
                  <button className="action-btn secondary" onClick={() => openTrip(trip, 'budget')}>💵 Budget</button>
                  <button className="action-btn secondary" onClick={() => setShareTrip(shareTrip?.id === trip.id ? null : trip)}>🔗 Share</button>
                  <button className="action-btn danger" onClick={() => deleteTrip(trip.id)}>🗑️ Delete</button>
                </div>
                {shareTrip?.id === trip.id && <Share tripData={trip} />}
              </div>
            );
          })}
        </div>
      ) : trips.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">✈️</div>
          <div className="empty-title">No Trips Yet</div>
          <div className="empty-text">Start planning your next adventure by creating a new trip</div>
          <button className="create-trip-btn" onClick={() => navigate('/planner')}>➕ Create Your First Trip</button>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <div className="empty-title">No {filter} trips found</div>
          <div className="empty-text">Try adjusting your filter</div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
