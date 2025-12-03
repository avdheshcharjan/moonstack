'use client';

import { useEffect, useState } from 'react';
import styles from '../beta-home.module.css';

const TASKS = [
  { task: 'Share with friends', reward: 3000, icon: '🚀', delay: 0 },
  { task: 'Follow @stellarcosmos', reward: 100, icon: '👤', delay: 0.1 },
  { task: 'Like the moonlight post', reward: 100, icon: '❤️', delay: 0.2 },
  { task: 'Comment on stellar cast', reward: 100, icon: '💬', delay: 0.3 },
  { task: 'Share the night sky', reward: 100, icon: '🌙', delay: 0.4 },
  { task: 'Follow on X', reward: 100, icon: '✖️', delay: 0.5 },
  { task: 'Like this celestial post', reward: 100, icon: '⭐', delay: 0.6 },
  { task: 'Comment under the stars', reward: 100, icon: '💫', delay: 0.7 },
  { task: 'Repost the constellation', reward: 100, icon: '🔄', delay: 0.8 },
  { task: 'Refer stargazers', reward: 100, icon: '👥', delay: 0.9 },
] as const;

const maxStars = 10000;

export default function BetaHome() {
  const [stars, setStars] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const playSound = (frequency: number, duration: number) => {
    if (typeof window === 'undefined') return;

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'square';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  };

  const handleTaskClick = (reward: number) => {
    playSound(800, 0.1);
    setTimeout(() => playSound(1000, 0.1), 100);
    setStars((prev) => Math.min(prev + reward, maxStars));
  };

  const progressPercentage = (stars / maxStars) * 100;

  return (
    <main className={`min-h-screen w-full relative overflow-hidden scan-lines ${styles.page}`}>
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-black" />

        <div className="absolute top-1/4 right-[10%] w-56 h-56 animate-float opacity-80 hover:opacity-100 transition-opacity drop-shadow-[0_0_30px_rgba(0,255,255,0.4)]">
          <div className="relative w-full h-full scale-125" style={{ imageRendering: 'pixelated' }}>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="relative">
                <div className="relative">
                  <div className="w-3 h-3 bg-red-600 mx-auto" />
                  <div className="w-5 h-3 bg-red-500 mx-auto" />
                  <div className="w-7 h-3 bg-red-400 mx-auto" />
                </div>

                <div className="relative">
                  <div className="w-16 h-28 bg-gradient-to-b from-gray-200 to-gray-300 mx-auto border-4 border-gray-400 shadow-lg">
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-12 bg-cyan-300 rounded-full border-4 border-gray-100 shadow-inner">
                      <div className="absolute -left-2 top-2 w-4 h-6 bg-orange-700 rounded-full" />
                      <div className="absolute -right-2 top-2 w-4 h-6 bg-orange-700 rounded-full" />
                      <div className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-8 bg-orange-600 rounded-full" />
                      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-6 h-5 bg-white rounded-full" />
                      <div className="absolute top-7 left-1/2 -translate-x-1/2 w-2 h-2 bg-black rounded-sm" />
                      <div className="absolute top-3 left-3 w-1.5 h-1.5 bg-black rounded-full" />
                      <div className="absolute top-3 right-3 w-1.5 h-1.5 bg-black rounded-full" />
                    </div>
                    <div className="absolute top-16 left-0 right-0 h-2 bg-red-500" />
                    <div className="absolute top-20 left-0 right-0 h-2 bg-red-500" />
                  </div>

                  <div
                    className="absolute bottom-0 -left-4 w-6 h-12 bg-red-500 border-2 border-red-600"
                    style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
                  />
                  <div
                    className="absolute bottom-0 -right-4 w-6 h-12 bg-red-500 border-2 border-red-600"
                    style={{ clipPath: 'polygon(0 0, 0 100%, 100% 100%)' }}
                  />
                </div>

                <div className="relative -mt-1">
                  <div className="absolute left-1 w-5 h-10 bg-orange-500 border-2 border-orange-600" />
                  <div className="absolute right-1 w-5 h-10 bg-orange-500 border-2 border-orange-600" />
                  <div className="absolute left-2 top-6 w-4 h-8 bg-yellow-400 animate-pulse" />
                  <div
                    className="absolute right-2 top-6 w-4 h-8 bg-yellow-400 animate-pulse"
                    style={{ animationDelay: '0.2s' }}
                  />
                  <div
                    className="absolute left-2.5 top-10 w-3 h-6 bg-yellow-200 animate-pulse"
                    style={{ animationDelay: '0.1s' }}
                  />
                  <div
                    className="absolute right-2.5 top-10 w-3 h-6 bg-yellow-200 animate-pulse"
                    style={{ animationDelay: '0.3s' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {mounted && (
          <div className="stars-container">
            {Array.from({ length: 100 }).map((_, i) => (
              <div
                key={i}
                className="absolute bg-white"
                style={{
                  width: Math.random() > 0.5 ? '2px' : '1px',
                  height: Math.random() > 0.5 ? '2px' : '1px',
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animation: `pixel-rain ${5 + Math.random() * 10}s linear infinite`,
                  animationDelay: `${Math.random() * 5}s`,
                  opacity: Math.random() * 0.8 + 0.2,
                  boxShadow: `0 0 ${Math.random() * 3}px rgba(255,255,255,0.8)`,
                }}
              />
            ))}
          </div>
        )}

        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-pulse color-shift" />
        <div
          className="absolute top-1/3 right-1/4 w-96 h-96 bg-cyan-500 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-pulse"
          style={{ animationDelay: '1s' }}
        />
        <div
          className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-pink-500 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-pulse"
          style={{ animationDelay: '2s' }}
        />
        <div
          className="absolute top-1/2 right-1/3 w-64 h-64 bg-yellow-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse"
          style={{ animationDelay: '0.5s' }}
        />
      </div>

      <header className="relative z-10 pt-8 pb-4">
        <div className="container mx-auto px-4">
          <h1 className="pixel-font text-4xl md:text-5xl text-center bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 crt-glow drop-shadow-[0_0_10px_rgba(255,0,255,0.8)]">
            STELLAR
          </h1>
          <div className="mt-6 max-w-lg mx-auto">
            <div className="flex justify-between items-center mb-2 px-2">
              <span className="text-cyan-400 text-sm font-bold pixel-font">Stars: {stars.toLocaleString()}</span>
              <span className="text-purple-400 text-sm font-bold pixel-font">Goal: {maxStars.toLocaleString()}</span>
            </div>
            <div className="relative h-8 bg-gray-900/80 rounded-lg border-4 border-purple-500/50 overflow-hidden backdrop-blur-sm">
              <div
                className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 transition-all duration-500 ease-out"
                style={{
                  width: `${progressPercentage}%`,
                  boxShadow: '0 0 20px rgba(168, 85, 247, 0.8)',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white font-bold text-sm drop-shadow-[0_0_5px_rgba(0,0,0,0.8)] pixel-font">
                  {progressPercentage.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 container mx-auto px-4 py-8 md:py-16 flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="w-full max-w-lg">
          <div className="relative animate-float">
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-pink-500 via-purple-500 via-cyan-500 to-pink-500 blur-md opacity-75 animate-rotate-gradient" />
            <div className="relative bg-black/90 backdrop-blur-xl rounded-3xl p-6 md:p-8 border-4 border-purple-500/50 shadow-2xl shadow-purple-500/50">
              <div className="text-center mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 pixel-font drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                  Claim Your Stars
                </h2>
                <p className="text-cyan-400 text-sm font-semibold animate-pulse">Stars + beta access</p>
              </div>

              <button
                onClick={() => handleTaskClick(2000)}
                className="w-full mb-4 group relative overflow-hidden rounded-2xl border-4 border-pink-500 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 p-4 transition-all hover:scale-105 hover:border-cyan-500 active:scale-95 shadow-lg shadow-pink-500/50 hover:shadow-cyan-500/50 hover:shadow-xl"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
                <div className="relative flex items-center justify-between">
                  <div className="text-left">
                    <div className="font-bold text-white text-lg md:text-xl flex items-center gap-2">
                      <span className="text-2xl animate-bounce">⭐</span>
                      <span className="drop-shadow-lg">Moon</span>
                    </div>
                  </div>
                  <div className="px-4 py-2 bg-yellow-400/30 border-2 border-yellow-400 rounded-xl shadow-lg shadow-yellow-500/30">
                    <span className="text-2xl font-black text-yellow-300 drop-shadow-[0_0_8px_rgba(255,255,0,0.8)]">+2000</span>
                    <span className="ml-2 text-sm font-bold text-yellow-400">Moon</span>
                  </div>
                </div>
              </button>

              <div className="mb-4">
                <h3 className="text-lg font-bold text-center text-purple-300 pixel-font drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]">
                  Earn More Stars
                </h3>
              </div>

              <div className="space-y-2">
                {TASKS.map((item) => (
                  <button
                    key={item.task}
                    onClick={() => handleTaskClick(item.reward)}
                    className="w-full flex items-center justify-between rounded-xl bg-gradient-to-r from-gray-800/90 to-gray-700/90 border-2 border-gray-600 px-4 py-3 transition-all hover:border-purple-500 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/30 active:scale-98 group"
                    style={{ animationDelay: `${item.delay}s` }}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-xl flex-shrink-0 group-hover:scale-125 transition-transform">{item.icon}</span>
                      <span className="text-white text-sm md:text-base font-semibold truncate group-hover:text-cyan-300 transition-colors drop-shadow-md">
                        {item.task}
                      </span>
                    </div>
                    <div className="px-3 py-1.5 bg-yellow-400/20 border-2 border-yellow-400/50 rounded-lg flex-shrink-0 ml-2 group-hover:bg-yellow-400/30 group-hover:border-yellow-400 transition-all">
                      <span className="text-yellow-300 font-bold text-sm drop-shadow-[0_0_5px_rgba(255,255,0,0.5)]">+{item.reward}</span>
                      <span className="ml-1 text-yellow-400/80 text-xs font-semibold">Moon</span>
                    </div>
                  </button>
                ))}
              </div>

              <p className="mt-6 text-center text-xs md:text-sm text-gray-400 px-2 animate-pulse">
                Start your stellar journey today
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

