import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import SuccessMessage from '../components/SuccessMessage';
import { travelPlanService } from '../services/travelPlanService';
import type { TravelPlan } from '../models/TravelPlan';
import { getApiErrorMessage } from '../utils/apiError';

export default function Dashboard() {
  const location = useLocation();
  const [plans, setPlans] = useState<TravelPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(
    (location.state as { success?: string } | null)?.success ?? '',
  );
  const navigate = useNavigate();

  const dismissSuccess = () => {
    setSuccess('');
    navigate('/dashboard', { replace: true, state: null });
  };

  useEffect(() => {
    let cancelled = false;

    async function loadPlans() {
      try {
        const data = await travelPlanService.getAll();
        if (!cancelled) {
          setPlans(data);
          setError('');
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(getApiErrorMessage(err, 'Could not load travel plans.'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPlans();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this travel plan?')) return;
    try {
      setError('');
      setSuccess('');
      await travelPlanService.delete(id);
      setPlans(currentPlans => currentPlans.filter(plan => plan.id !== id));
      setSuccess('Travel plan deleted.');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Could not delete this travel plan.'));
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>My travel plans</h1>
        <button className="btn-primary" onClick={() => navigate('/plans/new')}>
          + New plan
        </button>
      </div>

      <SuccessMessage message={success} onDismiss={dismissSuccess} />
      {error && <div className="error-message">{error}</div>}

      {plans.length === 0 ? (
        <div className="empty-state">
          <p>You do not have any travel plans yet.</p>
          <button className="btn-primary" onClick={() => navigate('/plans/new')}>
            Create your first plan
          </button>
        </div>
      ) : (
        <div className="plans-grid">
          {plans.map(plan => (
            <div key={plan.id} className="plan-card">
              <h3>{plan.name}</h3>
              <p className="plan-dates">
                {new Date(plan.startDate).toLocaleDateString('en-US')} to {new Date(plan.endDate).toLocaleDateString('en-US')}
              </p>
              {plan.description && <p className="plan-desc">{plan.description}</p>}
              <p className="plan-budget">Budget: {plan.budget.toLocaleString('en-US')} EUR</p>
              <div className="plan-actions">
                <Link to={`/plans/${plan.id}`} className="btn-link">Details</Link>
                <Link to={`/plans/${plan.id}/edit`} className="btn-link">Edit</Link>
                <button className="btn-danger" onClick={() => handleDelete(plan.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
