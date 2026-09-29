import { cn } from "@/lib/utils";

/**
 * Monogramme Docalio : un document au coin plié dont la courbe dessine un « D »,
 * avec une coche, le document qui arrive, et qui est validé.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden
      className={cn("h-8 w-8 shrink-0", className)}
    >
      <defs>
        <linearGradient id="dcl-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#dcl-g)" />
      <path
        d="M10 8h7.5a8 8 0 0 1 0 16H10z"
        fill="none"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path d="M10 8h4l-4 4z" fill="#fff" opacity=".55" />
      <path
        d="m13.2 16.2 2.3 2.3 4.3-4.6"
        fill="none"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({
  className,
  inverted = false,
}: {
  className?: string;
  inverted?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className="h-7 w-7" />
      <span
        className={cn(
          "text-[15px] font-semibold tracking-tight",
          inverted ? "text-white" : "text-foreground"
        )}
      >
        Docalio
      </span>
    </span>
  );
}
