// Mobile frame for the customer app: one column, safe-area padding, canvas background.
export function PhoneShell({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <main
      className={`mx-auto flex min-h-dvh w-full max-w-md flex-col bg-canvas px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] text-ink ${className}`}
    >
      {children}
    </main>
  );
}
