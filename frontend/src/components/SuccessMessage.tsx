interface SuccessMessageProps {
  message: string;
  onDismiss: () => void;
}

export default function SuccessMessage({ message, onDismiss }: SuccessMessageProps) {
  if (!message) return null;

  return (
    <div className="success-message" role="status">
      <span>{message}</span>
      <button type="button" aria-label="Dismiss success message" onClick={onDismiss}>Dismiss</button>
    </div>
  );
}
