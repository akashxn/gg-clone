interface Props {
  onBack: () => void;
}

/** Placeholder — multiplayer is deliberately out of scope for the MVP. */
export default function Multiplayer({ onBack }: Props) {
  return (
    <div className="screen screen--center">
      <div className="panel panel--narrow">
        <div className="panel__icon" aria-hidden="true">🚧</div>
        <h2>Multiplayer isn't built yet</h2>
        <p className="muted">
          This is a placeholder. Single player is the whole game for now — head back and pick a
          region to start a run.
        </p>
        <button className="btn btn--primary" onClick={onBack}>
          Back to menu
        </button>
      </div>
    </div>
  );
}
