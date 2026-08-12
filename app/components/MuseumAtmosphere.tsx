type MuseumAtmosphereProps = {
  variant?: "lobby" | "gallery" | "program";
  className?: string;
};

export default function MuseumAtmosphere({
  variant = "lobby",
  className = "",
}: MuseumAtmosphereProps) {
  return (
    <div
      aria-hidden="true"
      className={`museum-atmosphere museum-atmosphere--${variant} ${className}`}
    >
      <span className="museum-atmosphere__ceiling" />
      <span className="museum-atmosphere__beam museum-atmosphere__beam--left" />
      <span className="museum-atmosphere__beam museum-atmosphere__beam--right" />
      <span className="museum-atmosphere__horizon" />
      <span className="museum-atmosphere__floor" />
    </div>
  );
}
