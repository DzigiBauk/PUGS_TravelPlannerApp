import { useState } from 'react';
import type { Activity, ActivityRequestDto, Destination } from '../models/TravelPlan';
import { getApiErrorMessage } from '../utils/apiError';
import ActivityLocationPicker from './ActivityLocationPicker';

interface ActivityFormProps {
  activity?: Activity | null;
  activities: Activity[];
  destinations: Destination[];
  planStartDate: string;
  planEndDate: string;
  onSubmit: (dto: ActivityRequestDto) => Promise<void>;
  onCancel: () => void;
}

const statusOptions: Array<{ value: Activity['status']; label: string }> = [
  { value: 'planned', label: 'Planned' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function ActivityForm({
  activity,
  activities,
  destinations,
  planStartDate,
  planEndDate,
  onSubmit,
  onCancel,
}: ActivityFormProps) {
  const minimumDate = planStartDate.split('T')[0];
  const maximumDate = planEndDate.split('T')[0];
  const [name, setName] = useState(() => activity?.name ?? '');
  const [destinationId, setDestinationId] = useState(() => activity?.destinationId?.toString() ?? '');
  const [date, setDate] = useState(() => activity?.date.split('T')[0] ?? minimumDate);
  const [time, setTime] = useState(() => activity?.time.slice(0, 5) ?? '');
  const [location, setLocation] = useState(() => activity?.location ?? '');
  const [latitude, setLatitude] = useState(() => activity?.latitude?.toString() ?? '');
  const [longitude, setLongitude] = useState(() => activity?.longitude?.toString() ?? '');
  const [estimatedCost, setEstimatedCost] = useState(() => activity?.estimatedCost?.toString() ?? '');
  const [status, setStatus] = useState<Activity['status']>(() => activity?.status ?? 'planned');
  const [description, setDescription] = useState(() => activity?.description ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const parsedLatitude = latitude === '' ? undefined : Number(latitude);
  const parsedLongitude = longitude === '' ? undefined : Number(longitude);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Activity name is required.');
      return;
    }
    if (!date) {
      setError('Activity date is required.');
      return;
    }
    if (date < minimumDate || date > maximumDate) {
      setError('Activity date must be within the travel plan dates.');
      return;
    }
    if (!time) {
      setError('Activity time is required.');
      return;
    }

    const cost = estimatedCost ? Number(estimatedCost) : undefined;
    if (cost !== undefined && (!Number.isFinite(cost) || cost < 0)) {
      setError('Estimated cost cannot be negative.');
      return;
    }

    if ((latitude && !longitude) || (!latitude && longitude)) {
      setError('Latitude and longitude must be provided together.');
      return;
    }

    const latitudeValue = latitude ? Number(latitude) : undefined;
    const longitudeValue = longitude ? Number(longitude) : undefined;
    if (latitudeValue !== undefined && (!Number.isFinite(latitudeValue) || latitudeValue < -90 || latitudeValue > 90)) {
      setError('Latitude must be between -90 and 90.');
      return;
    }
    if (longitudeValue !== undefined && (!Number.isFinite(longitudeValue) || longitudeValue < -180 || longitudeValue > 180)) {
      setError('Longitude must be between -180 and 180.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        destinationId: destinationId ? Number(destinationId) : undefined,
        name: name.trim(),
        date: `${date}T00:00:00`,
        time: `${time}:00`,
        location: location.trim() || undefined,
        latitude: latitudeValue,
        longitude: longitudeValue,
        description: description.trim() || undefined,
        estimatedCost: cost,
        status,
      });
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Could not save the activity.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="activity-form" onSubmit={handleSubmit}>
      <h4>{activity ? 'Edit activity' : 'Add activity'}</h4>
      {error && <div className="form-error">{error}</div>}

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="activity-name">Name</label>
          <input
            id="activity-name"
            type="text"
            value={name}
            onChange={event => setName(event.target.value)}
            placeholder="Example: Colosseum tour"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="activity-destination">Destination (optional)</label>
          <select
            id="activity-destination"
            value={destinationId}
            onChange={event => setDestinationId(event.target.value)}
          >
            <option value="">No destination</option>
            {destinations.map(destination => (
              <option key={destination.id} value={destination.id}>{destination.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row form-row-three">
        <div className="form-group">
          <label htmlFor="activity-date">Date</label>
          <input
            id="activity-date"
            type="date"
            min={minimumDate}
            max={maximumDate}
            value={date}
            onChange={event => setDate(event.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="activity-time">Time</label>
          <input
            id="activity-time"
            type="time"
            value={time}
            onChange={event => setTime(event.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="activity-status">Status</label>
          <select
            id="activity-status"
            value={status}
            onChange={event => setStatus(event.target.value as Activity['status'])}
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="activity-location">Location (optional)</label>
          <input
            id="activity-location"
            type="text"
            value={location}
            onChange={event => setLocation(event.target.value)}
            placeholder="Example: Piazza del Colosseo"
          />
        </div>
        <div className="form-group">
          <label htmlFor="activity-cost">Estimated cost (EUR)</label>
          <input
            id="activity-cost"
            type="number"
            min="0"
            step="0.01"
            value={estimatedCost}
            onChange={event => setEstimatedCost(event.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>

      <ActivityLocationPicker
        activities={activities}
        activityId={activity?.id}
        date={date}
        time={time}
        latitude={Number.isFinite(parsedLatitude) ? parsedLatitude : undefined}
        longitude={Number.isFinite(parsedLongitude) ? parsedLongitude : undefined}
        onChange={(nextLatitude, nextLongitude) => {
          setLatitude(nextLatitude.toFixed(6));
          setLongitude(nextLongitude.toFixed(6));
        }}
        onClear={() => {
          setLatitude('');
          setLongitude('');
        }}
      />

      <div className="form-group">
        <label htmlFor="activity-description">Description (optional)</label>
        <textarea
          id="activity-description"
          value={description}
          onChange={event => setDescription(event.target.value)}
          placeholder="Reservation details or notes"
          rows={2}
        />
      </div>

      <div className="form-actions">
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Saving...' : activity ? 'Save changes' : 'Add activity'}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
