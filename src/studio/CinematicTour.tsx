// Fullscreen "Cinematic tour" takeover — a slow Ken Burns pan/zoom over the
// after image (stKen, 14s ease-in-out alternate, per the design handoff).
// This IS the "Tour" experience; the Property Flyover (Aerial View API) is a
// separate, feature-flagged view mode.

type CinematicTourProps = {
  afterImage: string;
  packageName: string;
  captionSub: string;
  onClose: () => void;
};

export function CinematicTour({
  afterImage,
  packageName,
  captionSub,
  onClose,
}: CinematicTourProps) {
  return (
    <div className="studio-tour-takeover">
      <img src={afterImage} alt="Your yard design" />
      <div className="studio-tour-caption">
        <div className="studio-tour-caption-title">{packageName}</div>
        <div className="studio-tour-caption-sub">{captionSub}</div>
      </div>
      <button
        type="button"
        className="studio-tour-close"
        onClick={onClose}
        aria-label="Close tour"
      >
        ✕
      </button>
    </div>
  );
}
