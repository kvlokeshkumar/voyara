import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Share from '../components/Share';
import BudgetAlert from '../components/BudgetAlert';
import { CategoryChart, PlannedActualChart } from '../components/Charts';
import { Loading, ErrorBox, Notice } from '../components/StatusViews';
import useTripId from '../hooks/useTripId';
import api from '../services/api';
import {
  CATEGORIES,
  categorySpent,
  inr,
  isOverspending,
  percentUsed,
  remaining,
  thresholdStatus,
  totalSpent,
} from '../utils/budgetMath';
import './Budget.css';

const LABELS = {
  transportation: 'Transportation',
  accommodation: 'Accommodation',
  meals: 'Meals',
  activities: 'Activities',
  miscellaneous: 'Miscellaneous',
};

const EMPTY_BUDGET = { totalBudget: 0, transportation: 0, accommodation: 0, meals: 0, activities: 0, miscellaneous: 0, alertsEnabled: false };

const Budget = () => {
  const { tripId, resolving, noTrips, error: tripError } = useTripId();
  const [trip, setTrip] = useState(null);
  const [budgetData, setBudgetData] = useState(EMPTY_BUDGET);
  const [expenses, setExpenses] = useState([]);
  const [planned, setPlanned] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState({ text: '', kind: 'info' });
  const [busy, setBusy] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ category: 'transportation', description: '', amount: '' });

  const say = (text, kind = 'info') => setNotice({ text, kind });

  const load = useCallback(() => {
    if (!tripId) return;
    setLoading(true);
    setError(null);
    Promise.all([api.getTrip(tripId), api.getBudget(tripId), api.listExpenses(tripId), api.getSummary(tripId)])
      .then(([t, b, e, s]) => {
        setTrip(t);
        setBudgetData(b);
        setExpenses(e);
        setPlanned(s.plannedVsActual.planned);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, [tripId]);

  useEffect(() => {
    load();
  }, [load]);

  const saveBudget = async () => {
    setBusy(true);
    try {
      const saved = await api.saveBudget(tripId, budgetData);
      setBudgetData(saved);
      say('Budget saved successfully!');
    } catch (e) {
      say(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleBudgetChange = (e) => {
    const { name, value } = e.target;
    setBudgetData((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const handleExpenseChange = (e) => {
    const { name, value } = e.target;
    setExpenseForm((prev) => ({ ...prev, [name]: value }));
  };

  const addExpense = async (e) => {
    e.preventDefault();
    if (!expenseForm.description || !expenseForm.amount) {
      say('Please fill in all fields', 'error');
      return;
    }
    setBusy(true);
    try {
      const { expense, threshold } = await api.addExpense(tripId, {
        category: expenseForm.category,
        description: expenseForm.description,
        amount: parseFloat(expenseForm.amount),
      });
      setExpenses((prev) => [expense, ...prev]);
      setExpenseForm({ category: 'transportation', description: '', amount: '' });
      say(threshold.status === 'exceeded' ? 'Expense added. You are over budget!' : 'Expense added.');
    } catch (err) {
      say(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const deleteExpense = async (id) => {
    try {
      await api.deleteExpense(id);
      setExpenses((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      say(err.message, 'error');
    }
  };

  const exportReport = async (format) => {
    setBusy(true);
    say('');
    try {
      const r = await api.exportReport(tripId, format);
      const a = document.createElement('a');
      a.href = r.downloadUrl;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      say(`${format.toUpperCase()} report saved to cloud storage and downloading.`);
    } catch (err) {
      say(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (resolving) return <Loading text="Opening your trip..." />;
  if (tripError) return <ErrorBox error={tripError} />;
  if (noTrips) {
    return (
      <div className="v-status">
        <h2>No trips yet</h2>
        <p>Create a trip first, then manage its budget here.</p>
        <Link to="/planner">Plan a trip</Link>
      </div>
    );
  }
  if (loading) return <Loading text="Loading budget..." />;
  if (error) return <ErrorBox error={error} onRetry={load} />;

  const spent = totalSpent(expenses);
  const left = remaining(budgetData.totalBudget, spent);
  const status = thresholdStatus(budgetData.totalBudget, spent);
  const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, categorySpent(expenses, c)]));

  return (
    <div className="budget-container">
      <div className="budget-header">
        <h1>Budget Manager</h1>
        <p>Track your travel expenses and stay within budget{trip ? ` for ${trip.to}` : ''}</p>
        <div className="budget-actions">
          <button onClick={saveBudget} className="btn-save" disabled={busy}>Save Budget</button>
          <button onClick={load} className="btn-load" disabled={busy}>Refresh</button>
        </div>
        <div className="v-actions">
          <button onClick={() => exportReport('csv')} disabled={busy}>Download CSV report</button>
          <button onClick={() => exportReport('pdf')} disabled={busy}>Download PDF report</button>
        </div>
        <Notice kind={notice.kind}>{notice.text}</Notice>
      </div>
      <Share tripData={trip} />
      <BudgetAlert status={status} totalBudget={budgetData.totalBudget} spent={spent} />
      <div className="budget-overview">
        <div className="overview-card">
          <h3>Total Budget</h3>
          <p className="amount">{inr(budgetData.totalBudget)}</p>
        </div>
        <div className="overview-card">
          <h3>Itinerary Activities</h3>
          <p className="amount">{inr(planned)}</p>
        </div>
        <div className="overview-card">
          <h3>Total Spent</h3>
          <p className="amount spent">{inr(spent)}</p>
        </div>
        <div className={`overview-card ${left < 0 ? 'overspend' : ''}`}>
          <h3>Remaining</h3>
          <p className="amount">{inr(left)}</p>
        </div>
        <div className="overview-card">
          <h3>Budget Used</h3>
          <p className="percentage">{percentUsed(budgetData.totalBudget, spent).toFixed(1)}%</p>
        </div>
      </div>
      <div className="budget-section">
        <h2>Set Your Budget</h2>
        <div className="budget-form">
          <div className="form-group">
            <label>Total Budget (₹)</label>
            <input type="number" name="totalBudget" value={budgetData.totalBudget} onChange={handleBudgetChange} placeholder="Enter total budget" min="0" />
          </div>

          <div className="categories-grid">
            {CATEGORIES.map((c) => (
              <div className="form-group" key={c}>
                <label>{LABELS[c]} (₹)</label>
                <input type="number" name={c} value={budgetData[c]} onChange={handleBudgetChange} placeholder="0" min="0" />
              </div>
            ))}
          </div>
          <label className="v-toggle">
            <input
              type="checkbox"
              checked={budgetData.alertsEnabled}
              onChange={(e) => setBudgetData((prev) => ({ ...prev, alertsEnabled: e.target.checked }))}
            />
            Email me when I reach 80% and 100% of this budget (save the budget to apply)
          </label>
        </div>
      </div>
      <div className="budget-section">
        <h2>Add Expense</h2>
        <form onSubmit={addExpense} className="expense-form">
          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select name="category" value={expenseForm.category} onChange={handleExpenseChange}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Description</label>
              <input type="text" name="description" value={expenseForm.description} onChange={handleExpenseChange} placeholder="Flight to Bali" maxLength={255} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Amount (₹)</label>
              <input type="number" name="amount" value={expenseForm.amount} onChange={handleExpenseChange} placeholder="0" step="0.01" min="0.01" required />
            </div>
            <button type="submit" className="btn-add-expense" disabled={busy}>Add Expense</button>
          </div>
        </form>
      </div>
      <div className="budget-section">
        <h2>Category Breakdown</h2>
        <div className="categories-breakdown">
          {CATEGORIES.map((c) => {
            const catSpent = byCategory[c];
            const catBudget = Number(budgetData[c]) || 0;
            const over = isOverspending(expenses, budgetData, c);
            return (
              <div key={c} className={`category-card ${over ? 'overspend' : ''}`}>
                <div className="category-header">
                  <h3>{LABELS[c]}</h3>
                  <span className="category-amount">{inr(catSpent)} / {inr(catBudget)}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: catBudget > 0 ? `${Math.min((catSpent / catBudget) * 100, 100)}%` : '0%' }}></div>
                </div>
                <p className="progress-text">
                  {percentUsed(catBudget, catSpent).toFixed(1)}% used
                  {over && <span className="overspend-warning"> (Over budget!)</span>}
                </p>
              </div>
            );
          })}
        </div>
      </div>
      <div className="budget-section">
        <h2>Spending Charts</h2>
        <div className="v-charts-row">
          <CategoryChart byCategory={byCategory} />
          <PlannedActualChart planned={planned} actual={spent} />
        </div>
      </div>
      <div className="budget-section">
        <h2>Recent Expenses</h2>
        <div className="expenses-list">
          {expenses.length === 0 ? (
            <p className="no-expenses">No expenses added yet. Start tracking your spending!</p>
          ) : (
            expenses.map((expense) => (
              <div key={expense.id} className="expense-item">
                <div className="expense-info">
                  <span className="expense-description">{expense.description}</span>
                  <span className="expense-date">{new Date(expense.date).toLocaleDateString()}</span>
                </div>
                <div className="expense-actions">
                  <span className="expense-amount">{inr(expense.amount)}</span>
                  <button onClick={() => deleteExpense(expense.id)} className="btn-delete" aria-label={`Delete ${expense.description}`}>
                    ×
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Budget;
