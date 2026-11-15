type LoadingStateProps = {
  label: string;
};

export default function LoadingState({ label }: LoadingStateProps) {
  return (
    <p className="state-message" role="status" aria-live="polite">
      <span className="loading-dot" aria-hidden="true" />
      {label}
    </p>
  );
}
