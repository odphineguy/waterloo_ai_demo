import { CSSProperties, useEffect, useMemo, useState } from "react";
import type { ClientConfig } from "../types";
import { resolveTourConfig } from "./tourConfig";
import { Coachmark } from "./Coachmark";
import {
  BrandedPdf,
  Crm,
  Estimate,
  Generating,
  ProjectAndPhoto,
  Recap,
  Reveal,
  Welcome,
} from "./steps";
import "../tour.css";

const GEN_DURATION_MS = 2600;

export function GuidedTour({ client }: { client: ClientConfig }) {
  const tour = useMemo(() => resolveTourConfig(client), [client]);

  const [s, setS] = useState(0);
  const [slider, setSlider] = useState(52);
  const [gen, setGen] = useState(0);
  const [options, setOptions] = useState<string[]>(tour.sampleOptions);

  const next = () => setS((v) => Math.min(7, v + 1));
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

  // s2 fake-render progress: ramp the bar 0→100 over GEN_DURATION_MS for the
  // "AI working" effect, then stop. The user clicks Next to see the reveal — no
  // auto-advance. Cleanup cancels the frame on unmount/step change.
  useEffect(() => {
    if (s !== 2) return;
    setGen(0);
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const pct = Math.min(100, ((now - start) / GEN_DURATION_MS) * 100);
      setGen(pct);
      if (pct < 100) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
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
          {s === 1 && (
            <ProjectAndPhoto client={client} tour={tour} options={options} onToggle={toggle} />
          )}
          {s === 2 && <Generating tour={tour} gen={gen} />}
          {s === 3 && <Reveal tour={tour} slider={slider} onSlider={setSlider} />}
          {s === 4 && <Estimate tour={tour} />}
          {s === 5 && <BrandedPdf client={client} tour={tour} />}
          {s === 6 && <Crm client={client} tour={tour} />}
          {s === 7 && (
            <Recap
              onRestart={restart}
              liveUrl={`/${client.slug}`}
              bookingUrl={tour.bookingUrl}
              brandColor={client.colors.primary}
            />
          )}
          {s >= 1 && s <= 6 && <Coachmark step={s} onNext={next} onBack={back} />}
        </div>
      </div>
    </div>
  );
}
