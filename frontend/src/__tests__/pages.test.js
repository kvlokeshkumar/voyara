import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

jest.mock('../services/api', () => {
  const api = {
    listTrips: jest.fn(), dashboard: jest.fn(), deleteTrip: jest.fn(), getTrip: jest.fn(),
    getBudget: jest.fn(), listExpenses: jest.fn(), getSummary: jest.fn(), addExpense: jest.fn(),
    deleteExpense: jest.fn(), saveBudget: jest.fn(), getItinerary: jest.fn(), saveItinerary: jest.fn(),
    exportReport: jest.fn(),
  };
  return { __esModule: true, default: api, api, setUnauthorizedHandler: jest.fn() };
});
jest.mock('../components/Charts', () => ({
  CategoryChart: () => <div data-testid="category-chart" />,
  PlannedActualChart: () => <div data-testid="planned-chart" />,
}));
jest.mock('../auth/AuthContext', () => ({ useAuth: jest.fn(), AuthProvider: ({ children }) => children }));

const api = require('../services/api').default;
const { useAuth } = require('../auth/AuthContext');
const Budget = require('../pages/Budget').default;
const Dashboard = require('../pages/Dashboard').default;
const Itinerary = require('../pages/Itinerary').default;
const ProtectedRoute = require('../components/ProtectedRoute').default;

const TRIP = { id: 1, from: 'Chennai', to: 'Bali', startDate: '2026-12-10', endDate: '2026-12-12', days: 3, travelers: 2, budget: 1000, notes: '' };
const budget = (over = {}) => ({ tripId: 1, totalBudget: 1000, transportation: 0, accommodation: 0, meals: 0, activities: 0, miscellaneous: 0, alertsEnabled: false, ...over });
const exp = (id, amount, category = 'meals') => ({ id, category, description: `item ${id}`, amount, date: '2026-12-10' });

const renderAt = (path, element, route = '/budget') =>
  render(<MemoryRouter initialEntries={[path]}><Routes><Route path={route} element={element} /></Routes></MemoryRouter>);

beforeEach(() => {
  jest.clearAllMocks();
  api.getTrip.mockResolvedValue(TRIP);
  api.getSummary.mockResolvedValue({ plannedVsActual: { planned: 400, actual: 0, difference: 400 } });
});

