import { useState } from 'react';
import { ExpenseCategory, ExpenseCategoryLabels } from '../models/Expense';
import type { ExpenseRequestDto, Expense } from '../models/Expense';
import { getApiErrorMessage } from '../utils/apiError';

interface ExpenseFormProps {
    planId: number;
    expense?: Expense | null;
    onSubmit: (dto: ExpenseRequestDto) => Promise<void>;
    onCancel: () => void;
}

const ExpenseForm = ({ expense, onSubmit, onCancel }: ExpenseFormProps) => {
    const [name, setName] = useState(() => expense?.name ?? '');
    const [category, setCategory] = useState<ExpenseCategory>(() => expense?.category ?? ExpenseCategory.Other);
    const [amount, setAmount] = useState(() => expense?.amount.toString() ?? '');
    const [date, setDate] = useState(() => expense?.date.split('T')[0] ?? new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState(() => expense?.description ?? '');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!name.trim()) {
            setError('Expense name is required.');
            return;
        }
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum < 0) {
            setError('Amount must be a positive number.');
            return;
        }
        if (!date) {
            setError('Date is required.');
            return;
        }

        setSubmitting(true);
        try {
            const dto: ExpenseRequestDto = {
                name: name.trim(),
                category,
                amount: amountNum,
                date: new Date(date).toISOString(),
                description: description.trim() || undefined
            };
            await onSubmit(dto);
        } catch (err: unknown) {
            setError(getApiErrorMessage(err, 'Could not save the expense.'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form className="expense-form" onSubmit={handleSubmit}>
            <h4>{expense ? 'Edit expense' : 'Add expense'}</h4>
            {error && <div className="form-error">{error}</div>}
            <div className="form-row">
                <div className="form-group">
                    <label>Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Example: flight ticket"
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Category</label>
                    <select value={category} onChange={e => setCategory(e.target.value as ExpenseCategory)}>
                        {Object.entries(ExpenseCategoryLabels).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="form-row">
                <div className="form-group">
                    <label>Amount (EUR)</label>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder="0.00"
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Date</label>
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        required
                    />
                </div>
            </div>
            <div className="form-group">
                <label>Description (optional)</label>
                <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Extra details about this expense"
                    rows={2}
                />
            </div>
            <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={submitting}>
                    {submitting ? 'Saving...' : expense ? 'Save changes' : 'Add expense'}
                </button>
                <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
            </div>
        </form>
    );
};

export default ExpenseForm;
