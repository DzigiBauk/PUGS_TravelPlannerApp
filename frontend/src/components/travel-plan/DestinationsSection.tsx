import { useState } from 'react';
import type { Destination, DestinationRequestDto, TravelPlan } from '../../models/TravelPlan';
import DestinationForm from '../DestinationForm';

interface DestinationsSectionProps {
  plan: TravelPlan;
  editable: boolean;
  onSave?: (dto: DestinationRequestDto, destination: Destination | null) => Promise<void>;
  onDelete?: (destination: Destination) => Promise<void>;
}

export default function DestinationsSection({
  plan,
  editable,
  onSave,
  onDelete,
}: DestinationsSectionProps) {
  const [editingDestination, setEditingDestination] = useState<Destination | null>(null);
  const [showForm, setShowForm] = useState(false);
  const canEdit = editable && Boolean(onSave && onDelete);

  const saveDestination = async (dto: DestinationRequestDto) => {
    if (!onSave) return;
    await onSave(dto, editingDestination);
    setEditingDestination(null);
    setShowForm(false);
  };

  const deleteDestination = async (destination: Destination) => {
    if (!onDelete) return;
    const message = `Delete ${destination.name}? Activities linked to this destination will also be deleted.`;
    if (!confirm(message)) return;
    try {
      await onDelete(destination);
    } catch {
      // The route container renders the API error.
    }
  };

  const closeForm = () => {
    setEditingDestination(null);
    setShowForm(false);
  };

  return (
    <section className="details-section">
      <div className="section-header">
        <h2>Destinations</h2>
        {canEdit && (
          <button
            className="btn-primary"
            onClick={() => {
              setEditingDestination(null);
              setShowForm(!showForm);
            }}
          >
            {showForm && !editingDestination ? 'Cancel' : 'Add destination'}
          </button>
        )}
      </div>

      {canEdit && showForm && (
        <DestinationForm
          key={editingDestination?.id ?? 'new'}
          destination={editingDestination}
          planStartDate={plan.startDate}
          planEndDate={plan.endDate}
          onSubmit={saveDestination}
          onCancel={closeForm}
        />
      )}

      {plan.destinations?.length ? (
        <div className="destinations-list">
          {plan.destinations.map(destination => (
            <div key={destination.id} className="destination-card">
              <h4>{destination.name}</h4>
              <p className="dest-location">{destination.location}</p>
              <p className="dest-dates">
                {new Date(destination.arrivalDate).toLocaleDateString('en-US')} to{' '}
                {new Date(destination.departureDate).toLocaleDateString('en-US')}
              </p>
              {destination.description && <p>{destination.description}</p>}
              {canEdit && (
                <div className="destination-card-actions">
                  <button
                    className="btn-sm btn-secondary"
                    onClick={() => {
                      setEditingDestination(destination);
                      setShowForm(true);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="btn-sm btn-danger"
                    onClick={() => void deleteDestination(destination)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="no-items">No destinations added yet.</p>
      )}
    </section>
  );
}
