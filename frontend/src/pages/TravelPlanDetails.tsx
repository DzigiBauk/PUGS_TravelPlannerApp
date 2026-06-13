import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import SharePanel from '../components/SharePanel';
import SuccessMessage from '../components/SuccessMessage';
import TravelPlanView from '../components/travel-plan/TravelPlanView';
import type { Expense, ExpenseRequestDto } from '../models/Expense';
import type {
  Activity,
  ActivityRequestDto,
  ChecklistItem,
  ChecklistItemRequestDto,
  Destination,
  DestinationRequestDto,
  TravelPlan,
} from '../models/TravelPlan';
import { useServices } from '../services/ServicesContext';
import { getApiErrorMessage } from '../utils/apiError';

export default function TravelPlanDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { travelPlanService } = useServices();
  const [plan, setPlan] = useState<TravelPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadPlan = useCallback(async (planId: number) => {
    try {
      const data = await travelPlanService.getById(planId);
      setPlan(data);
      setError('');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Could not load this travel plan.'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [travelPlanService]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    travelPlanService.getById(Number(id))
      .then(data => {
        if (cancelled) return;
        setPlan(data);
        setError('');
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(getApiErrorMessage(err, 'Could not load this travel plan.'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, travelPlanService]);

  const mutate = async (
    action: () => Promise<unknown>,
    successMessage: string,
    errorMessage: string,
  ) => {
    if (!plan) return;

    try {
      setError('');
      setSuccess('');
      await action();
      setLoading(true);
      await loadPlan(plan.id);
      setSuccess(successMessage);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, errorMessage));
      throw err;
    }
  };

  const deletePlan = async () => {
    if (!plan || !confirm('Are you sure you want to delete this travel plan?')) return;

    try {
      await travelPlanService.delete(plan.id);
      navigate('/dashboard', { state: { success: 'Travel plan deleted.' } });
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Could not delete this travel plan.'));
    }
  };

  const saveExpense = (dto: ExpenseRequestDto, expense: Expense | null) => mutate(
    () => expense
      ? travelPlanService.updateExpense(plan!.id, expense.id, dto)
      : travelPlanService.createExpense(plan!.id, dto),
    expense ? 'Expense updated.' : 'Expense created.',
    'Could not save this expense.',
  );

  const deleteExpense = (expense: Expense) => mutate(
    () => travelPlanService.deleteExpense(plan!.id, expense.id),
    'Expense deleted.',
    'Could not delete this expense.',
  );

  const saveDestination = (dto: DestinationRequestDto, destination: Destination | null) => mutate(
    () => destination
      ? travelPlanService.updateDestination(plan!.id, destination.id, dto)
      : travelPlanService.createDestination(plan!.id, dto),
    destination ? 'Destination updated.' : 'Destination created.',
    'Could not save this destination.',
  );

  const deleteDestination = (destination: Destination) => mutate(
    () => travelPlanService.deleteDestination(plan!.id, destination.id),
    'Destination deleted.',
    'Could not delete this destination.',
  );

  const saveActivity = (dto: ActivityRequestDto, activity: Activity | null) => mutate(
    () => activity
      ? travelPlanService.updateActivity(plan!.id, activity.id, dto)
      : travelPlanService.createActivity(plan!.id, dto),
    activity ? 'Activity updated.' : 'Activity created.',
    'Could not save this activity.',
  );

  const deleteActivity = (activity: Activity) => mutate(
    () => travelPlanService.deleteActivity(plan!.id, activity.id),
    'Activity deleted.',
    'Could not delete this activity.',
  );

  const saveChecklistItem = (
    dto: ChecklistItemRequestDto,
    item: ChecklistItem | null,
  ) => mutate(
    () => item
      ? travelPlanService.updateChecklistItem(plan!.id, item.id, dto)
      : travelPlanService.createChecklistItem(plan!.id, dto),
    item ? 'Checklist item updated.' : 'Checklist item created.',
    'Could not save this checklist item.',
  );

  const toggleChecklistItem = (item: ChecklistItem) => mutate(
    () => travelPlanService.updateChecklistItem(plan!.id, item.id, {
      name: item.name,
      isCompleted: !item.isCompleted,
    }),
    'Checklist item updated.',
    'Could not update this checklist item.',
  );

  const deleteChecklistItem = (item: ChecklistItem) => mutate(
    () => travelPlanService.deleteChecklistItem(plan!.id, item.id),
    'Checklist item deleted.',
    'Could not delete this checklist item.',
  );

  if (loading) return <div className="loading">Loading...</div>;
  if (!plan) return <div className="error-message">{error || 'Travel plan not found.'}</div>;

  return (
    <TravelPlanView
      plan={plan}
      editable
      showActivityCalendar
      messages={(
        <>
          <SuccessMessage message={success} onDismiss={() => setSuccess('')} />
          {error && <div className="error-message">{error}</div>}
        </>
      )}
      headerActions={(
        <div className="plan-actions">
          <Link to={`/plans/${plan.id}/edit`} className="btn-secondary">Edit</Link>
          <button className="btn-danger" onClick={() => void deletePlan()}>Delete</button>
        </div>
      )}
      actions={{
        saveExpense,
        deleteExpense,
        saveDestination,
        deleteDestination,
        saveActivity,
        deleteActivity,
        saveChecklistItem,
        toggleChecklistItem,
        deleteChecklistItem,
      }}
      afterContent={<SharePanel planId={plan.id} />}
    />
  );
}
