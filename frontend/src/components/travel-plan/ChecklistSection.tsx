import { useState } from 'react';
import type {
  ChecklistItem,
  ChecklistItemRequestDto,
  TravelPlan,
} from '../../models/TravelPlan';
import ChecklistItemForm from '../ChecklistItemForm';

interface ChecklistSectionProps {
  plan: TravelPlan;
  editable: boolean;
  onSave?: (dto: ChecklistItemRequestDto, item: ChecklistItem | null) => Promise<void>;
  onToggle?: (item: ChecklistItem) => Promise<void>;
  onDelete?: (item: ChecklistItem) => Promise<void>;
}

export default function ChecklistSection({
  plan,
  editable,
  onSave,
  onToggle,
  onDelete,
}: ChecklistSectionProps) {
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState<number | null>(null);
  const canEdit = editable && Boolean(onSave && onToggle && onDelete);

  const saveItem = async (dto: ChecklistItemRequestDto) => {
    if (!onSave) return;
    await onSave(dto, editingItem);
    setEditingItem(null);
    setShowForm(false);
  };

  const toggleItem = async (item: ChecklistItem) => {
    if (!onToggle || updatingItemId !== null) return;
    setUpdatingItemId(item.id);
    try {
      await onToggle(item);
    } catch {
      // The route container renders the API error.
    } finally {
      setUpdatingItemId(null);
    }
  };

  const deleteItem = async (item: ChecklistItem) => {
    if (!onDelete || !confirm(`Delete ${item.name}?`)) return;
    try {
      await onDelete(item);
    } catch {
      // The route container renders the API error.
    }
  };

  const closeForm = () => {
    setEditingItem(null);
    setShowForm(false);
  };

  return (
    <section className="details-section">
      <div className="section-header checklist-section-header">
        <h2>Packing list / checklist</h2>
        {canEdit && (
          <button
            className="btn-primary"
            onClick={() => {
              setEditingItem(null);
              setShowForm(!showForm);
            }}
          >
            {showForm && !editingItem ? 'Cancel' : 'Add item'}
          </button>
        )}
      </div>

      {canEdit && showForm && (
        <ChecklistItemForm
          key={editingItem?.id ?? 'new'}
          item={editingItem}
          onSubmit={saveItem}
          onCancel={closeForm}
        />
      )}

      {plan.checklistItems?.length ? (
        <ul className="checklist">
          {plan.checklistItems.map(item => (
            <li key={item.id} className={item.isCompleted ? 'completed' : ''}>
              <input
                type="checkbox"
                checked={item.isCompleted}
                readOnly={!canEdit}
                disabled={!canEdit || updatingItemId !== null}
                aria-label={`Mark ${item.name} as ${item.isCompleted ? 'incomplete' : 'complete'}`}
                onChange={() => void toggleItem(item)}
              />
              <span className="checklist-item-name">{item.name}</span>
              {canEdit && (
                <div className="checklist-item-actions">
                  <button
                    className="btn-sm btn-secondary"
                    onClick={() => {
                      setEditingItem(item);
                      setShowForm(true);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="btn-sm btn-danger"
                    onClick={() => void deleteItem(item)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="no-items">No checklist items added yet.</p>
      )}
    </section>
  );
}
