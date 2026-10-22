import Icon from './Icon';

// Loading, empty and error states used across pages.

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="status" role="status">
      <div className="spinner" />
      <p>{label}</p>
    </div>
  );
}

export function EmptyState({ title, text, action }) {
  return (
    <div className="status">
      <div className="status-icon">
        <Icon name="chef" size={40} />
      </div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="status status-error" role="alert">
      <div className="status-icon">
        <Icon name="alert" size={40} />
      </div>
      <h3>Something went wrong</h3>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-outline" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
