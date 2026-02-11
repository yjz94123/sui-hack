import { AlertTriangle } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="app-muted-panel flex flex-col items-center gap-3 px-5 py-8 text-center">
      <div className="grid h-10 w-10 place-items-center rounded-full bg-danger/10 text-danger">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <p className="max-w-lg text-sm text-fg-secondary">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="app-btn-secondary h-9 px-4 text-sm">
          Retry
        </button>
      )}
    </div>
  );
}