describe('Budget page', () => {
  test('no banner under 80%', async () => {
    api.getBudget.mockResolvedValue(budget());
    api.listExpenses.mockResolvedValue([exp(1, 700)]);
    renderAt('/budget?tripId=1', <Budget />);
    await screen.findByText('Budget Manager');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByTestId('category-chart')).toBeInTheDocument();
  });

  test('amber warning at 80% and red banner at 100%', async () => {
    api.getBudget.mockResolvedValue(budget());
    api.listExpenses.mockResolvedValue([exp(1, 800)]);
    const { unmount } = renderAt('/budget?tripId=1', <Budget />);
    expect(await screen.findByText(/80% limit reached/)).toBeInTheDocument();
    unmount();
    api.listExpenses.mockResolvedValue([exp(1, 1000), exp(2, 50)]);
    renderAt('/budget?tripId=1', <Budget />);
    expect(await screen.findByText(/Budget exceeded/)).toBeInTheDocument();
  });

  test('adding an expense calls the API and shows it', async () => {
    api.getBudget.mockResolvedValue(budget());
    api.listExpenses.mockResolvedValue([]);
    api.addExpense.mockResolvedValue({ expense: exp(9, 250), threshold: { status: 'ok' } });
    renderAt('/budget?tripId=1', <Budget />);
    await screen.findByText('Budget Manager');
    fireEvent.change(screen.getByPlaceholderText('Flight to Bali'), { target: { name: 'description', value: 'Taxi' } });
    fireEvent.change(screen.getAllByPlaceholderText('0').find((i) => i.step === '0.01'), { target: { name: 'amount', value: '250' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Expense' }));
    await waitFor(() => expect(api.addExpense).toHaveBeenCalledWith('1', { category: 'transportation', description: 'Taxi', amount: 250 }));
    expect(await screen.findByText('item 9')).toBeInTheDocument();
  });

  test('API failure shows an error with retry', async () => {
    api.getBudget.mockRejectedValue(new Error('Server exploded'));
    api.listExpenses.mockResolvedValue([]);
    renderAt('/budget?tripId=1', <Budget />);
    expect(await screen.findByText('Server exploded')).toBeInTheDocument();
    expect(screen.getByText('Try again')).toBeInTheDocument();
  });

  test('without tripId it opens the most recent trip, or shows an empty state', async () => {
    api.listTrips.mockResolvedValue([]);
    renderAt('/budget', <Budget />);
    expect(await screen.findByText('No trips yet')).toBeInTheDocument();
  });
});

describe('Dashboard page', () => {
  test('shows totals and trips, and deletes through the API', async () => {
    api.listTrips.mockResolvedValue([TRIP]);
    api.dashboard.mockResolvedValue({ totalTrips: 1, plannedBudget: 1000, actualSpending: 300, remainingBudget: 700, tripsInWarning: 0, tripsExceeded: 0 });
    api.deleteTrip.mockResolvedValue(null);
    window.confirm = jest.fn(() => true);
    renderAt('/dashboard', <Dashboard />, '/dashboard');
    expect(await screen.findByText('Planned Budget')).toBeInTheDocument();
    expect(screen.getByText('₹700')).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Delete/));
    await waitFor(() => expect(api.deleteTrip).toHaveBeenCalledWith(1));
  });

  test('empty state for a new user', async () => {
    api.listTrips.mockResolvedValue([]);
    api.dashboard.mockResolvedValue({ totalTrips: 0, plannedBudget: 0, actualSpending: 0, remainingBudget: 0, tripsInWarning: 0, tripsExceeded: 0 });
    renderAt('/dashboard', <Dashboard />, '/dashboard');
    expect(await screen.findByText('No Trips Yet')).toBeInTheDocument();
  });
});

describe('Itinerary page', () => {
  test('loads saved activities and persists a new one', async () => {
    api.getItinerary.mockResolvedValue({ days: { day1: [{ id: 1, time: '09:00', activity: 'Temple', cost: 500 }] }, totalPlanned: 500 });
    api.saveItinerary.mockImplementation(async (_id, days) => ({ days, totalPlanned: 0 }));
    renderAt('/itinerary?tripId=1', <Itinerary />, '/itinerary');
    expect(await screen.findByText('Temple')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('e.g. Dinner at the Beach'), { target: { value: 'Surf' } });
    const time = document.querySelector('input[type="time"]');
    fireEvent.change(time, { target: { value: '10:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Activity' }));
    await waitFor(() => expect(api.saveItinerary).toHaveBeenCalled());
    const days = api.saveItinerary.mock.calls[0][1];
    expect(days.day1).toHaveLength(2);
    expect(days.day1[1]).toMatchObject({ activity: 'Surf', time: '10:30' });
  });
});

describe('ProtectedRoute', () => {
  const page = (user, loading = false, requireAdmin = false) => {
    useAuth.mockReturnValue({ user, loading });
    return render(
      <MemoryRouter initialEntries={['/secret']}>
        <Routes>
          <Route path="/login" element={<div>LOGIN PAGE</div>} />
          <Route path="/secret" element={<ProtectedRoute requireAdmin={requireAdmin}><div>SECRET</div></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>
    );
  };
  test('redirects anonymous users to /login', () => {
    page(null);
    expect(screen.getByText('LOGIN PAGE')).toBeInTheDocument();
  });
  test('lets signed-in users in, blocks non-admins from admin pages', () => {
    page({ email: 'a@b.c', isAdmin: false });
    expect(screen.getByText('SECRET')).toBeInTheDocument();
  });
  test('non-admin is not authorised for admin routes', () => {
    page({ email: 'a@b.c', isAdmin: false }, false, true);
    expect(screen.getByText('Not authorized')).toBeInTheDocument();
  });
  test('admin can enter admin routes', () => {
    page({ email: 'a@b.c', isAdmin: true }, false, true);
    expect(screen.getByText('SECRET')).toBeInTheDocument();
  });
});
