import { CSSProperties, useEffect, useMemo, useState } from "react";
import type { ClientConfig } from "../types";
import { resolveTourConfig } from "./tourConfig";
import { Coachmark } from "./Coachmark";
import {
  BrandedPdf,
  Crm,
  Estimate,
  Generating,
  Recap,
  Reveal,
  TheProject,
  ThePhoto,
  Welcome,
  YourDetails,
} from "./steps";
import "../tour.css";

const GEN_DURATION_MS = 2600;
const GEN_HOLD_MS = 400;

export function GuidedTour({ client }: { client: ClientConfig }) {
  const tour = useMemo(() => resolveTourConfig(client), [client]);

  const [s, setS] = useState(0);
  const [slider, setSlider] = useState(52);
  const [gen, setGen] = useState(0);
  const [options, setOptions] = useState<string[]>(tour.sampleOptions);

  const next = () => setS((v) => Math.min(9, v + 1));
  const back = () => setS((v) => Math.max(0, v - 1));
  const restart = () => {
    setS(0);
    setSlider(52);
    setGen(0);
    setOptions(tour.sampleOptions);
  };
  const toggle = (option: string) =>
    setOptions((cur) =>
      cur.includes(option) ? cur.filter((o) => o !== option) : [...cur, option],
    );

  // s4 fake-render progress: ramp 0→100 over GEN_DURATION_MS, then auto-advance
  // to s5. Cleanup cancels the frame + timeout so a "Skip" or unmount can't fire
  // a stale advance (StrictMode-safe).
  useEffect(() => {
    if (s !== 4) return;
    setGen(0);
    const start = performance.now();
    let raf = 0;
    let timeout = 0;
    const tick = (now: number) => {
      const pct = Math.min(100, ((now - start) / GEN_DURATION_MS) * 100);
      setGen(pct);
      if (pct < 100) {
        raf = requestAnimationFrame(tick);
      } else {
        timeout = window.setTimeout(() => setS((cur) => (cur === 4 ? 5 : cur)), GEN_HOLD_MS);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timeout);
    };
  }, [s]);

  const themeVars = {
    "--green-900": client.colors.primaryDark,
    "--green-800": client.colors.primaryDark,
    "--green-700": client.colors.primary,
    "--green-100": client.colors.primarySoft,
    "--gold": client.colors.accent,
    "--gold-dark": client.colors.accentDark,
  } as CSSProperties;

  return (
    <div className={`tour-shell client-${client.slug}`} style={themeVars}>
      <div className="tour-card">
        <div className="tour-chrome">
          <span className="tour-dot tour-dot-red" />
          <span className="tour-dot tour-dot-yellow" />
          <span className="tour-dot tour-dot-green" />
          <span className="tour-urlbar">{tour.urlBar}</span>
        </div>
        <div className="tour-site-header">
          <img className="tour-site-logo" src={client.logoPath} alt={client.companyName} />
          <div className="tour-site-nav">
            {client.navLinks.slice(0, 4).map((link) => (
              <span key={link} className="tour-site-link">
                {link}
              </span>
            ))}
            <span className="tour-btn-primary tour-site-cta">Get a Free Estimate</span>
          </div>
        </div>
        <div className="tour-stage">
          {s === 0 && <Welcome client={client} tour={tour} onStart={next} />}
          {s === 1 && <YourDetails tour={tour} />}
          {s === 2 && <TheProject client={client} options={options} onToggle={toggle} />}
          {s === 3 && <ThePhoto tour={tour} />}
          {s === 4 && <Generating tour={tour} gen={gen} />}
          {s === 5 && <Reveal tour={tour} slider={slider} onSlider={setSlider} />}
          {s === 6 && <Estimate tour={tour} />}
          {s === 7 && <BrandedPdf client={client} tour={tour} />}
          {s === 8 && <Crm client={client} tour={tour} />}
          {s === 9 && <Recap onRestart={restart} liveUrl={`/${client.slug}`} />}
          {s >= 1 && s <= 8 && <Coachmark step={s} onNext={next} onBack={back} />}
        </div>
      </div>
    </div>
  );
}
