import React from 'react';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { CATEGORIES } from '../utils/budgetMath';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const COLORS = ['#e07a5f', '#3d405b', '#81b29a', '#f2cc8f', '#9a8c98'];
const label = (c) => c.charAt(0).toUpperCase() + c.slice(1);

export const CategoryChart = ({ byCategory }) => {
  const values = CATEGORIES.map((c) => Number(byCategory?.[c]) || 0);
  if (values.every((v) => v === 0)) return <p className="v-chart-empty">Add expenses to see the category chart.</p>;
  return (
    <div className="v-chart">
      <Doughnut
        data={{ labels: CATEGORIES.map(label), datasets: [{ data: values, backgroundColor: COLORS }] }}
        options={{ plugins: { legend: { position: 'bottom' } } }}
      />
    </div>
  );
};

export const PlannedActualChart = ({ planned, actual }) => (
  <div className="v-chart">
    <Bar
      data={{
        labels: ['Planned itinerary cost', 'Actual expenses'],
        datasets: [{ data: [Number(planned) || 0, Number(actual) || 0], backgroundColor: ['#81b29a', '#e07a5f'] }],
      }}
      options={{ plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }}
    />
  </div>
);
