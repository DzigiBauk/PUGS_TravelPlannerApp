import { useState } from 'react';
import type { TravelPlan, TravelPlanRequestDto } from '../models/TravelPlan';
import { getApiErrorMessage } from '../utils/apiError';

interface SharedPlanFormProps {
  plan: TravelPlan;
  onSubmit: (dto: TravelPlanRequestDto) => Promise<void>;
  onCancel: () => void;
}

export default function SharedPlanForm({ plan, onSubmit, onCancel }: SharedPlanFormProps) {
  const [name, setName] = useState(plan.name);
  const [description, setDescription] = useState(plan.description ?? '');
  const [startDate, setStartDate] = useState(plan.startDate.split('T')[0]);
  const [endDate, setEndDate] = useState(plan.endDate.split('T')[0]);
  const [budget, setBudget] = useState(plan.budget.toString());
  const [notes, setNotes] = useState(plan.notes ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    const numericBudget = Number(budget);
    if (!name.trim()) {
      setError('Trip name is required.');
      return;
    }
    if (!startDate || !endDate || endDate < startDate) {
      setError('Enter a valid travel date range.');
      return;
    }
    if (!Number.isFinite(numericBudget) || numericBudget < 0) {
      setError('Budget cannot be negative.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        startDate: `${startDate}T00:00:00`,
        endDate: `${endDate}T00:00:00`,
        budget: numericBudget,
        notes: notes.trim() || undefined,
      });
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Could not save the travel plan.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="shared-plan-form" onSubmit={handleSubmit}>
      <h2>Edit travel plan</h2>
      {error && <div className="form-error">{error}</div>}
      <div className="form-group">
        <label htmlFor="shared-plan-name">Trip name</label>
        <input id="shared-plan-name" value={name} onChange={event => setName(event.target.value)} required />
      </div>
      <div className="form-group">
        <label htmlFor="shared-plan-description">Description</label>
        <textarea id="shared-plan-description" value={description} onChange={event => setDescription(event.target.value)} rows={2} />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="shared-plan-start">Start date</label>
          <input id="shared-plan-start" type="date" value={startDate} onChange={event => setStartDate(event.target.value)} required />
        </div>
        <div className="form-group">
          <label htmlFor="shared-plan-end">End date</label>
          <input id="shared-plan-end" type="date" min={startDate} value={endDate} onChange={event => setEndDate(event.target.value)} required />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="shared-plan-budget">Planned budget (EUR)</label>
        <input id="shared-plan-budget" type="number" min="0" step="0.01" value={budget} onChange={event => setBudget(event.target.value)} required />
      </div>
      <div className="form-group">
        <label htmlFor="shared-plan-notes">Notes</label>
        <textarea id="shared-plan-notes" value={notes} onChange={event => setNotes(event.target.value)} rows={2} />
      </div>
      <div className="form-actions">
        <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Save changes'}</button>
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
