import { cn } from '@/lib/utils';

interface LogoProps {
  withText?: boolean;
  className?: string;
  /** mark size in px */
  size?: number;
  theme?: 'light' | 'dark';
}

/** Brand mark: Abstract geometric representation of order, blocks, and scheduling. */
export function Logo({ withText = true, className, size = 32, theme = 'light' }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-blue-600 flex-shrink-0"
      >
        {/* Left vertical pillar */}
        <rect x="4" y="4" width="8" height="24" rx="2" fill="currentColor" />
        {/* Top right block */}
        <rect x="16" y="4" width="12" height="10" rx="2" fill="currentColor" opacity="0.8" />
        {/* Bottom right block */}
        <rect x="16" y="18" width="12" height="10" rx="2" fill="currentColor" opacity="0.4" />
      </svg>
      {withText && (
        <span 
          className={cn("text-xl font-bold tracking-tight", theme === 'dark' ? 'text-white' : 'text-zinc-900')} 
          style={{ letterSpacing: '-0.03em' }}
        >
          Citas<span className="text-blue-600">Pro</span>
        </span>
      )}
    </div>
  );
}
