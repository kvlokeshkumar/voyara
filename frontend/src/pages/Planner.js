import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Notice } from '../components/StatusViews';
import './Planner.css';

const Planner = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    from: "", to: "", startDate: "", endDate: "", travelers: 1, budget: 0, notes: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const trip = await api.createTrip({
        ...form,
        travelers: parseInt(form.travelers, 10) || 1,
        budget: parseFloat(form.budget) || 0,
      });
      navigate(`/trip-created?tripId=${trip.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="planner-page-layout">
      <div className="planner-card">
        <h1 className="planner-title">Plan Your Trip</h1>
        <p className="planner-subtitle">Fill in the details below to create your perfect itinerary.</p>

        <Notice kind="error">{error}</Notice>

        <form onSubmit={handleSubmit}>
          <div className="planner-grid">
            <div className="field">
              <label>From (Source)</label>
              <input name="from" placeholder="e.g. New York" required onChange={handleChange} />
            </div>
            <div className="field">
              <label>To (Destination)</label>
              <input name="to" placeholder="e.g. Bali, Indonesia" required onChange={handleChange} />
            </div>
            <div className="field">
              <label>Start Date</label>
              <input name="startDate" type="date" required onChange={handleChange} />
            </div>
            <div className="field">
              <label>End Date</label>
              <input name="endDate" type="date" required onChange={handleChange} />
            </div>
            <div className="field">
              <label>Travelers</label>
              <input name="travelers" type="number" min="1" defaultValue="1" onChange={handleChange} />
            </div>
            <div className="field">
              <label>Budget (₹ INR)</label>
              <input name="budget" type="number" placeholder="e.g. 50000" onChange={handleChange} />
            </div>
            
            <div className="field full">
              <label>Additional Notes</label>
              <textarea 
                name="notes" 
                placeholder="Any preferences, allergies, must-see places..." 
                rows="4" 
                onChange={handleChange} 
              />
            </div>
          </div>

          <button type="submit" className="plan-btn" disabled={saving}>{saving ? 'Saving...' : 'Create Trip Plan'}</button>
        </form>
      </div>
    </div>
  );
};

export default Planner;