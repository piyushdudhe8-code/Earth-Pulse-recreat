type ErrorStateProps = {
  title: string;
  message: string;
};

export default function ErrorState({ title, message }: ErrorStateProps) {
  return (
    <div className="error-state" role="alert">
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  );
}
