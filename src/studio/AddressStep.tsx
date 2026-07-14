import { useEffect, useRef, useState } from "react";
import { getMapsApiKey, loadMapsLibraries } from "../services/googleMaps";
import type { StudioAddress } from "./studioState";

type Suggestion = {
  id: string;
  line1: string;
  line2: string;
  prediction: google.maps.places.PlacePrediction;
};

type AddressStepProps = {
  /** Hero background from tenant config (studio.heroImagePath). */
  heroImagePath?: string;
  /** Optional bias circle from tenant config (studio.locationBias). */
  locationBias?: { lat: number; lng: number; radiusMeters: number };
  onSelect: (address: StudioAddress) => void;
  onMapsFailed: () => void;
};

// Places Autocomplete (New) on a single input, biased to the US. On selection
// we read geometry straight from the Places result (fetchFields location) —
// the separate Geocoding API is NOT enabled on this key and must not be used.
export function AddressStep({
  heroImagePath,
  locationBias,
  onSelect,
  onMapsFailed,
}: AddressStepProps) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  // null = still loading; false = no key / loader failed (degrade gracefully).
  const [placesReady, setPlacesReady] = useState<boolean | null>(() =>
    getMapsApiKey() ? null : false,
  );
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const placesRef = useRef<google.maps.PlacesLibrary | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const requestSeq = useRef(0);

  useEffect(() => {
    let cancelled = false;
    if (placesReady === false) {
      onMapsFailed();
      return;
    }
    loadMapsLibraries()
      .then((libs) => {
        if (cancelled) return;
        placesRef.current = libs.places;
        sessionTokenRef.current = new libs.places.AutocompleteSessionToken();
        setPlacesReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setPlacesReady(false);
        onMapsFailed();
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const places = placesRef.current;
    const trimmed = query.trim();
    if (!placesReady || !places || trimmed.length < 3) {
      setSuggestions([]);
      return;
    }

    clearTimeout(debounceRef.current);
    const seq = ++requestSeq.current;
    debounceRef.current = setTimeout(async () => {
      try {
        const { suggestions: results } =
          await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: trimmed,
            sessionToken: sessionTokenRef.current ?? undefined,
            includedRegionCodes: ["us"],
            ...(locationBias
              ? {
                  locationBias: {
                    center: { lat: locationBias.lat, lng: locationBias.lng },
                    radius: locationBias.radiusMeters,
                  },
                }
              : {}),
          });
        if (seq !== requestSeq.current) return;
        setSuggestions(
          results
            .flatMap((s) => (s.placePrediction ? [s.placePrediction] : []))
            .slice(0, 5)
            .map((prediction, index) => ({
              id: `${index}-${prediction.placeId ?? prediction.text.text}`,
              line1: prediction.mainText?.text ?? prediction.text.text,
              line2: prediction.secondaryText?.text ?? "",
              prediction,
            })),
        );
      } catch {
        if (seq === requestSeq.current) setSuggestions([]);
      }
    }, 220);

    return () => clearTimeout(debounceRef.current);
  }, [query, placesReady, locationBias]);

  async function selectSuggestion(suggestion: Suggestion) {
    setFocused(false);
    setQuery(
      [suggestion.line1, suggestion.line2].filter(Boolean).join(", "),
    );
    try {
      const place = suggestion.prediction.toPlace();
      await place.fetchFields({ fields: ["location", "formattedAddress"] });
      sessionTokenRef.current = placesRef.current
        ? new placesRef.current.AutocompleteSessionToken()
        : null;
      onSelect({
        formatted:
          place.formattedAddress ??
          [suggestion.line1, suggestion.line2].filter(Boolean).join(", "),
        lat: place.location?.lat() ?? null,
        lng: place.location?.lng() ?? null,
      });
    } catch {
      onSelect({
        formatted: [suggestion.line1, suggestion.line2].filter(Boolean).join(", "),
        lat: null,
        lng: null,
      });
    }
  }

  function continueAnyway() {
    onSelect({ formatted: query.trim(), lat: null, lng: null });
  }

  const trimmed = query.trim();
  const showSuggest = focused && suggestions.length > 0;
  const notFound =
    focused && trimmed.length > 3 && suggestions.length === 0 && placesReady === true;
  const mapsDown = placesReady === false;

  return (
    <div className="studio-screen studio-address-screen">
      {heroImagePath && (
        <img
          className="studio-address-bg"
          src={heroImagePath}
          alt=""
          aria-hidden="true"
        />
      )}
      <div className="studio-address-gradient" />
      <div className="studio-address-col">
        <h2 className="studio-h2 studio-address-h2">
          Where&rsquo;s <em className="studio-serif">your yard</em>?
        </h2>
        <p className="studio-h2-helper">
          Enter your address and we&rsquo;ll pull up a satellite view of your
          property — measured in about 60 seconds.
        </p>
        <div className="studio-address-panel">
          <div className="studio-address-input-wrap">
          <div style={{ position: "relative" }}>
            <span className="studio-address-glyph">◉</span>
            <input
              className="studio-address-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setFocused(true)}
              placeholder="Enter your home address"
              autoComplete="off"
            />
          </div>
          {showSuggest && (
            <div className="studio-suggest-card">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  className="studio-suggest-row"
                  onClick={() => void selectSuggestion(suggestion)}
                >
                  <span className="studio-suggest-icon">◉</span>
                  <span className="studio-suggest-text">
                    <span className="studio-suggest-line1">{suggestion.line1}</span>
                    <span className="studio-suggest-line2">{suggestion.line2}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
          {(notFound || (mapsDown && trimmed.length > 3)) && (
            <div className="studio-addr-notfound">
              <div className="studio-addr-notfound-title">
                {mapsDown
                  ? "Live address lookup is unavailable right now"
                  : "We couldn't find that exact address"}
              </div>
              <div className="studio-addr-notfound-sub">
                {mapsDown
                  ? "You can still continue — we'll confirm the details at your free on-site measure."
                  : "Check the spelling, or continue and we'll confirm on-site."}
              </div>
              <button
                type="button"
                className="studio-continue-anyway"
                onClick={continueAnyway}
              >
                Continue anyway →
              </button>
            </div>
          )}
          </div>
          <div className="studio-address-features">
            <div className="studio-af">
              <div className="studio-af-label">Instant</div>
              <div className="studio-af-title">Satellite area calc</div>
              <div className="studio-af-sub">
                60-second yard measurement from above
              </div>
            </div>
            <div className="studio-af">
              <div className="studio-af-label">Reality</div>
              <div className="studio-af-title">Pro AI render</div>
              <div className="studio-af-sub">
                Your yard transformed — not a stock photo
              </div>
            </div>
            <div className="studio-af">
              <div className="studio-af-label">Custom</div>
              <div className="studio-af-title">Design packages</div>
              <div className="studio-af-sub">
                Pick a package, see your design
              </div>
            </div>
            <div className="studio-af">
              <div className="studio-af-label">Real</div>
              <div className="studio-af-title">Budget range</div>
              <div className="studio-af-sub">
                Honest numbers before we ever visit
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
