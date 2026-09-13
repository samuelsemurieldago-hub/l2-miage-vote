interface StatusBadgeProps {
  open: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ open, size = 'md' }: StatusBadgeProps) {
  const sizes = {
    sm: 'text-xs px-2.5 py-1 gap-1.5',
    md: 'text-sm px-3.5 py-1.5 gap-2',
    lg: 'text-base px-4 py-2 gap-2',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${sizes[size]} ${
        open ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${open ? 'bg-emerald-500' : 'bg-red-500'} ${open ? 'animate-pulse' : ''}`} />
      {open ? 'VOTE OUVERT' : 'VOTE FERMÉ'}
    </span>
  );
}
