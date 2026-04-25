type Props = {
  size?: number;
  className?: string;
  title?: string;
};

export function BadgeLogo({ size = 28, className, title }: Props) {
  return (
    <span
      className={"badge-shield" + (className ? ` ${className}` : "")}
      style={{ width: size, height: size }}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <svg viewBox="0 0 48 48" fill="none">
        <path
          d="M7 8 L9 6 L13 8 L17 6 L21 8 L24 6 L27 8 L31 6 L35 8 L39 6 L41 8 V28 C41 37 33.5 42.8 24 44.5 C14.5 42.8 7 37 7 28 Z"
          fill="var(--accent)"
          stroke="var(--ink)"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d="M11 12 V28 C11 34.5 16.5 39.2 24 40.6 C31.5 39.2 37 34.5 37 28 V12 Z"
          fill="none"
          stroke="var(--ink)"
          strokeWidth="1.2"
          strokeLinejoin="round"
          opacity="0.55"
        />
        <rect
          x="14.5"
          y="14"
          width="19"
          height="5"
          rx="1"
          fill="var(--ink)"
        />
        <circle
          cx="24"
          cy="30.5"
          r="6.8"
          fill="var(--ink)"
          stroke="var(--ink)"
          strokeWidth="0.5"
        />
        <path
          d="M24 26.2 L25.3 28.9 L28.3 29.3 L26.1 31.3 L26.7 34.2 L24 32.7 L21.3 34.2 L21.9 31.3 L19.7 29.3 L22.7 28.9 Z"
          fill="var(--accent)"
          stroke="var(--ink)"
          strokeWidth="0.5"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
