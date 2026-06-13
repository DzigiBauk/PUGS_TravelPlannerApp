import { useState } from 'react';
import type { Destination, DestinationRequestDto } from '../models/TravelPlan';
import { getApiErrorMessage } from '../utils/apiError';

interface DestinationFormProps {
  destination?: Destination | null;
  planStartDate: string;
  planEndDate: string;
  onSubmit: (dto: DestinationRequestDto) => Promise<void>;
  onCancel: () => void;
}

export default function DestinationForm({
  destination,
  planStartDate,
  planEndDate,
  onSubmit,
  onCancel,
}: DestinationFormProps) {
  const minimumDate = planStartDate.split('T')[0];
  const maximumDate = planEndDate.split('T')[0];
  const [name, setName] = useState(() => destination?.name ?? '');
  const [location, setLocation] = useState(() => destination?.location ?? '');
  const [arrivalDate, setArrivalDate] = useState(() => destination?.arrivalDate.split('T')[0] ?? minimumDate);
  const [departureDate, setDepartureDate] = useState(() => destination?.departureDate.split('T')[0] ?? minimumDate);
  const [description, setDescription] = useState(() => destination?.description ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!name.trim() || !location.trim()) {
      setError('Destination name and location are required.');
      return;
    }
    if (!arrivalDate || !departureDate) {
      setError('Arrival and departure dates are required.');
      return;
    }
    if (arrivalDate < minimumDate || departureDate > maximumDate) {
      setError('Destination dates must be within the travel plan dates.');
      return;
    }
    if (departureDate < arrivalDate) {
      setError('Departure date cannot be before the arrival date.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        location: location.trim(),
        arrivalDate: `${arrivalDate}T00:00:00`,
        departureDate: `${departureDate}T00:00:00`,
        description: description.trim() || undefined,
      });
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Could not save the destination.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="destination-form" onSubmit={handleSubmit}>
      <h4>{destination ? 'Edit destination' : 'Add destination'}</h4>
      {error && <div className="form-error">{error}</div>}

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="destination-name">Name</label>
          <input
            id="destination-name"
            type="text"
            value={name}
            onChange={event => setName(event.target.value)}
            placeholder="Example: Rome"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="destination-location">Location</label>
          <input
            id="destination-location"
            type="text"
            value={location}
            onChange={event => setLocation(event.target.value)}
            placeholder="Example: Rome, Italy"
            required
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="destination-arrival">Arrival date</label>
          <input
            id="destination-arrival"
            type="date"
            min={minimumDate}
            max={maximumDate}
            value={arrivalDate}
            onChange={event => setArrivalDate(event.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="destination-departure">Departure date</label>
          <input
            id="destination-departure"
            type="date"
            min={arrivalDate || minimumDate}
            max={maximumDate}
            value={departureDate}
            onChange={event => setDepartureDate(event.target.value)}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="destination-description">Description (optional)</label>
        <textarea
          id="destination-description"
          value={description}
          onChange={event => setDescription(event.target.value)}
          placeholder="Notes about this destination"
          rows={2}
        />
      </div>

      <div className="form-actions">
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Saving...' : destination ? 'Save changes' : 'Add destination'}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
