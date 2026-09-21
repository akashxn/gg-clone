interface Props {
  onSinglePlayer: () => void;
  onMultiplayer: () => void;
}

export default function Home({ onSinglePlayer, onMultiplayer }: Props) {
  return (
    <div className="screen screen--center home">
      <div className="home__inner">
        <div className="home__globe" aria-hidden="true">🌍</div>
        <h1 className="home__title">GG Clone</h1>
        <p className="home__tagline">
          Dropped somewhere on Earth with nothing but the view. Ten rounds. Guess where you are.
        </p>

        <div className="home__modes">
          <button className="mode mode--primary" onClick={onSinglePlayer}>
            <span className="mode__label">Single Player</span>
            <span className="mode__hint">10 rounds &middot; play at your own pace</span>
          </button>

          <button className="mode" onClick={onMultiplayer}>
            <span className="mode__label">
              Multiplayer <span className="badge">Soon</span>
            </span>
            <span className="mode__hint">Race other players in real time</span>
          </button>
        </div>
      </div>
    </div>
  );
}
