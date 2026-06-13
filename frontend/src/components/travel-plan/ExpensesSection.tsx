import { useState } from 'react';
import type { Expense, ExpenseRequestDto } from '../../models/Expense';
import { ExpenseCategoryLabels } from '../../models/Expense';
import type { TravelPlan } from '../../models/TravelPlan';
import ExpenseForm from '../ExpenseForm';
import ExpenseSummary from '../ExpenseSummary';

interface ExpensesSectionProps {
  plan: TravelPlan;
  editable: boolean;
  onSave?: (dto: ExpenseRequestDto, expense: Expense | null) => Promise<void>;
  onDelete?: (expense: Expense) => Promise<void>;
}

export default function ExpensesSection({
  plan,
  editable,
  onSave,
  onDelete,
}: ExpensesSectionProps) {
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showForm, setShowForm] = useState(false);
  const canEdit = editable && Boolean(onSave && onDelete);

  const saveExpense = async (dto: ExpenseRequestDto) => {
    if (!onSave) return;
    await onSave(dto, editingExpense);
    setEditingExpense(null);
    setShowForm(false);
  };

  const deleteExpense = async (expense: Expense) => {
    if (!onDelete || !confirm(`Delete ${expense.name}?`)) return;
    try {
      await onDelete(expense);
    } catch {
      // The route container renders the API error.
    }
  };

  const closeForm = () => {
    setEditingExpense(null);
    setShowForm(false);
  };

  return (
    <section className="details-section">
      <h2>Budget and expenses</h2>
      <ExpenseSummary plan={plan} />

      <div className="expenses-management">
        {canEdit && (
          <div className="section-header">
            <h3>Expenses</h3>
            <button
              className="btn-primary"
              onClick={() => {
                setEditingExpense(null);
                setShowForm(!showForm);
              }}
            >
              {showForm && !editingExpense ? 'Cancel' : 'Add expense'}
            </button>
          </div>
        )}

        {canEdit && showForm && (
          <ExpenseForm
            key={editingExpense?.id ?? 'new'}
            planId={plan.id}
            expense={editingExpense}
            onSubmit={saveExpense}
            onCancel={closeForm}
          />
        )}

        {plan.expenses?.length ? (
          <div className="expenses-table-wrapper">
            <table className="expenses-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Description</th>
                  {canEdit && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {plan.expenses.map(expense => (
                  <tr key={expense.id}>
                    <td>{expense.name}</td>
                    <td>
                      <span className="category-badge">
                        {ExpenseCategoryLabels[expense.category] || expense.category}
                      </span>
                    </td>
                    <td className="amount-cell">{expense.amount.toLocaleString('en-US')} EUR</td>
                    <td>{new Date(expense.date).toLocaleDateString('en-US')}</td>
                    <td>{expense.description || '-'}</td>
                    {canEdit && (
                      <td className="actions-cell">
                        <button
                          className="btn-sm btn-secondary"
                          onClick={() => {
                            setEditingExpense(expense);
                            setShowForm(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-sm btn-danger"
                          onClick={() => void deleteExpense(expense)}
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="no-items">No expenses recorded yet.</p>
        )}
      </div>
    </section>
  );
}
