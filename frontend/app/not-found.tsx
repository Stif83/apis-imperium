'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { BeeIcon } from '@/components/BeeIcon';
import { useGame } from '@/lib/game';

/** Page introuvable… et petit succès secret pour qui s'y égare. */
export default function NotFound() {
  const { state, act } = useGame();
  useEffect(() => {
    if (!('lost' in (state.achievements ?? {}))) act('/secrets', { code: 'lost' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="lost-page">
      <span className="lost-bee">
        <BeeIcon species="forest" color="19d0ec" secondary="ffdc16" type="drone" size={120} />
      </span>
      <h1>Cette abeille s'est perdue</h1>
      <p className="muted">La page demandée n'existe pas. Elle a peut-être butiné ailleurs.</p>
      <Link href="/" className="primary-link">
        Retour au rucher
      </Link>
    </div>
  );
}
