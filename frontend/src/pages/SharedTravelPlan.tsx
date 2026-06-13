import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useParams } from 'react-router-dom';
import SharedPlanForm from '../components/SharedPlanForm';
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
import { travelPlanService, type TravelPlanRequestDto } from '../services/travelPlanService';
import type { RootState } from '../store';
import { getApiErrorMessage } from '../utils/apiError';

export default function SharedTravelPlan() {
  const { token } = useParams<{ token: string }>();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const [plan, setPlan] = useState<TravelPlan | null>(null);
  const [accessType, setAccessType] = useState<'VIEW' | 'EDIT'>('VIEW');
  const [loading, setLoading] = useState(() => Boolean(token));
  const [error, setError] = useState(() => token ? '' : 'This share link is invalid.');
  const [success, setSuccess] = useState('');
  const [showPlanForm, setShowPlanForm] = useState(false);

  const loadPlan = useCallback(async () => {
    if (!token) return;
    const data = await travelPlanService.getSharedPlan(token);
    setPlan(data);
    setError('');
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    Promise.all([
      travelPlanService.getSharedPlan(token),
      travelPlanService.getSharedPlanAccess(token),
    ])
      .then(([planData, access]) => {
        if (cancelled) return;
        setPlan(planData);
        setAccessType(access.accessType);
        setError('');
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(getApiErrorMessage(err, 'This share link is invalid or expired.'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const mutate = async (action: () => Promise<unknown>, successMessage: string) => {
    try {
      setError('');
      setSuccess('');
      await action();
      await loadPlan();
      setSuccess(successMessage);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Could not update the shared plan.'));
      throw err;
    }
  };

  if (loading) return <div className="loading">Loading shared plan...</div>;
  if (!plan || !token) {
    return <div className="error-message">{error || 'Shared plan not found.'}</div>;
  }

  const hasEditAccess = accessType === 'EDIT';
  const isEditable = hasEditAccess && isAuthenticated;
  const sharedPath = `/shared/${token}`;
  const updatePlan = async (dto: TravelPlanRequestDto) => {
    await mutate(() => travelPlanService.updateSharedPlan(token, dto), 'Travel plan updated.');
    setShowPlanForm(false);
  };

  const saveExpense = (dto: ExpenseRequestDto, expense: Expense | null) => mutate(
    () => expense
      ? travelPlanService.updateSharedExpense(token, expense.id, dto)
      : travelPlanService.createSharedExpense(token, dto),
    expense ? 'Expense updated.' : 'Expense created.',
  );

  const saveDestination = (dto: DestinationRequestDto, destination: Destination | null) => mutate(
    () => destination
      ? travelPlanService.updateSharedDestination(token, destination.id, dto)
      : travelPlanService.createSharedDestination(token, dto),
    destination ? 'Destination updated.' : 'Destination created.',
  );

  const saveActivity = (dto: ActivityRequestDto, activity: Activity | null) => mutate(
    () => activity
      ? travelPlanService.updateSharedActivity(token, activity.id, dto)
      : travelPlanService.createSharedActivity(token, dto),
    activity ? 'Activity updated.' : 'Activity created.',
  );

  const saveChecklistItem = (
    dto: ChecklistItemRequestDto,
    item: ChecklistItem | null,
  ) => mutate(
    () => item
      ? travelPlanService.updateSharedChecklistItem(token, item.id, dto)
      : travelPlanService.createSharedChecklistItem(token, dto),
    item ? 'Checklist item updated.' : 'Checklist item created.',
  );

  return (
    <TravelPlanView
      plan={plan}
      editable={isEditable}
      className="shared-plan"
      shareToken={token}
      banner={(
        <div className="shared-plan-banner">
          {isEditable
            ? 'Editable shared travel plan'
            : hasEditAccess
              ? 'Sign in to edit this shared travel plan'
              : 'Read-only shared travel plan'}
        </div>
      )}
      messages={(
        <>
          <SuccessMessage message={success} onDismiss={() => setSuccess('')} />
          {error && <div className="error-message">{error}</div>}
          {hasEditAccess && !isAuthenticated && (
            <div className="shared-auth-notice">
              <span>This link allows editing, but changes require an authenticated account.</span>
              <Link to="/login" state={{ from: sharedPath }} className="btn-primary">
                Sign in to edit
              </Link>
            </div>
          )}
        </>
      )}
      headerActions={isEditable && (
        <button className="btn-secondary" onClick={() => setShowPlanForm(!showPlanForm)}>
          {showPlanForm ? 'Cancel' : 'Edit plan'}
        </button>
      )}
      planEditor={showPlanForm && (
        <SharedPlanForm
          plan={plan}
          onSubmit={updatePlan}
          onCancel={() => setShowPlanForm(false)}
        />
      )}
      actions={isEditable ? {
        saveExpense,
        deleteExpense: expense => mutate(
          () => travelPlanService.deleteSharedExpense(token, expense.id),
          'Expense deleted.',
        ),
        saveDestination,
        deleteDestination: destination => mutate(
          () => travelPlanService.deleteSharedDestination(token, destination.id),
          'Destination deleted.',
        ),
        saveActivity,
        deleteActivity: activity => mutate(
          () => travelPlanService.deleteSharedActivity(token, activity.id),
          'Activity deleted.',
        ),
        saveChecklistItem,
        toggleChecklistItem: item => mutate(
          () => travelPlanService.updateSharedChecklistItem(token, item.id, {
            name: item.name,
            isCompleted: !item.isCompleted,
          }),
          'Checklist item updated.',
        ),
        deleteChecklistItem: item => mutate(
          () => travelPlanService.deleteSharedChecklistItem(token, item.id),
          'Checklist item deleted.',
        ),
      } : undefined}
    />
  );
}
