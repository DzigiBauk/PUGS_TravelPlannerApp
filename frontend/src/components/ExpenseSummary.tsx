import type { TravelPlan } from '../models/TravelPlan';

interface ExpenseSummaryProps {
    plan: TravelPlan;
}

const ExpenseSummary = ({ plan }: ExpenseSummaryProps) => {
    const budget = plan.budget ?? 0;
    const totalExpenses = plan.totalExpenses ?? 0;
    const remainingBudget = plan.remainingBudget ?? (budget - totalExpenses);
    const percentageUsed = budget > 0 ? Math.round((totalExpenses / budget) * 100) : 0;

    return (
        <div className="expense-summary">
            <h3>Financial overview</h3>
            <div className="summary-grid">
                <div className="summary-item">
                    <span className="summary-label">Planned budget</span>
                    <span className="summary-value">{budget.toFixed(2)} EUR</span>
                </div>
                <div className="summary-item">
                    <span className="summary-label">Total expenses</span>
                    <span className="summary-value expense-amount">{totalExpenses.toFixed(2)} EUR</span>
                </div>
                <div className="summary-item">
                    <span className="summary-label">Remaining budget</span>
                    <span className={`summary-value ${remainingBudget < 0 ? 'over-budget' : ''}`}>
                        {remainingBudget.toFixed(2)} EUR
                    </span>
                </div>
                <div className="summary-item">
                    <span className="summary-label">Used</span>
                    <span className="summary-value">{percentageUsed}%</span>
                </div>
            </div>
            {budget > 0 && (
                <div className="budget-bar-container">
                    <div
                        className={`budget-bar ${percentageUsed > 100 ? 'over-budget' : percentageUsed > 75 ? 'warning' : ''}`}
                        style={{ width: `${Math.min(percentageUsed, 100)}%` }}
                    />
                </div>
            )}
        </div>
    );
};

export default ExpenseSummary;
