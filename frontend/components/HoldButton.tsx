'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/** Bouton à maintenir enfoncé : déclenche `onDone` à chaque fois que la durée s'écoule. */
export function HoldButton({
  seconds,
  onDone,
  disabled,
  children,
}: {
  seconds: number;
  onDone: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  const [progress, setProgress] = useState(0);
  const frame = useRef<number | undefined>(undefined);
  const done = useRef(onDone);
  useLayoutEffect(() => {
    done.current = onDone;
  });

  const cancel = () => {
    if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    frame.current = undefined;
  };

  const stop = () => {
    cancel();
    setProgress(0);
  };

  const start = () => {
    if (disabled || frame.current !== undefined) return;
    let began = performance.now();
    const tick = (now: number) => {
      const ratio = (now - began) / (seconds * 1000);
      if (ratio >= 1) {
        done.current();
        began = now;
        setProgress(0);
      } else {
        setProgress(ratio);
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  };

  useEffect(() => cancel, []);
  // Désactivé en cours d'appui : on arrête l'animation, la jauge s'affiche vide
  useEffect(() => {
    if (disabled) cancel();
  }, [disabled]);

  return (
    <button
      className="primary hold"
      disabled={disabled}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) start();
      }}
      onKeyUp={stop}
      onBlur={stop}
    >
      <span className="hold-fill" style={{ width: `${disabled ? 0 : progress * 100}%` }} />
      <span className="hold-label">{children}</span>
    </button>
  );
}
