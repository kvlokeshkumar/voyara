import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SummaryPage from './SummaryPage';
import { Loading, ErrorBox, Notice } from '../components/StatusViews';
import useTripId from '../hooks/useTripId';
import api from '../services/api';
import './Itinerary.css';

const Itinerary = () => {
  const { tripId, resolving, noTrips, error: tripError } = useTripId();
  const [trip, setTrip] = useState(null);
  const [activeDay, setActiveDay] = useState(1);
  const [showSummary, setShowSummary] = useState(false);
  const [itineraryData, setItineraryData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState({ text: '', kind: 'info' });

  const [form, setForm] = useState({ time: '', activity: '', cost: '' });

  const load = useCallback(() => {
    if (!tripId) return;
    setLoading(true);
    setError(null);
    Promise.all([api.getTrip(tripId), api.getItinerary(tripId)])
      .then(([t, it]) => {
        setTrip(t);
        setItineraryData(it.days);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, [tripId]);

  useEffect(() => {
    load();
  }, [load]);

  // Every change is stored in the database (replaces the old localStorage writes).
  const persist = async (days, okMessage) => {
    setSaving(true);
    try {
      const saved = await api.saveItinerary(tripId, days);
      setItineraryData(saved.days);
      setNotice({ text: okMessage || '', kind: 'info' });
      return saved;
    } catch (e) {
      setNotice({ text: e.message, kind: 'error' });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleRestart = async () => {
    if (window.confirm("Start fresh? This deletes all activities.")) {
      await persist({}, 'Itinerary cleared.');
      setActiveDay(1);
    }
  };

  const addActivity = async (e) => {
    e.preventDefault();
    const newDayData = [...(itineraryData[`day${activeDay}`] || []), { ...form }];
    const updated = { ...itineraryData, [`day${activeDay}`]: newDayData };
    const saved = await persist(updated);
    if (saved) setForm({ time: '', activity: '', cost: '' });
  };

  const saveItinerary = async () => {
    const saved = await persist(itineraryData);
    if (saved) setNotice({ text: `Itinerary saved successfully! Total cost: ₹${saved.totalPlanned}`, kind: 'info' });
  };

  const loadItinerary = () => {
    setNotice({ text: '', kind: 'info' });
    load();
  };

  if (resolving) return <Loading text="Opening your trip..." />;
  if (tripError) return <ErrorBox error={tripError} />;
  if (noTrips) {
    return (
      <div className="v-status">
        <h2>No trips yet</h2>
        <p>Create a trip first, then build its itinerary.</p>
        <Link to="/planner">Plan a trip</Link>
      </div>
    );
  }
  if (loading) return <Loading text="Loading itinerary..." />;
  if (error) return <ErrorBox error={error} onRetry={load} />;

  if (showSummary) return <SummaryPage itineraryData={itineraryData} trip={trip} onBack={() => setShowSummary(false)} />;

  return (
    <div className="planner-wrapper">
      <div className="itinerary-container">
        
        <div className="top-bar">
          <button onClick={handleRestart} className="btn-text-only" disabled={saving}>Restart Trip</button>
          <h1>{trip.to} Itinerary</h1>
          <div className="itinerary-actions">
            <button onClick={saveItinerary} className="btn-save" disabled={saving}>Save</button>
            <button onClick={loadItinerary} className="btn-load" disabled={saving}>Reload</button>
          </div>
        </div>

        <Notice kind={notice.kind}>{notice.text}</Notice>

        <div className="day-nav">
          {Array.from({ length: trip.days }, (_, i) => i + 1).map(d => (
            <button key={d} className={`day-tab ${activeDay === d ? 'active' : ''}`} onClick={() => setActiveDay(d)}>
              Day {d}
            </button>
          ))}
        </div>

        <div className="main-white-box">
          <div className="side list-side">
            <div className="side-header">
              <h2>Day {activeDay}</h2>
              <span className="price-tag">
                ₹{(itineraryData[`day${activeDay}`] || []).reduce((s, a) => s + (parseFloat(a.cost) || 0), 0)}
              </span>
            </div>
            <div className="scroll-list">
              {(itineraryData[`day${activeDay}`] || []).map(act => (
                <div key={act.id} className="row">
                  <div className="row-info">
                    <span className="row-time">{act.time}</span>
                    <span className="row-name">{act.activity}</span>
                  </div>
                  <span className="row-cost">₹{act.cost}</span>
                </div>
              ))}
              {(!itineraryData[`day${activeDay}`] || itineraryData[`day${activeDay}`].length === 0) && (
                <p className="placeholder-text">No activities planned yet.</p>
              )}
            </div>
          </div>

          <div className="side form-side">
            <h3>Add Activity</h3>
            <form onSubmit={addActivity}>
              <div className="field">
                <label>Activity Name</label>
                <input type="text" placeholder="e.g. Dinner at the Beach" value={form.activity} onChange={e => setForm({...form, activity: e.target.value})} required />
              </div>
              
              <div className="row-input">
                <div className="field">
                  <label>Time</label>
                  <input type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})} required />
                </div>
                <div className="field">
                  <label>Cost (₹)</label>
                  <input type="number" placeholder="0" value={form.cost} onChange={e => setForm({...form, cost: e.target.value})} />
                </div>
              </div>
              
              <button type="submit" className="btn-main" disabled={saving}>{saving ? 'Saving...' : 'Add Activity'}</button>
            </form>
          </div>
        </div>

        <div className="bottom-nav">
          <button onClick={() => setShowSummary(true)} className="btn-outline">View Summary →</button>
        </div>

      </div>
    </div>
  );
};

export default Itinerary;