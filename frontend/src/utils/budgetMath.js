// Mirrors backend/src/common/calculations.py so the UI updates instantly.
// The server remains the source of truth for stored data and alerts.
export const CATEGORIES = ['transportation', 'accommodation', 'meals', 'activities', 'miscellaneous'];

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export const totalSpent = (expenses) => round2((expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0));

export const categorySpent = (expenses, category) =>
  round2((expenses || []).filter((e) => e.category === category).reduce((s, e) => s + (Number(e.amount) || 0), 0));

export const remaining = (budget, spent) => round2((Number(budget) || 0) - (Number(spent) || 0));

export const percentUsed = (budget, spent) => {
  const b = Number(budget) || 0;
  return b <= 0 ? 0 : Math.round(((Number(spent) || 0) / b) * 1000) / 10;
};

// 'no_budget' | 'ok' | 'warning' (>= 80%) | 'exceeded' (>= 100%)
export const thresholdStatus = (budget, spent) => {
  const b = Number(budget) || 0;
  if (b <= 0) return 'no_budget';
  const pct = ((Number(spent) || 0) / b) * 100;
  if (pct >= 100) return 'exceeded';
  if (pct >= 80) return 'warning';
  return 'ok';
};

export const isOverspending = (expenses, budgetData, category) =>
  (Number(budgetData[category]) || 0) > 0 && categorySpent(expenses, category) > Number(budgetData[category]);

export const inr = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;
