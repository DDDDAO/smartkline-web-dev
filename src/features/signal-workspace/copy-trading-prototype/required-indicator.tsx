export function RequiredIndicator({ label }: { label: string }) {
  return (
    <>
      <span aria-hidden="true" className="ml-1 text-rose-500">*</span>
      <span className="sr-only"> {label}</span>
    </>
  );
}
