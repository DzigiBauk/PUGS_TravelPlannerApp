import { useMemo, useState } from 'react';
import type { Activity, ActivityRequestDto, TravelPlan } from '../../models/TravelPlan';
import ActivityCalendar from '../ActivityCalendar';
import ActivityForm from '../ActivityForm';

interface ActivitiesSectionProps {
  plan: TravelPlan;
  editable: boolean;
  showCalendar?: boolean;
  onSave?: (dto: ActivityRequestDto, activity: Activity | null) => Promise<void>;
  onDelete?: (activity: Activity) => Promise<void>;
}

const activityStatusLabels: Record<Activity['status'], string> = {
  planned: 'Planned',
  reserved: 'Reserved',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function ActivitiesSection({
  plan,
  editable,
  showCalendar = false,
  onSave,
  onDelete,
}: ActivitiesSectionProps) {
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const canEdit = editable && Boolean(onSave && onDelete);

  const activitiesByDate = useMemo(() => {
    return (plan.activities ?? []).reduce((groups, activity) => {
      const date = activity.date.split('T')[0];
      groups[date] ??= [];
      groups[date].push(activity);
      return groups;
    }, {} as Record<string, Activity[]>);
  }, [plan.activities]);

  const destinationNames = useMemo(
    () => new Map(plan.destinations?.map(destination => [destination.id, destination.name])),
    [plan.destinations],
  );

  const saveActivity = async (dto: ActivityRequestDto) => {
    if (!onSave) return;
    await onSave(dto, editingActivity);
    setEditingActivity(null);
    setShowForm(false);
  };

  const deleteActivity = async (activity: Activity) => {
    if (!onDelete || !confirm(`Delete ${activity.name}?`)) return;
    try {
      await onDelete(activity);
    } catch {
      // The route container renders the API error.
    }
  };

  const editActivity = (activity: Activity) => {
    if (!canEdit) return;
    setEditingActivity(activity);
    setShowForm(true);
  };

  const closeForm = () => {
    setEditingActivity(null);
    setShowForm(false);
  };

  return (
    <section className="details-section">
      <div className="section-header activity-section-header">
        <h2>Activities</h2>
        <div className="activity-header-actions">
          {showCalendar && (
            <div className="view-toggle" aria-label="Activity view">
              <button
                type="button"
                className={view === 'list' ? 'active' : ''}
                onClick={() => setView('list')}
              >
                List
              </button>
              <button
                type="button"
                className={view === 'calendar' ? 'active' : ''}
                onClick={() => setView('calendar')}
              >
                Calendar
              </button>
            </div>
          )}
          {canEdit && (
            <button
              className="btn-primary"
              onClick={() => {
                setEditingActivity(null);
                setShowForm(!showForm);
              }}
            >
              {showForm && !editingActivity ? 'Cancel' : 'Add activity'}
            </button>
          )}
        </div>
      </div>

      {canEdit && showForm && (
        <ActivityForm
          key={editingActivity?.id ?? 'new'}
          activity={editingActivity}
          activities={plan.activities ?? []}
          destinations={plan.destinations ?? []}
          planStartDate={plan.startDate}
          planEndDate={plan.endDate}
          onSubmit={saveActivity}
          onCancel={closeForm}
        />
      )}

      {showCalendar && view === 'calendar' ? (
        <ActivityCalendar
          activities={plan.activities ?? []}
          planStartDate={plan.startDate}
          planEndDate={plan.endDate}
          onSelectActivity={editActivity}
        />
      ) : Object.keys(activitiesByDate).length ? (
        Object.entries(activitiesByDate).sort().map(([date, activities]) => (
          <div key={date} className="day-activities">
            <h4>
              {new Date(date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </h4>
            <div className="activities-list">
              {[...activities]
                .sort((left, right) => left.time.localeCompare(right.time) || left.id - right.id)
                .map(activity => (
                  <div key={activity.id} className={`activity-item status-${activity.status}`}>
                    <div className="activity-time">{activity.time.slice(0, 5)}</div>
                    <div className="activity-info">
                      <strong>{activity.name}</strong>
                      {activity.destinationId && destinationNames.get(activity.destinationId) && (
                        <span className="activity-destination">
                          {destinationNames.get(activity.destinationId)}
                        </span>
                      )}
                      {activity.location && (
                        <span className="activity-location">{activity.location}</span>
                      )}
                      {activity.estimatedCost !== undefined && (
                        <span className="activity-cost">{activity.estimatedCost} EUR</span>
                      )}
                      <span className={`activity-status ${activity.status}`}>
                        {activityStatusLabels[activity.status]}
                      </span>
                      {activity.description && (
                        <span className="activity-description">{activity.description}</span>
                      )}
                    </div>
                    {canEdit && (
                      <div className="activity-actions">
                        <button
                          className="btn-sm btn-secondary"
                          onClick={() => editActivity(activity)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-sm btn-danger"
                          onClick={() => void deleteActivity(activity)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ))
      ) : (
        <p className="no-items">No activities planned yet.</p>
      )}
    </section>
  );
}
