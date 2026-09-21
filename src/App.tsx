import { useState } from 'react';
import Home from './components/Home';
import Setup from './components/Setup';
import Game from './components/Game';
import Summary from './components/Summary';
import Multiplayer from './components/Multiplayer';
import type { Filter, Phase, RoundResult } from './types';

export default function App() {
  const [phase, setPhase] = useState<Phase>('home');
  const [filter, setFilter] = useState<Filter>({ kind: 'world' });
  const [results, setResults] = useState<RoundResult[]>([]);
  /** Bumped on every new game so <Game> remounts with fresh rounds. */
  const [gameId, setGameId] = useState(0);

  const startGame = (chosen: Filter) => {
    setFilter(chosen);
    setResults([]);
    setGameId((n) => n + 1);
    setPhase('playing');
  };

  const playAgain = () => startGame(filter);

  switch (phase) {
    case 'home':
      return (
        <Home
          onSinglePlayer={() => setPhase('setup')}
          onMultiplayer={() => setPhase('multiplayer')}
        />
      );

    case 'setup':
      return <Setup onStart={startGame} onBack={() => setPhase('home')} />;

    case 'playing':
      return (
        <Game
          key={gameId}
          filter={filter}
          onFinish={(rs) => {
            setResults(rs);
            setPhase('summary');
          }}
          onQuit={() => setPhase('home')}
        />
      );

    case 'summary':
      return (
        <Summary
          filter={filter}
          results={results}
          onPlayAgain={playAgain}
          onChangeMap={() => setPhase('setup')}
          onHome={() => setPhase('home')}
        />
      );

    case 'multiplayer':
      return <Multiplayer onBack={() => setPhase('home')} />;
  }
}
