import React, { useState } from 'react';
import GameCanvas from './components/GameCanvas';
import UI from './components/UI';
import { GameState, WeaponType } from './types';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState(0);
  const [startingWeapon, setStartingWeapon] = useState<WeaponType>(WeaponType.VULCAN);
  const [playerStats, setPlayerStats] = useState({ 
    hp: 100, 
    maxHp: 100, 
    bombs: 2,
    weaponType: WeaponType.VULCAN,
    weaponLevel: 1 
  });

  const startGame = () => {
    setScore(0);
    setGameState(GameState.PLAYING);
  };

  const restartGame = () => {
    setScore(0);
    setGameState(GameState.MENU); // Go to menu to re-init state properly in canvas
    setTimeout(() => setGameState(GameState.PLAYING), 10);
  };

  return (
    <div className="relative w-full h-screen bg-zinc-950 flex items-center justify-center">
      {/* Container limits aspect ratio to vertical arcade style */}
      <div className="relative w-full max-w-[600px] h-full aspect-[3/4] bg-black shadow-2xl overflow-hidden border-x border-zinc-800">
        <GameCanvas 
           gameState={gameState} 
           setGameState={setGameState}
           score={score}
           setScore={setScore}
           setPlayerStats={setPlayerStats}
           startingWeapon={startingWeapon}
        />
        <UI 
          gameState={gameState} 
          score={score}
          playerStats={playerStats}
          onStart={startGame}
          onRestart={restartGame}
          startingWeapon={startingWeapon}
          setStartingWeapon={setStartingWeapon}
        />
      </div>
      
      {/* Scanline overlay for retro effect */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-40 bg-[length:100%_4px,6px_100%] mix-blend-overlay"></div>
    </div>
  );
};

export default App;