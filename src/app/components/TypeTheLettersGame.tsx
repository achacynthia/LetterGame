"use client";
import React, { useState, useEffect, useRef } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

const WORDS = ["apple", "banana", "grape", "orange", "peach", "melon", "lemon", "berry", "plum", "mango"];

function getRandomWords(n: number) {
  const shuffled = [...WORDS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

export default function TypeTheLettersGame() {
  const [trayWords, setTrayWords] = useState<string[]>(getRandomWords(5));
  const [activeWordIdx, setActiveWordIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [score, setScore] = useState(0);
  const [correctWords, setCorrectWords] = useState(0);
  const [completedWords, setCompletedWords] = useState<string[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [trayAnim, setTrayAnim] = useState<{ [key: number]: string }>({});

  // Sound effects using Web Audio API
  const playSound = (frequency: number, duration: number, type: 'sine' | 'square' | 'sawtooth' = 'sine', volume: number = 0.3) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = type;
      gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    } catch (error) {
      console.log('Audio not supported');
    }
  };

  // Sound effect functions
  const playCorrectTypeSound = () => {
    playSound(600, 0.1, 'sine', 0.2);
  };

  const playWrongTypeSound = () => {
    playSound(200, 0.2, 'sawtooth', 0.15);
  };

  const playWordCompleteSound = () => {
    // Quick ascending notes
    playSound(523, 0.1, 'sine', 0.3); // C
    setTimeout(() => playSound(659, 0.1, 'sine', 0.3), 50); // E
    setTimeout(() => playSound(784, 0.15, 'sine', 0.3), 100); // G
  };

  const playGameCompleteSound = () => {
    // Victory fanfare
    playSound(523, 0.2, 'sine', 0.3); // C
    setTimeout(() => playSound(659, 0.2, 'sine', 0.3), 100); // E
    setTimeout(() => playSound(784, 0.2, 'sine', 0.3), 200); // G
    setTimeout(() => playSound(1047, 0.3, 'sine', 0.3), 300); // C high
    setTimeout(() => playSound(1319, 0.4, 'sine', 0.3), 500); // E high
  };

  // Confetti effect
  const triggerConfetti = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [activeWordIdx, showStats]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showStats) return;
    if (!startTime) setStartTime(Date.now());
    const word = trayWords[activeWordIdx];
    if (!word) return;
    const nextChar = word[typed.length];
    if (e.key.length === 1) {
      if (e.key === nextChar) {
        playCorrectTypeSound();
        setTyped(typed + e.key);
        setTrayAnim({ ...trayAnim, [typed.length]: "fall" });
        setScore(score + 1);
        if (typed.length + 1 === word.length) {
          playWordCompleteSound();
          setTimeout(() => {
            setCompletedWords(prev => [...prev, word]);
            setCorrectWords(correctWords + 1);
            setActiveWordIdx(activeWordIdx + 1);
            setTyped("");
            setTrayAnim({});
            if (activeWordIdx + 1 === trayWords.length) {
              playGameCompleteSound();
              triggerConfetti();
              setEndTime(Date.now());
              setShowStats(true);
            }
          }, 400);
        }
      } else {
        playWrongTypeSound();
        setTrayAnim({ ...trayAnim, [typed.length]: "jump" });
      }
    }
  };

  const handleRestart = () => {
    setTrayWords(getRandomWords(5));
    setActiveWordIdx(0);
    setTyped("");
    setScore(0);
    setCorrectWords(0);
    setCompletedWords([]);
    setStartTime(null);
    setEndTime(null);
    setShowStats(false);
    setShowConfetti(false);
    setTrayAnim({});
  };

  const typingSpeed = startTime && endTime ? ((score / ((endTime - startTime) / 1000))).toFixed(2) : "-";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6 relative">
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2.5 h-2.5 animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                backgroundColor: ['#ef4444', '#06b6d4', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][Math.floor(Math.random() * 6)],
                animation: `confetti-fall 3s linear infinite`
              }}
            />
          ))}
        </div>
      )}
      <Card className="w-full max-w-2xl bg-white/80 backdrop-blur-sm border-0 shadow-xl">
        <div className="p-8">
          <h2 className="text-3xl font-light text-center text-slate-800 mb-8 tracking-wide">Type The Letters</h2>
          {!showStats ? (
            <div className="space-y-6">
              {/* Task Area - Initial words to type */}
              <div className="bg-slate-50/50 rounded-xl p-6 border border-slate-200/50">
                <h3 className="text-sm font-medium text-slate-600 text-center mb-4 uppercase tracking-wider">Queue</h3>
                <div className="flex flex-wrap gap-2 justify-center">
                  {trayWords.map((word, idx) => (
                    <div
                      key={idx}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                        idx < activeWordIdx 
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                          : idx === activeWordIdx 
                          ? 'bg-blue-500 text-white shadow-lg scale-105 border border-blue-500' 
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {word}
                    </div>
                  ))}
                </div>
              </div>

              {/* Working Area - Current active word */}
              <div className="bg-blue-50/30 rounded-xl p-8 border border-blue-100">
                <h3 className="text-sm font-medium text-blue-600 text-center mb-6 uppercase tracking-wider">Active</h3>
                {trayWords[activeWordIdx] && (
                  <div className="flex justify-center gap-1">
                    {trayWords[activeWordIdx].split("").map((char, i) => (
                      <span
                        key={i}
                        className={`inline-flex items-center justify-center w-14 h-14 text-3xl font-light rounded-lg transition-all duration-300 ${
                          i < typed.length 
                            ? (trayAnim[i] === "jump" ? 'bg-red-100 text-red-600 border-2 border-red-200' : 'bg-emerald-100 text-emerald-700 border-2 border-emerald-200')
                            : 'bg-slate-100 text-slate-400 border-2 border-slate-200'
                        }`}
                        style={{
                          transform:
                            i < typed.length
                              ? trayAnim[i] === "fall"
                                ? "translateY(8px) scale(0.95)"
                                : trayAnim[i] === "jump"
                                ? "translateY(-8px) scale(1.1)"
                                : "none"
                              : "none",
                        }}
                      >
                        {char}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Done Area - Completed words */}
              <div className="bg-emerald-50/30 rounded-xl p-6 border border-emerald-100">
                <h3 className="text-sm font-medium text-emerald-600 text-center mb-4 uppercase tracking-wider">Completed</h3>
                <div className="flex flex-wrap gap-2 justify-center min-h-[3rem]">
                  {completedWords.map((word, idx) => (
                    <div
                      key={idx}
                      className="px-4 py-2 bg-emerald-500 text-white rounded-full text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500"
                    >
                      {word} 
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  ))}
                  {completedWords.length === 0 && (
                    <div className="text-slate-400 text-sm italic w-full text-center py-2">
                      No words completed yet
                    </div>
                  )}
                </div>
              </div>

              <input
                ref={inputRef}
                className="opacity-0 absolute pointer-events-none"
                value={typed}
                onKeyDown={handleKeyDown}
                onChange={() => {}}
                maxLength={trayWords[activeWordIdx]?.length || 0}
                disabled={showStats}
              />
              
              <div className="flex gap-4 justify-center pt-4">
                <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-slate-200">
                  Score: {score}
                </Badge>
                <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-slate-200">
                  Progress: {completedWords.length}/{trayWords.length}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-6">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-light text-slate-800">Round Complete!</h3>
              <div className="space-y-2 text-slate-600">
                <p className="text-lg">
                  Typing Speed: <span className="font-medium text-slate-800">{typingSpeed}</span> letters/sec
                </p>
                <p className="text-lg">
                  Words Completed: <span className="font-medium text-slate-800">{correctWords}</span>
                </p>
              </div>
              <Button 
                onClick={handleRestart}
                className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-xl font-medium transition-colors"
              >
                Play Again
              </Button>
            </div>
          )}
        </div>
      </Card>
      
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
