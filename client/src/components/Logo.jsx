export default function Logo({ className = "w-8 h-8" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M50 10L10 30V70L50 90L90 70V30L50 10Z"
        fill="currentColor"
        fillOpacity="0.1"
      />
      <path
        d="M50 10L10 30V70L50 90L90 70V30L50 10Z"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M50 10V50M10 30L50 50M90 30L50 50M10 70L50 50M90 70L50 50M50 90V50"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.5"
      />
      <circle cx="50" cy="50" r="8" fill="currentColor" />
    </svg>
  );
}
