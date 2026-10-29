import React from 'react';
import './Summary.css';

const SummaryPage = ({ itineraryData, trip, onBack }) => {
  
  const calculateGrandTotal = () => {
    return Object.values(itineraryData).reduce((total, day) => {
      return total + day.reduce((dayTotal, act) => dayTotal + (parseFloat(act.cost) || 0), 0);
    }, 0);
  };

  return (
    <div className="planner-page-layout">
      <div className="summary-container">

        <div className="summary-header">
          <button onClick={onBack} className="btn-back">← Back to Editor</button>
          <h1>Trip Summary: {trip.to}</h1>
          <div className="overall-budget">
            <span>Overall Budget Planned:</span>
            <span className="grand-total">₹{calculateGrandTotal().toFixed(2)}</span>
          </div>
        </div>

        <div className="summary-card-main">
          {Object.keys(itineraryData).length === 0 ? (
            <p className="no-data">No activities planned yet.</p>
          ) : (
            Object.keys(itineraryData).sort((a, b) => parseInt(a.replace('day', ''), 10) - parseInt(b.replace('day', ''), 10)).map((dayKey) => {
              const dayNum = dayKey.replace('day', '');
              const activities = itineraryData[dayKey];
              
              if (activities.length === 0) return null;

              return (
                <div key={dayKey} className="summary-day-section">
                  <div className="day-title-row">
                    <h3>Day {dayNum}</h3>
                    <hr />
                  </div>
                  <div className="summary-list">
                    {activities.map((act) => (
                      <div key={act.id} className="summary-item">
                        <div className="item-left">
                          <span className="item-time">{act.time}</span>
                          <span className="item-name">{act.activity}</span>
                        </div>
                        <span className="item-price">₹{act.cost}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="summary-footer">
          <button className="btn-download" onClick={() => window.print()}>
            Download as PDF / Print
          </button>
          <p className="footer-tag">VOYARA™ | SMART TRAVEL © 2026</p>
        </div>
      </div>
    </div>
  );
};

export default SummaryPage;