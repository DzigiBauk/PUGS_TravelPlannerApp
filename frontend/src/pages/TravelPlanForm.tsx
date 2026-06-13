import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useServices } from '../services/ServicesContext';
import type { TravelPlan } from '../models/TravelPlan';
import { getApiErrorMessage } from '../utils/apiError';

export default function TravelPlanForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { travelPlanService } = useServices();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    budget: '',
    notes: '',
  });
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit || !id) return;

    let cancelled = false;
    travelPlanService.getById(Number(id))
      .then((plan: TravelPlan) => {
        if (!cancelled) {
          setFormData({
            name: plan.name,
            description: plan.description || '',
            startDate: plan.startDate.split('T')[0],
            endDate: plan.endDate.split('T')[0],
            budget: plan.budget.toString(),
            notes: plan.notes || '',
          });
          setError('');
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(getApiErrorMessage(err, 'Could not load this travel plan.'));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isEdit, id, travelPlanService]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Trip name is required.');
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      setError('Start and end dates are required.');
      return;
    }
    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      setError('End date cannot be before the start date.');
      return;
    }
    const budgetNum = parseFloat(formData.budget);
    if (isNaN(budgetNum) || budgetNum < 0) {
      setError('Budget cannot be negative.');
      return;
    }

    try {
      setLoading(true);
      if (isEdit && id) {
        await travelPlanService.update(Number(id), { ...formData, budget: budgetNum });
      } else {
        await travelPlanService.create({ ...formData, budget: budgetNum });
      }
      navigate('/dashboard', {
        state: { success: isEdit ? 'Travel plan updated.' : 'Travel plan created.' },
      });
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Could not save this travel plan.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-page">
      <h1>{isEdit ? 'Edit travel plan' : 'New travel plan'}</h1>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="travel-plan-form">
        <div className="form-group">
          <label htmlFor="name">Trip name *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="startDate">Start date *</label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="endDate">End date *</label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="budget">Planned budget (EUR) *</label>
          <input
            type="number"
            id="budget"
            name="budget"
            value={formData.budget}
            onChange={handleChange}
            min={0}
            step={0.01}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
          />
        </div>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate('/dashboard')}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving...' : isEdit ? 'Save changes' : 'Create plan'}
          </button>
        </div>
      </form>
    </div>
  );
}
