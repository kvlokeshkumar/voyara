import React from 'react';
import { percentUsed } from '../utils/budgetMath';

const BudgetAlert = ({ status, totalBudget, spent }) => {
  if (status === 'exceeded') {
    return (
      <div className="v-alert v-alert-danger" role="alert">
        Budget exceeded: you have spent {percentUsed(totalBudget, spent)}% of your budget.
      </div>
    );
  }
  if (status === 'warning') {
    return (
      <div className="v-alert v-alert-warn" role="alert">
        Warning: you have used {percentUsed(totalBudget, spent)}% of your budget (80% limit reached).
      </div>
    );
  }
  return null;
};

export default BudgetAlert;
