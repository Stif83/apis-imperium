/** Ruche dessinée ; l'alvéaire a un étage de plus. */
export function HiveArt({ color = '#e0a95a', alveary = false, robo = false, className = 'hive-art', size }: { color?: string; alveary?: boolean; robo?: boolean; className?: string; size?: number }) {
  if (robo) return <RoboHiveArt className={className} size={size} />;
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

/** Robo-ruche : coque d'acier, antenne et voyants. */
function RoboHiveArt({ className, size }: { className: string; size?: number }) {
  return (
    <svg className={className} viewBox="0 0 92 84" width={size} aria-hidden>
      <line x1="46" y1="0" x2="46" y2="10" stroke="#546e7a" strokeWidth="3" />
      <circle cx="46" cy="3" r="3.5" fill="#00e676" />
      <rect x="12" y="10" width="68" height="22" rx="6" fill="#90a4ae" stroke="#0003" strokeWidth="2" />
      <rect x="10" y="30" width="72" height="22" rx="6" fill="#b0bec5" stroke="#0003" strokeWidth="2" />
      <rect x="6" y="46" width="80" height="34" rx="8" fill="#90a4ae" stroke="#0003" strokeWidth="2" />
      <circle cx="24" cy="21" r="3" fill="#00e676" />
      <circle cx="34" cy="21" r="3" fill="#ffca28" />
      <rect x="52" y="17" width="20" height="8" rx="2" fill="#263238" />
      <path d="M16 41h60M16 58h12M64 58h12" stroke="#607d8b" strokeWidth="2" />
      <rect x="35" y="59" width="22" height="14" rx="4" fill="#37474f" />
      <circle cx="18" cy="72" r="2" fill="#607d8b" />
      <circle cx="74" cy="72" r="2" fill="#607d8b" />
    </svg>
  );
}
