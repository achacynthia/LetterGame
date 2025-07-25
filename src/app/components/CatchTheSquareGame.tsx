"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import './CatchTheSquareGame.css';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

const API = "/api";

interface LetterObj {
  letter: string;
  color: string;
}

interface Session {
  id?: string;
  player_id?: string;
  current_round: number;
  score: number;
  attempts_remaining: number;
  caught_letters: string[];
  is_completed: boolean;
  final_reward?: string;
}

export default function CatchTheSquareGame() {
  const [gameConfig, setGameConfig] = useState<any>(null);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(5);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [caughtLetters, setCaughtLetters] = useState<string[]>([]);
  const [movingSquares, setMovingSquares] = useState<any[]>([]);
  const [showReward, setShowReward] = useState(false);
  const [finalReward, setFinalReward] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hoveredSquare, setHoveredSquare] = useState<string | null>(null);

  const gameAreaRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

  // Fetch game configuration
  const fetchGameConfig = async () => {
    try {
      const response = await axios.get(`${API}/game/config`);
      setGameConfig(response.data);
    } catch (error) {
      setError('Failed to load game configuration');
    }
  };

  // Create new game session
  const createGameSession = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API}/game/session`, {
        player_id: `player_${Date.now()}`
      });
      setCurrentSession(response.data);
      return response.data;
    } catch (error) {
      setError('Failed to create game session');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Make a move in the game
  const makeMove = async (letter: string, color: string) => {
    if (!currentSession) return;
    try {
      const response = await axios.post(`${API}/game/session/${currentSession.id}/move`, {
        letter_clicked: letter,
        letter_color: color
      });
      const { is_correct, session, round_completed, game_completed } = response.data;
      setCurrentSession(session);
      setCurrentRound(session.current_round);
      setScore(session.score);
      setAttempts(session.attempts_remaining);
      setCaughtLetters([...session.caught_letters]);
      if (is_correct) {
        setMovingSquares(prev => prev.map(s => s.letter === letter && s.color === color && s.isCorrect ? { ...s, caught: true } : s));
        if (round_completed) {
          if (session.current_round === 3 || (session.current_round === 2 && round_completed)) {
            setShowReward(true);
            setTimeout(() => setShowReward(false), 3000);
          }
          if (game_completed) {
            setFinalReward(session.final_reward);
            setGameOver(true);
          } else {
            setTimeout(() => {
              setCaughtLetters([]);
              initializeSquares();
            }, 1000);
          }
        }
      }
      if (game_completed) {
        setFinalReward(session.final_reward);
        setGameOver(true);
      }
    } catch (error) {
      setError('Failed to process move');
    }
  };

  const currentWord = gameConfig?.rounds?.[currentRound];
  const requiredLetters: LetterObj[] = currentWord?.letters || [];

  // Movement patterns
  const getMovementPattern = (round: number, square: any) => {
    const { x, y, dx, dy, angle } = square;
    switch (round) {
      case 0:
        return { x: x + dx, y: y + dy, dx: x + dx > 750 || x + dx < 0 ? -dx : dx, dy: y + dy > 550 || y + dy < 0 ? -dy : dy };
      case 1:
        return { x: x + dx + (Math.random() - 0.5) * 2, y: y + dy + (Math.random() - 0.5) * 2, dx: x + dx > 750 || x + dx < 0 ? -dx + (Math.random() - 0.5) : dx, dy: y + dy > 550 || y + dy < 0 ? -dy + (Math.random() - 0.5) : dy };
      case 2:
        const starRadius = 100 + Math.sin(angle) * 50;
        return { x: 375 + starRadius * Math.cos(angle), y: 275 + starRadius * Math.sin(angle), angle: angle + 0.05 };
      case 3:
        return { x: 375 + 150 * Math.cos(angle), y: 275 + 150 * Math.sin(angle), angle: angle + 0.03 };
      case 4:
        return { x: x + dx, y: 275 + 100 * Math.sin(x * 0.02), dx: x + dx > 750 || x + dx < 0 ? -dx : dx };
      default:
        return square;
    }
  };

  // Initialize squares for current round
  const initializeSquares = useCallback(() => {
    if (!requiredLetters.length) return;
    const centerX = 375;
    const centerY = 275;
    const spread = 80;
    const correctSquares = requiredLetters.map((letterObj, index) => ({
      id: `correct_${index}`,
      letter: letterObj.letter,
      color: letterObj.color,
      x: centerX + (Math.random() - 0.5) * spread,
      y: centerY + (Math.random() - 0.5) * spread,
      dx: (Math.random() - 0.5) * 4,
      dy: (Math.random() - 0.5) * 4,
      angle: Math.random() * Math.PI * 2,
      caught: false,
      isCorrect: true,
      speed: 1
    }));
    const distractorLetters = ['B', 'D', 'F', 'G', 'J', 'K', 'M', 'Q', 'V', 'W', 'X', 'Z'];
    const wordLetters = requiredLetters.map(l => l.letter);
    const availableDistractors = distractorLetters.filter(letter => !wordLetters.includes(letter));
    const distractorColors = ['#FF9999', '#99FF99', '#9999FF', '#FFFF99', '#FF99FF', '#99FFFF'];
    const numDistractors = Math.floor(Math.random() * 3) + 3;
    const distractorSquares = [];
    for (let i = 0; i < numDistractors; i++) {
      const randomLetter = availableDistractors[Math.floor(Math.random() * availableDistractors.length)];
      const randomColor = distractorColors[Math.floor(Math.random() * distractorColors.length)];
      distractorSquares.push({
        id: `distractor_${i}`,
        letter: randomLetter,
        color: randomColor,
        x: centerX + (Math.random() - 0.5) * spread,
        y: centerY + (Math.random() - 0.5) * spread,
        dx: (Math.random() - 0.5) * 4,
        dy: (Math.random() - 0.5) * 4,
        angle: Math.random() * Math.PI * 2,
        caught: false,
        isCorrect: false,
        speed: 1
      });
    }
    const wrongColorSquares = [];
    const wrongColors = distractorColors.filter(color => !requiredLetters.some(req => req.color === color));
    const numWrongColors = Math.min(Math.floor(Math.random() * 2) + 2, requiredLetters.length);
    for (let i = 0; i < numWrongColors; i++) {
      const correctLetter = requiredLetters[i % requiredLetters.length];
      const wrongColor = wrongColors[Math.floor(Math.random() * wrongColors.length)];
      wrongColorSquares.push({
        id: `wrong_color_${i}`,
        letter: correctLetter.letter,
        color: wrongColor,
        x: centerX + (Math.random() - 0.5) * spread,
        y: centerY + (Math.random() - 0.5) * spread,
        dx: (Math.random() - 0.5) * 4,
        dy: (Math.random() - 0.5) * 4,
        angle: Math.random() * Math.PI * 2,
        caught: false,
        isCorrect: false,
        speed: 1
      });
    }
    const allSquares = [...correctSquares, ...distractorSquares, ...wrongColorSquares];
    const shuffledSquares = allSquares.sort(() => Math.random() - 0.5);
    setMovingSquares(shuffledSquares);
  }, [requiredLetters]);

  // Animation loop
  const animate = useCallback(() => {
    setMovingSquares(prevSquares => prevSquares.map(square => {
      if (square.caught) return square;
      if (hoveredSquare === square.id) return square;
      const newPosition = getMovementPattern(currentRound, square);
      return { ...square, ...newPosition };
    }));
    animationRef.current = window.requestAnimationFrame(animate);
  }, [currentRound, hoveredSquare]);

  // Handle square click
  const handleSquareClick = (square: any) => {
    if (square.isCorrect) {
      const expectedLetter = requiredLetters[caughtLetters.length];
      if (square.letter === expectedLetter.letter && square.color === expectedLetter.color) {
        makeMove(square.letter, square.color);
        setMovingSquares(prev => prev.map(s => s.id === square.id ? { ...s, caught: true } : s));
      } else {
        makeMove(square.letter, square.color);
      }
    } else {
      makeMove(square.letter, square.color);
    }
  };

  // Start game
  const startGame = async () => {
    const session = await createGameSession();
    if (session) {
      setGameStarted(true);
      setCurrentRound(0);
      setScore(0);
      setAttempts(5);
      setCaughtLetters([]);
      setGameOver(false);
      setFinalReward('');
      setError('');
    }
  };

  useEffect(() => {
    if (gameStarted && !gameOver && gameConfig) {
      initializeSquares();
    }
  }, [currentRound, gameStarted, gameOver, initializeSquares, gameConfig]);

  useEffect(() => {
    if (gameStarted && !gameOver) {
      animationRef.current = window.requestAnimationFrame(animate);
    }
    return () => {
      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameStarted, gameOver, animate]);

  useEffect(() => {
    fetchGameConfig();
  }, []);

  if (loading) {
    return (
      <div className="game-container">
        <Card className="game-welcome">
          <div className="welcome-content">
            <h2>Loading...</h2>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="game-container">
        <Card className="game-welcome">
          <div className="welcome-content">
            <h2>Error</h2>
            <p>{error}</p>
            <Button onClick={() => window.location.reload()}>Reload</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!gameConfig) {
    return (
      <div className="game-container">
        <Card className="game-welcome">
          <div className="welcome-content">
            <h2>Loading game...</h2>
          </div>
        </Card>
      </div>
    );
  }

  if (!gameStarted) {
    return (
      <div className="game-container">
        <Card className="game-welcome">
          <div className="welcome-content">
            <h1 className="game-title">🎯 Catch the Square</h1>
            <p className="game-description">
              Catch the moving squares in the correct order to spell words!
              Match both the letter and color. You have 5 attempts total.
            </p>
            <div className="rewards-info">
              <div className="reward-item">🏆 100% Score = Goal Box</div>
              <div className="reward-item">💰 70-99% Score = Dollar Box</div>
              <div className="reward-item">🪙 50-69% Score = Coin Box</div>
              <div className="reward-item">❌ Below 50% = Try Again</div>
            </div>
            <Button onClick={startGame} className="start-button" disabled={loading}>
              {loading ? 'Starting...' : 'Start Game'}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className="game-container">
        <Card className="game-over">
          <div className="game-over-content">
            <h2 className="final-reward">{finalReward}</h2>
            <div className="final-stats">
              <p>Final Score: {score}</p>
              <p>Rounds Completed: {currentRound + (caughtLetters.length === requiredLetters.length ? 1 : 0)}/5</p>
            </div>
            <Button onClick={startGame} className="restart-button" disabled={loading}>
              {loading ? 'Starting...' : 'Play Again'}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="game-container">
      <div className="game-header">
        <div className="game-stats">
          <Badge variant="secondary">Round: {currentRound + 1}/5</Badge>
          <Badge variant="secondary">Score: {score}</Badge>
          <Badge variant={attempts <= 2 ? "destructive" : "secondary"}>
            Attempts: {attempts}
          </Badge>
        </div>
        <div className="word-progress">
          <h3>Spell: {currentWord?.word}</h3>
          <div className="letters-needed">
            {requiredLetters.map((letterObj, index) => (
              <div 
                key={index}
                className={`letter-box ${index < caughtLetters.length ? 'caught' : ''}`}
                style={{ backgroundColor: letterObj.color }}
              >
                {letterObj.letter}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="game-area" ref={gameAreaRef}>
        {movingSquares.map(square => (
          !square.caught && (
            <div
              key={square.id}
              className={`moving-square ${square.isCorrect ? 'correct-square' : 'distractor-square'} ${hoveredSquare === square.id ? 'paused' : ''}`}
              style={{
                left: `${square.x}px`,
                top: `${square.y}px`,
                backgroundColor: square.color
              }}
              onClick={() => handleSquareClick(square)}
              onMouseEnter={(e) => {
                e.stopPropagation();
                if (hoveredSquare !== square.id) setHoveredSquare(square.id);
              }}
              onMouseLeave={(e) => {
                e.stopPropagation();
                if (hoveredSquare === square.id) setHoveredSquare(null);
              }}
            >
              {square.letter}
            </div>
          )
        ))}
      </div>
      {showReward && (
        <div className="reward-popup">
          <div className="reward-content">
            <h3>🎉 Round 3 Complete!</h3>
            <p>Attempts Remaining: {attempts}</p>
            <p>Keep Going!</p>
          </div>
        </div>
      )}
    </div>
  );
}
