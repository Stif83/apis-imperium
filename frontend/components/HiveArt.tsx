/** Ruche dessinée ; l'alvéaire a un étage de plus. */
export function HiveArt({ color = '#e0a95a', alveary = false, className = 'hive-art', size }: { color?: string; alveary?: boolean; className?: string; size?: number }) {
  return (
    <svg className={className} viewBox="0 0 92 84" width={size} aria-hidden>
      <rect x="22" y={alveary ? 0 : 8} width="48" height="10" rx="5" fill="#8a5a2b" />
      {alveary && <rect x="12" y="10" width="68" height="22" rx="10" fill={color} stroke="#0002" strokeWidth="2" />}
      <rect x="10" y={alveary ? 30 : 18} width="72" height={alveary ? 22 : 30} rx="12" fill={color} stroke="#0002" strokeWidth="2" />
      <rect x="6" y="46" width="80" height="34" rx="12" fill={color} stroke="#0002" strokeWidth="2" />
      <ellipse cx="46" cy="66" rx="9" ry="6" fill="#5a3a1a" />
    </svg>
  );
}
