'use client';

import { useState } from 'react';
import { BIOME_ICONS, CostView, SHORT, WEATHER_ICONS, canAfford } from '@/components/ui';
import { useGame } from '@/lib/game';

/** Grand télescope : impose une météo sur un biome, payée en ressources d'abeilles. */
export function SkyControl() {
  const { content, state, act } = useGame();
  const sky = content.projects.sky;
  const biomes = [...new Set(state.hives.map((h) => h.biome))];
  const [biome, setBiome] = useState(biomes[0] ?? 'plains');
  const active = Object.entries(state.sky ?? {}).filter(([, f]) => f.until > state.server_time);
  const minutes = (ms: number) => `${Math.max(1, Math.ceil(ms / 60000))} min`;

  return (
    <div className="sky">
      <div className="title">🌦️ Maître du ciel</div>
      <span className="muted">
        Imposez une météo sur un biome pendant {sky.minutes} min : pluie, orage ou neige pour les mutations qui les demandent, beau
        temps pour que les abeilles travaillent. Relancer la même météo la prolonge. Les ruches sous serre n'en voient rien.
      </span>
      {active.length > 0 && (
        <div className="row" style={{ gap: 6 }}>
          {active.map(([b, f]) => (
            <span key={b} className="chip">
              {BIOME_ICONS[b]} {content.biomes[b]?.label} : {WEATHER_ICONS[f.weather] || '☀️'} {content.world.weathers[f.weather]} ·{' '}
              {minutes(f.until - state.server_time)}
            </span>
          ))}
        </div>
      )}
      <div className="row" style={{ gap: 6 }}>
        {Object.keys(content.biomes).map((b) => (
          <button key={b} className={`small${biome === b ? ' primary' : ''}`} onClick={() => setBiome(b)}>
            {BIOME_ICONS[b]} {content.biomes[b].label}
          </button>
        ))}
      </div>
      <div className="sky-weathers">
        {Object.entries(sky.weathers).map(([w, spec]) => {
          const cost = { honey: 0, items: spec.items };
          const ok = canAfford(state, cost);
          return (
            <div key={w} className="sky-weather">
              <b>
                {WEATHER_ICONS[w] || '☀️'} {content.world.weathers[w]}
              </b>
              <CostView cost={cost} />
              <button
                className="small"
                disabled={!ok}
                title={ok ? undefined : SHORT}
                onClick={() => act('/observatory/sky', { biome, weather: w })}
              >
                Imposer
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
