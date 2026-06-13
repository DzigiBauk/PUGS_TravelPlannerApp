import { lazy, Suspense, type ReactNode } from 'react';
import type { TravelPlan } from '../../models/TravelPlan';
import ActivitiesSection from './ActivitiesSection';
import ChecklistSection from './ChecklistSection';
import DestinationsSection from './DestinationsSection';
import ExpensesSection from './ExpensesSection';
import type { TravelPlanActions } from './types';

const RouteMap = lazy(() => import('../RouteMap'));

interface TravelPlanViewProps {
  plan: TravelPlan;
  editable: boolean;
  actions?: TravelPlanActions;
  className?: string;
  banner?: ReactNode;
  messages?: ReactNode;
  headerActions?: ReactNode;
  planEditor?: ReactNode;
  afterContent?: ReactNode;
  shareToken?: string;
  showActivityCalendar?: boolean;
}

export default function TravelPlanView({
  plan,
  editable,
  actions = {},
  className = '',
  banner,
  messages,
  headerActions,
  planEditor,
  afterContent,
  shareToken,
  showActivityCalendar = false,
}: TravelPlanViewProps) {
  return (
    <div className={`plan-details${className ? ` ${className}` : ''}`}>
      {banner}
      {messages}

      <div className="plan-details-header">
        <div>
          <h1>{plan.name}</h1>
          <p className="plan-meta">
            {new Date(plan.startDate).toLocaleDateString('en-US')} to{' '}
            {new Date(plan.endDate).toLocaleDateString('en-US')}
          </p>
        </div>
        {headerActions}
      </div>

      {planEditor}

      {plan.description && (
        <section className="details-section">
          <h2>Description</h2>
          <p>{plan.description}</p>
        </section>
      )}

      <ExpensesSection
        plan={plan}
        editable={editable}
        onSave={actions.saveExpense}
        onDelete={actions.deleteExpense}
      />
      <DestinationsSection
        plan={plan}
        editable={editable}
        onSave={actions.saveDestination}
        onDelete={actions.deleteDestination}
      />
      <ActivitiesSection
        plan={plan}
        editable={editable}
        showCalendar={showActivityCalendar}
        onSave={actions.saveActivity}
        onDelete={actions.deleteActivity}
      />

      <Suspense fallback={<section className="details-section route-map-state">Loading map...</section>}>
        <RouteMap
          planId={plan.id}
          activities={plan.activities ?? []}
          shareToken={shareToken}
        />
      </Suspense>

      <ChecklistSection
        plan={plan}
        editable={editable}
        onSave={actions.saveChecklistItem}
        onToggle={actions.toggleChecklistItem}
        onDelete={actions.deleteChecklistItem}
      />

      {plan.notes && (
        <section className="details-section">
          <h2>Notes</h2>
          <p>{plan.notes}</p>
        </section>
      )}

      {afterContent}
    </div>
  );
}
