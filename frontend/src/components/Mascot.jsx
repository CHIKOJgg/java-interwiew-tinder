const Mascot = ({ size = 32, className = '' }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
  >
    <rect x="1" y="1" width="30" height="30" rx="9" fill="#D3FF4D" stroke="#181510" strokeWidth="2.2" />
    <circle cx="12" cy="15" r="2" fill="#181510" />
    <circle cx="20" cy="15" r="2" fill="#181510" />
    <path d="M11 21c1.5 1.6 8.5 1.6 10 0" stroke="#181510" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export default Mascot;
