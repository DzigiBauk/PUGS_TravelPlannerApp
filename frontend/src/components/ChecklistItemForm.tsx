import { useState } from 'react';
import type { ChecklistItem, ChecklistItemRequestDto } from '../models/TravelPlan';
import { getApiErrorMessage } from '../utils/apiError';

interface ChecklistItemFormProps {
  item?: ChecklistItem | null;
  onSubmit: (dto: ChecklistItemRequestDto) => Promise<void>;
  onCancel: () => void;
}

export default function ChecklistItemForm({ item, onSubmit, onCancel }: ChecklistItemFormProps) {
  const [name, setName] = useState(() => item?.name ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Checklist item name is required.');
      return;
    }
    if (trimmedName.length > 200) {
      setError('Checklist item name must not exceed 200 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name: trimmedName,
        isCompleted: item?.isCompleted ?? false,
      });
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Could not save the checklist item.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="checklist-form" onSubmit={handleSubmit}>
      <h4>{item ? 'Edit checklist item' : 'Add checklist item'}</h4>
      {error && <div className="form-error">{error}</div>}

      <div className="form-group">
        <label htmlFor="checklist-item-name">Name</label>
        <input
          id="checklist-item-name"
          type="text"
          value={name}
          onChange={event => setName(event.target.value)}
          placeholder="Example: Passport"
          maxLength={200}
          required
          autoFocus
        />
      </div>

      <div className="form-actions">
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Saving...' : item ? 'Save changes' : 'Add item'}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
