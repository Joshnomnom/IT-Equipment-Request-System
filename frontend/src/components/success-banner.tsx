export function SuccessBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      className="flex items-start justify-between gap-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
    >
      <span>{message}</span>
      <button onClick={onDismiss} className="text-green-700 hover:underline">
        Dismiss
      </button>
    </div>
  );
}
