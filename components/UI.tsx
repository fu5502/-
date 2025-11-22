import React, { useState, useEffect } from 'react';
import { GameState, WeaponType, LeaderboardEntry } from '../types';
import { Activity, Bomb, Trophy, Skull, RotateCcw, Crosshair, Zap, CircleDashed, ChevronRight, ChevronLeft, Play, Info, X, Keyboard, Loader2, Globe, WifiOff } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface UIProps {
  gameState: GameState;
  score: number;
  playerStats: { 
    hp: number; 
    maxHp: number; 
    bombs: number;
    weaponType: WeaponType;
    weaponLevel: number;
  };
  onStart: () => void;
  onRestart: () => void;
  startingWeapon?: WeaponType;
  setStartingWeapon?: (type: WeaponType) => void;
}

const UI: React.FC<UIProps> = ({ 
  gameState, 
  score, 
  playerStats, 
  onStart, 
  onRestart,
  startingWeapon = WeaponType.VULCAN,
  setStartingWeapon
}) => {
  const [showHelp, setShowHelp] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [highScores, setHighScores] = useState<LeaderboardEntry[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check connection and load initial data
  useEffect(() => {
      const checkConnection = async () => {
          if (supabase) {
              setIsOnline(true);
              await fetchScores();
          } else {
              setIsOnline(false);
              loadLocalScores();
          }
      };
      
      if (showLeaderboard || gameState === GameState.GAME_OVER || gameState === GameState.VICTORY) {
          checkConnection();
      }
  }, [showLeaderboard, gameState]);

  const loadLocalScores = () => {
      const saved = localStorage.getItem('raiden_scores');
      if (saved) {
          try { setHighScores(JSON.parse(saved)); } catch (e) {}
      } else {
          setHighScores([
              { name: 'PILOT-001', score: 50000, date: '2023-10-01' },
              { name: 'ACE_FOX', score: 35000, date: '2023-10-02' },
              { name: 'ROOKIE', score: 10000, date: '2023-10-03' }
          ]);
      }
  };

  const fetchScores = async () => {
      if (!supabase) return;
      setIsLoading(true);
      try {
          const { data, error } = await supabase
              .from('leaderboard')
              .select('*')
              .order('score', { ascending: false })
              .limit(50);
          
          if (error) throw error;
          if (data) setHighScores(data);
      } catch (err) {
          console.error('Error fetching scores:', err);
          // Fallback to local if fetch fails
          loadLocalScores();
      } finally {
          setIsLoading(false);
      }
  };

  const saveScore = async () => {
      if (!playerName.trim()) return;
      setIsLoading(true);
      const dateStr = new Date().toLocaleDateString();
      
      try {
          if (supabase && isOnline) {
              // Online Save
              const { error } = await supabase
                  .from('leaderboard')
                  .insert([{ 
                      name: playerName.toUpperCase().slice(0, 10), 
                      score: score, 
                      date: dateStr 
                  }]);
              
              if (error) throw error;
              await fetchScores(); // Refresh list
          } else {
              // Local Save
              const newEntry: LeaderboardEntry = {
                  name: playerName.toUpperCase().slice(0, 10),
                  score: score,
                  date: dateStr
              };
              const currentScores = [...highScores, newEntry]
                  .sort((a, b) => b.score - a.score)
                  .slice(0, 10); // Keep only top 10 locally
              
              setHighScores(currentScores);
              localStorage.setItem('raiden_scores', JSON.stringify(currentScores));
          }
          setHasSubmitted(true);
      } catch (err) {
          console.error('Error saving score:', err);
          alert('提交失败，请重试');
      } finally {
          setIsLoading(false);
      }
  };

  const getWeaponIcon = (type: WeaponType) => {
    switch (type) {
        case WeaponType.VULCAN: return <Crosshair className="w-6 h-6" />;
        case WeaponType.LASER: return <Zap className="w-6 h-6" />;
        case WeaponType.PLASMA: return <CircleDashed className="w-6 h-6" />;
    }
  };

  const getWeaponName = (type: WeaponType) => {
    switch (type) {
        case WeaponType.VULCAN: return "红莲散弹 (VULCAN)";
        case WeaponType.LASER: return "苍穹激光 (LASER)";
        case WeaponType.PLASMA: return "紫电追踪 (PLASMA)";
    }
  };

  const getWeaponColor = (type: WeaponType) => {
      switch (type) {
          case WeaponType.VULCAN: return "text-red-500 border-red-500 shadow-red-500/50";
          case WeaponType.LASER: return "text-blue-500 border-blue-500 shadow-blue-500/50";
          case WeaponType.PLASMA: return "text-purple-500 border-purple-500 shadow-purple-500/50";
      }
  }

  const cycleWeapon = (direction: 1 | -1) => {
      if (!setStartingWeapon) return;
      let next = startingWeapon + direction;
      if (next > 2) next = 0;
      if (next < 0) next = 2;
      setStartingWeapon(next as WeaponType);
  };

  // Reset submission state when game ends
  useEffect(() => {
      if (gameState === GameState.GAME_OVER || gameState === GameState.VICTORY) {
          setHasSubmitted(false);
          setPlayerName('');
      }
  }, [gameState]);

  // LEADERBOARD MODAL
  const LeaderboardView = ({ onClose }: { onClose?: () => void }) => (
      <div className="absolute inset-0 z-60 bg-black/95 flex flex-col p-6 animate-in fade-in slide-in-from-bottom-5">
          <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
              <div className="flex flex-col">
                  <h2 className="text-2xl font-black text-yellow-500 flex items-center gap-2">
                      <Trophy /> 英雄榜 HALL OF FAME
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                      {isOnline ? (
                          <span className="text-xs font-bold text-green-400 flex items-center gap-1"><Globe size={12} /> 全球联机 ONLINE</span>
                      ) : (
                          <span className="text-xs font-bold text-gray-500 flex items-center gap-1"><WifiOff size={12} /> 本地模式 LOCAL</span>
                      )}
                  </div>
              </div>
              {onClose && (
                  <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white">
                      <X />
                  </button>
              )}
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
              {isLoading ? (
                  <div className="flex justify-center items-center h-40 text-blue-400">
                      <Loader2 className="animate-spin w-8 h-8" />
                  </div>
              ) : (
                  <table className="w-full text-left border-collapse">
                      <thead>
                          <tr className="text-gray-500 text-sm border-b border-gray-800 sticky top-0 bg-black/90">
                              <th className="py-2">排名</th>
                              <th className="py-2">机师代号</th>
                              <th className="py-2 text-right">得分</th>
                              <th className="py-2 text-right">日期</th>
                          </tr>
                      </thead>
                      <tbody>
                          {highScores.map((entry, idx) => (
                              <tr key={idx} className={`border-b border-gray-800/50 transition-colors ${entry.name === playerName ? 'bg-blue-900/30' : 'hover:bg-white/5'}`}>
                                  <td className="py-3 font-mono text-gray-400 pl-2">
                                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                                  </td>
                                  <td className="py-3 font-bold text-white tracking-widest">{entry.name}</td>
                                  <td className="py-3 font-mono text-blue-400 text-right">{entry.score.toLocaleString()}</td>
                                  <td className="py-3 text-gray-600 text-xs text-right pr-2">{entry.date}</td>
                              </tr>
                          ))}
                          {highScores.length === 0 && (
                              <tr><td colSpan={4} className="py-8 text-center text-gray-600">暂无数据 NO DATA</td></tr>
                          )}
                      </tbody>
                  </table>
              )}
          </div>
      </div>
  );

  if (gameState === GameState.MENU) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50 backdrop-blur-sm">
        {showLeaderboard && <LeaderboardView onClose={() => setShowLeaderboard(false)} />}
        {showHelp && (
            <div className="absolute inset-0 z-60 bg-black/95 flex flex-col overflow-y-auto custom-scrollbar p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-blue-400">作战说明 INSTRUCTIONS</h2>
                    <button onClick={() => setShowHelp(false)} className="text-white"><X /></button>
                </div>
                <div className="space-y-4 text-gray-300 text-sm leading-relaxed">
                    <p className="flex items-center gap-2"><Keyboard size={16} /> <strong>移动操作：</strong>使用 WASD 或 方向键 移动战机。</p>
                    <p className="flex items-center gap-2"><Zap size={16} /> <strong>攻击模式：</strong>战机自动开火。按 SPACE 空格键也可射击。</p>
                    <p className="flex items-center gap-2"><Bomb size={16} /> <strong>护身炸弹：</strong>按 B 键或 Shift 键释放全屏炸弹，清除敌机与弹幕。</p>
                    <div className="h-px bg-gray-700 my-2"></div>
                    <p><strong>武器升级：</strong>拾取与当前武器同色的 [P] 道具可提升威力，最高 LV.8！拾取异色道具可切换武器类型。</p>
                    <p><strong>纳米修复：</strong>若5秒内未受到任何伤害，战机护盾将缓慢自动充能。</p>
                </div>
            </div>
        )}

        <div className="relative w-full max-w-sm p-8 bg-gray-900/95 border border-blue-500/30 rounded-xl shadow-[0_0_50px_rgba(59,130,246,0.2)] text-center">
          <h1 className="text-6xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-white to-blue-600 mb-2">雷电</h1>
          <h2 className="text-2xl font-bold text-white tracking-[0.5em] mb-8">REACT</h2>
          
          <div className="bg-black/40 p-4 rounded border border-gray-700 mb-6">
              <div className="flex items-center justify-between">
                  <button onClick={() => cycleWeapon(-1)} className="text-white/50 hover:text-white"><ChevronLeft /></button>
                  <div className="flex flex-col items-center">
                      <div className={`p-4 rounded-full border-2 mb-2 ${getWeaponColor(startingWeapon)}`}>{getWeaponIcon(startingWeapon)}</div>
                      <span className="text-white font-mono text-sm">{getWeaponName(startingWeapon)}</span>
                  </div>
                  <button onClick={() => cycleWeapon(1)} className="text-white/50 hover:text-white"><ChevronRight /></button>
              </div>
          </div>

          <div className="flex flex-col gap-3">
              <button onClick={onStart} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded flex justify-center gap-2 items-center"><Play size={20} /> 出击 START</button>
              <button onClick={() => setShowLeaderboard(true)} className="w-full bg-gray-800 text-gray-300 py-3 rounded flex justify-center gap-2 items-center"><Trophy size={20} /> 排行榜 RANK</button>
              <button onClick={() => setShowHelp(true)} className="w-full bg-gray-800 text-gray-300 py-3 rounded flex justify-center gap-2 items-center"><Info size={20} /> 说明 HELP</button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === GameState.GAME_OVER || gameState === GameState.VICTORY) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-50 backdrop-blur-md animate-in fade-in">
        <div className="w-full max-w-md p-6">
            <div className="text-center mb-8">
                {gameState === GameState.VICTORY ? <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-2" /> : <Skull className="w-16 h-16 text-red-500 mx-auto mb-2" />}
                <h2 className="text-4xl font-black text-white tracking-widest">{gameState === GameState.VICTORY ? '任务完成' : '游戏结束'}</h2>
                <div className="mt-4 bg-gray-900 border border-gray-700 p-4 rounded">
                    <div className="text-xs text-gray-500">最终得分 FINAL SCORE</div>
                    <div className="text-4xl font-mono text-blue-400 font-bold">{score.toLocaleString()}</div>
                </div>
            </div>

            {/* Score Submission */}
            {!hasSubmitted ? (
                <div className="mb-6 bg-gray-800 p-4 rounded border border-gray-700">
                    <p className="text-gray-400 text-sm mb-2 flex justify-between">
                        <span>输入机师代号上榜 Enter Name:</span>
                        {isOnline && <span className="text-green-400 text-xs flex items-center gap-1"><Globe size={10} /> ONLINE</span>}
                    </p>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            maxLength={10}
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                            className="bg-black border border-gray-600 text-white px-3 py-2 rounded flex-1 uppercase font-mono tracking-widest focus:border-blue-500 outline-none"
                            placeholder="AAA"
                        />
                        <button 
                            onClick={saveScore}
                            disabled={!playerName || isLoading}
                            className="bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded font-bold flex items-center gap-2"
                        >
                            {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : '提交'}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="mb-6 h-64 overflow-hidden relative rounded border border-gray-800">
                    <LeaderboardView />
                </div>
            )}

            <div className="flex justify-center">
                <button onClick={onRestart} className="flex items-center gap-2 px-8 py-3 bg-white hover:bg-gray-200 text-black font-bold rounded text-lg">
                    <RotateCcw size={20} /> {hasSubmitted ? '再次出击' : '跳过并重来'}
                </button>
            </div>
        </div>
      </div>
    );
  }

  // HUD
  return (
    <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
      <div className="flex justify-between items-start">
        <div className="bg-gray-900/80 border border-blue-500/30 p-2 rounded backdrop-blur-md">
           <div className="text-xs text-blue-400 font-bold">得分 SCORE</div>
           <div className="text-2xl text-white font-mono font-bold">{score.toString().padStart(8, '0')}</div>
        </div>
        <div className="flex gap-1">
           {Array.from({ length: playerStats.bombs }).map((_, i) => (
             <Bomb key={i} className="text-red-500 w-6 h-6 animate-pulse" fill="currentColor" />
           ))}
        </div>
      </div>

      <div className="w-full flex items-end justify-between gap-4 bg-black/40 p-2 rounded-xl backdrop-blur-sm border border-white/5">
        <div className="flex flex-col items-center bg-gray-900/80 p-2 rounded border border-gray-700 min-w-[70px]">
            <div className={`mb-1 ${getWeaponColor(playerStats.weaponType).split(' ')[0]}`}>{getWeaponIcon(playerStats.weaponType)}</div>
            <div className="text-xs font-mono text-yellow-400">LV.{playerStats.weaponLevel}</div>
        </div>
        <div className="flex-1 pb-1">
            <div className="flex items-center gap-2 mb-1 justify-end">
                <div className="text-xs text-green-400 font-bold">护盾 SHIELD</div>
                <Activity className="w-4 h-4 text-green-400" />
            </div>
            <div className="h-6 bg-gray-800 rounded-sm overflow-hidden border border-gray-600 relative">
                <div className={`h-full transition-all duration-200 ${playerStats.hp < 30 ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-r from-green-700 to-green-400'}`} style={{ width: `${(playerStats.hp / playerStats.maxHp) * 100}%` }} />
            </div>
        </div>
      </div>
    </div>
  );
};

export default UI;