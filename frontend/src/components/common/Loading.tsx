interface LoadingProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

const spinnerSize = {
  sm: 'h-4 w-4 border-[1.5px]',
  md: 'h-7 w-7 border-2',
  lg: 'h-10 w-10 border-2',
};

export function Loading({ text = 'Loading...', size = 'md' }: LoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <div
        className={`${spinnerSize[size]} animate-spin rounded-full border-accent/25 border-t-accent`}
        role="status"
        aria-label={text}
      />
      {text && <p className="text-sm text-fg-secondary">{text}</p>}
    </div>
  );
}
