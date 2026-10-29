import React, { useCallback, useEffect, useState } from 'react';
import { Loading, ErrorBox } from '../components/StatusViews';
import api from '../services/api';
import { inr } from '../utils/budgetMath';
import './AdminPanel.css';

// Admin access is enforced by the API (Cognito "admins" group). The route guard only hides the page.
const AdminPanel = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setError(null);
    api.adminAnalytics().then(setData).catch(setError);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <ErrorBox error={error.status === 403 ? 'Administrator access required.' : error} onRetry={error.status === 403 ? undefined : load} />;
  if (!data) return <Loading text="Loading analytics..." />;

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <p>Platform analytics (aggregate data only)</p>
      </div>

      <div className="analytics-grid">
        <div className="card"><div>Total Users</div><div className="val">{data.totalUsers}</div></div>
        <div className="card"><div>Total Trips</div><div className="val">{data.totalTrips}</div></div>
        <div className="card"><div>Budget</div><div className="val">{inr(data.totalBudget)}</div></div>
        <div className="card"><div>Spent</div><div className="val">{inr(data.totalSpent)}</div></div>
        <div className="card"><div>Avg Trips</div><div className="val">{data.avgTripsPerUser}</div></div>
        <div className="card"><div>Expenses</div><div className="val">{data.totalExpenses}</div></div>
      </div>

      <div className="section">
        <h2>Top Destinations ({data.topDestinations.length})</h2>
        {data.topDestinations.length > 0 ? (
          <div className="grid">
            {data.topDestinations.map((d) => (
              <div key={d.destination} className="dest-card">
                <div className="name">{d.destination}</div>
                <div className="country">🧳 {d.trips} {d.trips === 1 ? 'trip' : 'trips'}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty">No destinations yet</p>
        )}
      </div>

      <div className="section">
        <h2>Trips Created per Month</h2>
        {data.tripsByMonth.length > 0 ? (
          <div className="table">
            <div className="thead"><div>Month</div><div>Trips</div></div>
            {data.tripsByMonth.map((m) => (
              <div key={m.month} className="tr"><div><strong>{m.month}</strong></div><div>{m.trips}</div></div>
            ))}
          </div>
        ) : (
          <p className="empty">No data</p>
        )}
      </div>

      <div className="section">
        <h2>Recent Trips ({data.recentTrips.length})</h2>
        {data.recentTrips.length > 0 ? (
          <div className="table">
            <div className="thead">
              <div>Destination</div><div>From</div><div>Travelers</div><div>Budget</div><div>Date</div>
            </div>
            {data.recentTrips.map((t) => (
              <div key={t.id} className="tr">
                <div><strong>{t.to}</strong></div><div>{t.from}</div><div>{t.travelers || 1}</div><div>{inr(t.budget)}</div><div>{new Date(t.startDate).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty">No trips</p>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
