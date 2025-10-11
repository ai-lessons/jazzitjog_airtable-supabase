type BadgeProps = {
  children: React.ReactNode;
  variant?: 'carbon' | 'waterproof' | 'cushioning' | 'width' | 'breathability' | 'default';
  label?: string;
};

export function Badge({ children, variant = 'default', label }: BadgeProps) {
  const variants = {
    carbon: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    waterproof: 'bg-blue-100 text-blue-800 border-blue-200',
    cushioning: 'bg-purple-100 text-purple-800 border-purple-200',
    width: 'bg-green-100 text-green-800 border-green-200',
    breathability: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    default: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs border ${variants[variant]}`}>
      {label && <span className="opacity-60">{label}: </span>}
      {children}
    </span>
  );
}

// Icon + text for primary use
export function UseBadge({ use }: { use: string }) {
  const icons: Record<string, string> = {
    'racing': '⚡',
    'tempo': '💨',
    'trail running': '🏔️',
    'recovery': '💤',
    'daily trainer': '👟',
  };

  const colors: Record<string, string> = {
    'racing': 'text-red-600',
    'tempo': 'text-orange-600',
    'trail running': 'text-green-600',
    'recovery': 'text-blue-600',
    'daily trainer': 'text-gray-700',
  };

  const icon = icons[use] || '👟';
  const color = colors[use] || 'text-gray-700';

  return (
    <div className="flex items-center gap-1">
      <span className={color}>{icon}</span>
      <span className="text-sm">{use}</span>
    </div>
  );
}

// Surface with color coding
export function SurfaceBadge({ surface }: { surface: string }) {
  const variants: Record<string, string> = {
    'road': 'bg-blue-50 text-blue-700',
    'trail': 'bg-green-50 text-green-700',
    'track': 'bg-orange-50 text-orange-700',
  };

  const className = variants[surface] || 'bg-gray-50 text-gray-700';

  return (
    <span className={`px-2 py-1 rounded text-sm ${className}`}>
      {surface}
    </span>
  );
}
