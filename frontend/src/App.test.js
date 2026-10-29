// Pure-logic tests (no browser charts needed). Run: CI=true npm test -- --watchAll=false
import {
  categorySpent, inr, isOverspending, percentUsed, remaining, thresholdStatus, totalSpent,
} from './utils/budgetMath';

const expenses = [
  { category: 'meals', amount: 100.1 },
  { category: 'meals', amount: 0.2 },
  { category: 'activities', amount: 300 },
];

test('totals add up without floating point drift', () => {
  expect(totalSpent(expenses)).toBe(400.3);
  expect(totalSpent([])).toBe(0);
  expect(categorySpent(expenses, 'meals')).toBe(100.3);
  expect(remaining(1000, 400.3)).toBe(599.7);
});

test('percentage handles a zero budget', () => {
  expect(percentUsed(1000, 250)).toBe(25);
  expect(percentUsed(0, 250)).toBe(0);
});

test('80% warning and 100% exceeded thresholds', () => {
  expect(thresholdStatus(1000, 799)).toBe('ok');
  expect(thresholdStatus(1000, 800)).toBe('warning');
  expect(thresholdStatus(1000, 999.99)).toBe('warning');
  expect(thresholdStatus(1000, 1000)).toBe('exceeded');
  expect(thresholdStatus(0, 50)).toBe('no_budget');
});

test('category overspending only when a category budget is set', () => {
  expect(isOverspending(expenses, { activities: 200, meals: 0 }, 'activities')).toBe(true);
  expect(isOverspending(expenses, { activities: 200, meals: 0 }, 'meals')).toBe(false);
});

test('currency formatting', () => {
  expect(inr(1500)).toBe('₹1,500');
  expect(inr(undefined)).toBe('₹0');
});
