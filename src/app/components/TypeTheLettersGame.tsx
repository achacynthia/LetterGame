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
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [showStats, setShowStats] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [trayAnim, setTrayAnim] = useState<{ [key: number]: string }>({});

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
        setTyped(typed + e.key);
        setTrayAnim({ ...trayAnim, [typed.length]: "fall" });
        setScore(score + 1);
        if (typed.length + 1 === word.length) {
          setTimeout(() => {
            setCorrectWords(correctWords + 1);
            setActiveWordIdx(activeWordIdx + 1);
            setTyped("");
            setTrayAnim({});
            if (activeWordIdx + 1 === trayWords.length) {
              setEndTime(Date.now());
              setShowStats(true);
            }
          }, 400);
        }
      } else {
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
    setStartTime(null);
    setEndTime(null);
    setShowStats(false);
    setTrayAnim({});
  };

  const typingSpeed = startTime && endTime ? ((score / ((endTime - startTime) / 1000))).toFixed(2) : "-";

  return (
    <div className="type-game-container">
      <Card className="type-game-card">
        <h2 className="type-game-title">Type The Letters</h2>
        {!showStats ? (
          <>
            <div className="tray">
              {trayWords.map((word, idx) => (
                <div
                  key={idx}
                  className={`tray-word ${idx === activeWordIdx ? "active" : ""}`}
                >
                  {word.split("").map((char, i) => (
                    <span
                      key={i}
                      className={`tray-letter ${idx === activeWordIdx && i < typed.length ? trayAnim[i] : ""}`}
                      style={{
                        transition: "transform 0.3s",
                        transform:
                          idx === activeWordIdx && i < typed.length
                            ? trayAnim[i] === "fall"
                              ? "translateY(40px) scale(0.7)"
                              : trayAnim[i] === "jump"
                              ? "translateY(-20px) scale(1.2)"
                              : "none"
                            : "none",
                        color: idx === activeWordIdx && i < typed.length && trayAnim[i] === "jump" ? "#e53e3e" : "inherit"
                      }}
                    >
                      {char}
                    </span>
                  ))}
                </div>
              ))}
            </div>
            <input
              ref={inputRef}
              className="type-input"
              value={typed}
              onKeyDown={handleKeyDown}
              onChange={() => {}}
              maxLength={trayWords[activeWordIdx]?.length || 0}
              disabled={showStats}
              style={{ opacity: 0, position: "absolute", pointerEvents: "none" }}
            />
            <div className="type-game-stats">
              <Badge variant="secondary">Score: {score}</Badge>
              <Badge variant="secondary">Correct Words: {correctWords}</Badge>
            </div>
          </>
        ) : (
          <div className="type-game-results">
            <h3>Round Complete!</h3>
            <p>Typing Speed: <b>{typingSpeed}</b> letters/sec</p>
            <p>Correct Words: <b>{correctWords}</b></p>
            <Button onClick={handleRestart}>Play Again</Button>
          </div>
        )}
      </Card>
      <style jsx>{`
        .type-game-container { display: flex; justify-content: center; align-items: center; min-height: 80vh; }
        .type-game-card { width: 420px; padding: 2rem; }
        .type-game-title { text-align: center; font-size: 2rem; margin-bottom: 1rem; }
        .tray { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 2rem; }
        .tray-word { font-size: 1.5rem; letter-spacing: 0.1em; display: flex; gap: 0.3em; }
        .tray-word.active { font-weight: bold; }
        .tray-letter { display: inline-block; min-width: 1.2em; text-align: center; }
        .type-input { font-size: 1.5rem; margin-top: 1rem; }
        .type-game-stats { display: flex; gap: 1rem; justify-content: center; margin-top: 1rem; }
        .type-game-results { text-align: center; margin-top: 2rem; }
      `}</style>
    </div>
  );
}
