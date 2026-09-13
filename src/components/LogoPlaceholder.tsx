import { useState } from 'react';
import { GraduationCap } from 'lucide-react';

interface LogoPlaceholderProps {
  logoUrl?: string | null;
  size?: number;
  className?: string;
}

/**
 * Renders the configured logo (from /public/logo.png by default, or an
 * uploaded logoUrl) with a graceful fallback placeholder if none is set.
 */
export function LogoPlaceholder({ logoUrl, size = 72, className = '' }: LogoPlaceholderProps) {
  const [failed, setFailed] = useState(false);
  const src = logoUrl ?? '/logo.png';

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl bg-primary-600 text-white ${className}`}
        style={{ width: size, height: size }}
      >
        <GraduationCap size={size * 0.55} strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt="Logo L2 MIAGE"
      width={size}
      height={size}
      className={`rounded-2xl object-contain ${className}`}
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}
