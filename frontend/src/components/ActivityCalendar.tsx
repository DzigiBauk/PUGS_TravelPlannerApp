import { useMemo, useState } from 'react';
import type { Activity } from '../models/TravelPlan';

interface ActivityCalendarProps {
  activities: Activity[];
  planStartDate: string;
  planEndDate: string;
  onSelectActivity: (activity: Activity) => void;
}

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseDate(date: string): Date {
  return new Date(`${date.split('T')[0]}T00:00:00`);
}

function monthKey(date: Date): number {
  return date.getFullYear() * 12 + date.getMonth();
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function ActivityCalendar({
  activities,
  planStartDate,
  planEndDate,
  onSelectActivity,
}: ActivityCalendarProps) {
  const tripStart = parseDate(planStartDate);
  const tripEnd = parseDate(planEndDate);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(tripStart.getFullYear(), tripStart.getMonth(), 1),
  );

  const activitiesByDate = useMemo(() => {
    const grouped = new Map<string, Activity[]>();
    activities.forEach(activity => {
      const key = activity.date.split('T')[0];
      const items = grouped.get(key) ?? [];
      items.push(activity);
      grouped.set(key, items);
    });

    grouped.forEach(items => {
      items.sort((left, right) => (left.time ?? '').localeCompare(right.time ?? ''));
    });
    return grouped;
  }, [activities]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const gridStart = new Date(firstDay);
    gridStart.setDate(firstDay.getDate() - firstDay.getDay());

    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + index);
      return day;
    });
  }, [visibleMonth]);

  const startMonth = monthKey(tripStart);
  const endMonth = monthKey(tripEnd);
  const currentMonth = monthKey(visibleMonth);

  const changeMonth = (offset: number) => {
    setVisibleMonth(current => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  return (
    <div className="activity-calendar">
      <div className="calendar-toolbar">
        <button
          type="button"
          className="calendar-nav-button"
          onClick={() => changeMonth(-1)}
          disabled={currentMonth <= startMonth}
          aria-label="Previous month"
        >
          Previous
        </button>
        <h3>{visibleMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
        <button
          type="button"
          className="calendar-nav-button"
          onClick={() => changeMonth(1)}
          disabled={currentMonth >= endMonth}
          aria-label="Next month"
        >
          Next
        </button>
      </div>

      <div className="calendar-grid calendar-weekdays" aria-hidden="true">
        {weekdayLabels.map(label => <div key={label}>{label}</div>)}
      </div>

      <div className="calendar-grid calendar-days">
        {calendarDays.map(day => {
          const key = dateKey(day);
          const dayActivities = activitiesByDate.get(key) ?? [];
          const isCurrentMonth = day.getMonth() === visibleMonth.getMonth();
          const isWithinTrip = day >= tripStart && day <= tripEnd;

          return (
            <div
              key={key}
              className={`calendar-day${isCurrentMonth ? '' : ' outside-month'}${isWithinTrip ? ' within-trip' : ''}`}
            >
              <span className="calendar-day-number">{day.getDate()}</span>
              <div className="calendar-events">
                {dayActivities.map(activity => (
                  <button
                    key={activity.id}
                    type="button"
                    className={`calendar-event ${activity.status}`}
                    onClick={() => onSelectActivity(activity)}
                    title={`${activity.time.slice(0, 5)} - ${activity.name}`}
                  >
                    {activity.time && <span>{activity.time.slice(0, 5)}</span>}
                    {activity.name}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
