interface VividLogoProps {
  className?: string;
}

export default function VividLogo({ className }: VividLogoProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      role="img"
      aria-label="TWS Vivid Seats logo"
    >
      <defs>
        <linearGradient id="twsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E90FF" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      <rect
        x="2"
        y="2"
        width="60"
        height="60"
        rx="12"
        fill="url(#twsGradient)"
        stroke="#0f172a"
        strokeWidth="3"
      />
      <path
        d="M18 42L10 22h6l4 12 4-12h5l4 12 4-12h6l-8 20h-6l-4-11-4 11h-6z"
        fill="#fff"
      />
      <text
        x="32"
        y="52"
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="700"
        fontSize="10"
        fill="#0f172a"
      >
        TWS
      </text>
    </svg>
  );
}

