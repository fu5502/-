import React, { useState } from 'react';
import { GameState, WeaponType } from '../types';
import { Activity, Bomb, Trophy, Skull, RotateCcw, Crosshair, Zap, CircleDashed, ChevronRight, ChevronLeft, Play, Info, X, Keyboard, MousePointer2 } from 'lucide-react';

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
  
  const getWeaponIcon = (type: WeaponType) => {
    switch (type) {
        case WeaponType.VULCAN: return <Crosshair className="w-6 h-6" />;
        case WeaponType.LASER: return <Zap className="w-6 h-6" />;
        case WeaponType.PLASMA: return <CircleDashed className="w-6 h-6" />;
    }
  };

  const getWeaponName = (type: WeaponType) => {
    switch (type) {
        case WeaponType.VULCAN: return "VULCAN (散弹)";
        case WeaponType.LASER: return "LASER (激光)";
        case WeaponType.PLASMA: return "PLASMA (追踪)";
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

  if (gameState === GameState.MENU) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50 backdrop-blur-sm">
        {showHelp && (
            <div className="absolute inset-0 z-60 bg-black/95 flex flex-col overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-bottom-10 duration-300">
                <div className="sticky top-0 bg-gray-900/95 border-b border-blue-500/30 p-4 flex justify-between items-center backdrop-blur-md z-10">
                    <div className="flex items-center gap-2">
                        <Info className="text-blue-400" />
                        <h2 className="text-xl font-bold text-white tracking-widest">作战说明 MISSION BRIEFING</h2>
                    </div>
                    <button onClick={() => setShowHelp(false)} className="p-2 hover:bg-white/10 rounded-full text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-6 space-y-8 max-w-lg mx-auto w-full pb-20">
                    {/* Story */}
                    <div className="border-l-4 border-blue-500 pl-4 py-1">
                        <p className="text-gray-300 text-sm leading-relaxed font-mono">
                            公元 2077 年，外星机械军团入侵地球。作为“雷电”特攻队的最后王牌，你将驾驶超音速战机，穿越枪林弹雨，摧毁敌方核心。
                        </p>
                    </div>

                    {/* Controls */}
                    <section>
                        <h3 className="text-blue-400 font-bold text-sm mb-4 flex items-center gap-2 uppercase tracking-widest border-b border-blue-500/30 pb-1">
                            <Keyboard size={16} /> 操作指南 Controls
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-900 p-3 rounded border border-gray-800 flex flex-col gap-2">
                                <div className="text-xs text-gray-500 uppercase">移动 Movement</div>
                                <div className="flex gap-2 text-white font-mono text-sm">
                                    <span className="px-2 py-1 bg-gray-800 rounded border border-gray-700">WASD</span>
                                    <span className="px-2 py-1 bg-gray-800 rounded border border-gray-700">↑↓←→</span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">触摸拖动 Touch Drag</div>
                            </div>
                            <div className="bg-gray-900 p-3 rounded border border-gray-800 flex flex-col gap-2">
                                <div className="text-xs text-gray-500 uppercase">攻击 Attack</div>
                                <div className="flex flex-col gap-1">
                                    <div className="text-white font-mono text-sm">
                                        <span className="text-xs text-gray-400">射击:</span> 自动 / Space
                                    </div>
                                    <div className="text-white font-mono text-sm">
                                        <span className="text-xs text-gray-400">炸弹:</span> B / Shift
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Weapons */}
                    <section>
                        <h3 className="text-blue-400 font-bold text-sm mb-4 flex items-center gap-2 uppercase tracking-widest border-b border-blue-500/30 pb-1">
                            <Crosshair size={16} /> 武器系统 Weapons
                        </h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-4 bg-gray-900/50 p-3 rounded border border-gray-800">
                                <div className="w-10 h-10 rounded-full bg-red-900/30 border border-red-500 flex items-center justify-center text-red-500 font-bold">R</div>
                                <div>
                                    <div className="text-red-400 font-bold text-sm">散弹 Vulcan</div>
                                    <div className="text-gray-500 text-xs">广域覆盖，包含微型跟踪导弹。</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 bg-gray-900/50 p-3 rounded border border-gray-800">
                                <div className="w-10 h-10 rounded-full bg-blue-900/30 border border-blue-500 flex items-center justify-center text-blue-500 font-bold">L</div>
                                <div>
                                    <div className="text-blue-400 font-bold text-sm">激光 Laser</div>
                                    <div className="text-gray-500 text-xs">直线高伤，包含侧翼能量波。</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 bg-gray-900/50 p-3 rounded border border-gray-800">
                                <div className="w-10 h-10 rounded-full bg-purple-900/30 border border-purple-500 flex items-center justify-center text-purple-500 font-bold">P</div>
                                <div>
                                    <div className="text-purple-400 font-bold text-sm">等离子 Plasma</div>
                                    <div className="text-gray-500 text-xs">全屏追踪，包含穿透性主炮。</div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Items */}
                    <section>
                        <h3 className="text-blue-400 font-bold text-sm mb-4 flex items-center gap-2 uppercase tracking-widest border-b border-blue-500/30 pb-1">
                            <Activity size={16} /> 支援道具 Items
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-yellow-900/30 border border-yellow-500 flex items-center justify-center text-yellow-500 text-xs font-bold">UP</div>
                                <div className="text-xs text-gray-400">火力升级 (MAX Lv.4)</div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-amber-900/30 border border-amber-500 flex items-center justify-center text-amber-500 text-xs font-bold">B</div>
                                <div className="text-xs text-gray-400">全屏炸弹补给</div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-green-900/30 border border-green-500 flex items-center justify-center text-green-500 text-xs font-bold">H</div>
                                <div className="text-xs text-gray-400">护盾修复</div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        )}

        <div className="relative w-full max-w-sm mx-4 p-8 border-2 border-blue-500/30 bg-gray-900/95 shadow-[0_0_50px_rgba(59,130,246,0.2)] flex flex-col items-center gap-6 rounded-xl overflow-hidden">
          {/* Decorative Grid */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.1)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none opacity-30"></div>
          
          <div className="relative z-10 text-center mb-4">
            <div className="inline-block mb-2 px-3 py-1 rounded-full bg-blue-900/50 border border-blue-500/50 text-blue-400 text-xs font-mono tracking-widest">
              SYSTEM READY
            </div>
            <h1 className="text-6xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-white via-blue-200 to-blue-600 mb-0 tracking-tighter drop-shadow-[0_0_15px_rgba(59,130,246,0.8)]">
                雷电
            </h1>
            <h2 className="text-3xl font-black text-white/90 tracking-[0.5em] ml-2 -mt-2">REACT</h2>
          </div>

          {/* Weapon Selection */}
          <div className="relative z-10 w-full bg-black/40 p-4 rounded-lg border border-gray-700/50 backdrop-blur-md">
              <p className="text-gray-400 text-xs font-mono mb-3 text-center uppercase tracking-widest border-b border-gray-700/50 pb-2">
                武器选择 Weapon Select
              </p>
              <div className="flex items-center justify-between">
                  <button onClick={() => cycleWeapon(-1)} className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors">
                      <ChevronLeft size={24} />
                  </button>
                  
                  <div className={`flex flex-col items-center gap-3 transition-all duration-300 group`}>
                      <div className={`p-5 rounded-2xl border-2 bg-gray-900/80 shadow-lg transition-all duration-300 ${getWeaponColor(startingWeapon)}`}>
                          {getWeaponIcon(startingWeapon)}
                      </div>
                      <div className="font-bold font-mono text-lg text-white">
                          {getWeaponName(startingWeapon)}
                      </div>
                  </div>

                  <button onClick={() => cycleWeapon(1)} className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors">
                      <ChevronRight size={24} />
                  </button>
              </div>
          </div>

          <div className="relative z-10 w-full flex flex-col gap-3">
              <button 
                onClick={onStart}
                className="w-full group bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-4 px-6 rounded-lg shadow-lg transform transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 overflow-hidden"
              >
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_2s_linear_infinite] opacity-0 group-hover:opacity-100"></div>
                <Play size={24} fill="currentColor" />
                <span className="text-xl tracking-widest">出击 START</span>
              </button>

              <button 
                onClick={() => setShowHelp(true)}
                className="w-full bg-gray-800/80 hover:bg-gray-700 text-gray-300 font-bold py-3 px-6 rounded-lg border border-gray-700 transition-all flex items-center justify-center gap-2"
              >
                <Info size={20} />
                <span>作战说明 INSTRUCTIONS</span>
              </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === GameState.GAME_OVER || gameState === GameState.VICTORY) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/85 z-50 backdrop-blur-sm animate-in fade-in duration-500">
        <div className="text-center p-6 border border-gray-800 bg-black/50 rounded-xl min-w-[300px]">
          {gameState === GameState.VICTORY ? (
             <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-4 animate-bounce" />
          ) : (
             <Skull className="w-20 h-20 text-red-500 mx-auto mb-4 animate-pulse" />
          )}
          <h2 className={`text-5xl font-black mb-4 ${gameState === GameState.VICTORY ? 'text-yellow-400' : 'text-red-500 tracking-widest'}`}>
            {gameState === GameState.VICTORY ? '任务完成' : '游戏结束'}
          </h2>
          
          <div className="bg-gray-900/80 rounded p-4 mb-8 border border-gray-700">
             <p className="text-gray-400 text-sm font-mono mb-1">最终得分 SCORE</p>
             <p className="text-white text-3xl font-mono font-bold tracking-widest">{score.toLocaleString()}</p>
          </div>

          <button 
            onClick={onRestart}
            className="flex items-center gap-2 mx-auto px-8 py-3 bg-white hover:bg-gray-200 text-black font-bold rounded text-xl transition-all hover:scale-105"
          >
            <RotateCcw size={20} /> 重新开始
          </button>
        </div>
      </div>
    );
  }

  // Playing HUD
  return (
    <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
      {/* Top Bar */}
      <div className="flex justify-between items-start">
        <div className="bg-gray-900/80 border border-blue-500/30 p-2 rounded backdrop-blur-md min-w-[120px]">
           <div className="text-xs text-blue-400 font-bold">SCORE</div>
           <div className="text-2xl text-white font-mono font-bold tracking-widest leading-none shadow-black drop-shadow-md">
             {score.toString().padStart(8, '0')}
           </div>
        </div>

        <div className="flex gap-2">
           {Array.from({ length: playerStats.bombs }).map((_, i) => (
             <div key={i} className="bg-red-900/50 border border-red-500 p-1 rounded animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]">
               <Bomb className="text-red-400 w-6 h-6" />
             </div>
           ))}
        </div>
      </div>

      {/* Bottom Bar - Widened for longer health bar */}
      <div className="w-full px-2 mx-auto relative">
          <div className="flex items-end justify-between gap-4 bg-black/40 p-2 rounded-xl backdrop-blur-sm border border-white/5">
            {/* Weapon Status */}
            <div className="flex flex-col items-center bg-gray-900/80 p-2 rounded border border-gray-700 backdrop-blur-md min-w-[80px]">
                <div className={`mb-1 ${getWeaponColor(playerStats.weaponType).split(' ')[0]}`}>
                  {getWeaponIcon(playerStats.weaponType)}
                </div>
                <div className="text-[10px] font-bold text-gray-400">
                  {playerStats.weaponType === WeaponType.VULCAN ? 'VULCAN' : playerStats.weaponType === WeaponType.LASER ? 'LASER' : 'PLASMA'}
                </div>
                <div className="text-xs font-mono text-yellow-400">LV.{playerStats.weaponLevel}</div>
            </div>

            {/* Health Bar - Made taller and flex-grow */}
            <div className="flex-1 pb-1">
                <div className="flex items-center gap-2 mb-1 justify-end">
                    <div className="text-xs text-green-400 font-bold tracking-wider">SHIELD ENERGY</div>
                    <Activity className="w-4 h-4 text-green-400" />
                </div>
                <div className="h-6 bg-gray-800/80 rounded-sm overflow-hidden border border-gray-600 relative shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                    {/* Background Grid in Health Bar */}
                    <div className="absolute inset-0 opacity-20 bg-[linear-gradient(90deg,transparent_0%,transparent_95%,#000_100%)] bg-[size:10px_100%]"></div>
                    
                    <div 
                      className={`h-full transition-all duration-200 ease-out ${playerStats.hp < 30 ? 'bg-red-500 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.6)]' : 'bg-gradient-to-r from-green-700 via-green-500 to-green-400'}`}
                      style={{ width: `${(playerStats.hp / playerStats.maxHp) * 100}%` }}
                    />
                    {/* Shine effect */}
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.1)_0%,transparent_50%,rgba(0,0,0,0.1)_100%)]" />
                </div>
            </div>
          </div>
      </div>
    </div>
  );
};

export default UI;