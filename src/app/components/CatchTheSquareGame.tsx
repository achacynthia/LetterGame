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
  config?: {
    rounds: { word: string; letters: LetterObj[] }[];
    max_attempts: number;
  };
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
  const [showConfetti, setShowConfetti] = useState(false);

  const gameAreaRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastMoveTimeRef = useRef<number>(0);

  // Sound effects using Web Audio API
  const playSound = useCallback((frequency: number, duration: number, type: 'sine' | 'square' | 'sawtooth' = 'sine', volume: number = 0.3) => {
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
  }, []);

  // Sound effect functions
  const playBoxClickSound = useCallback(() => {
    playSound(800, 0.1, 'square', 0.2);
  }, [playSound]);

  const playCorrectMoveSound = useCallback(() => {
    // Success chord
    playSound(523, 0.15, 'sine', 0.3); // C
    setTimeout(() => playSound(659, 0.15, 'sine', 0.3), 50); // E
    setTimeout(() => playSound(784, 0.2, 'sine', 0.3), 100); // G
  }, [playSound]);

  const playWrongMoveSound = useCallback(() => {
    playSound(200, 0.3, 'sawtooth', 0.2);
  }, [playSound]);

  const playRoundCompleteSound = useCallback(() => {
    // Ascending notes
    playSound(523, 0.2, 'sine', 0.3); // C
    setTimeout(() => playSound(659, 0.2, 'sine', 0.3), 100); // E
    setTimeout(() => playSound(784, 0.2, 'sine', 0.3), 200); // G
    setTimeout(() => playSound(1047, 0.3, 'sine', 0.3), 300); // C high
  }, [playSound]);

  const playGameOverSound = useCallback(() => {
    // Descending sad notes
    playSound(400, 0.3, 'sine', 0.3);
    setTimeout(() => playSound(350, 0.3, 'sine', 0.3), 200);
    setTimeout(() => playSound(300, 0.4, 'sine', 0.3), 400);
  }, [playSound]);

  const playGameWonSound = useCallback(() => {
    // Victory fanfare
    playSound(523, 0.2, 'sine', 0.3); // C
    setTimeout(() => playSound(659, 0.2, 'sine', 0.3), 100); // E
    setTimeout(() => playSound(784, 0.2, 'sine', 0.3), 200); // G
    setTimeout(() => playSound(1047, 0.3, 'sine', 0.3), 300); // C high
    setTimeout(() => playSound(1319, 0.4, 'sine', 0.3), 500); // E high
  }, [playSound]);

  // Confetti effect
  const triggerConfetti = useCallback(() => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  }, []);

  // Fetch game configuration for a specific session
  const fetchGameConfig = async (sessionId: string) => {
    try {
      const response = await axios.get(`${API}/game/config?session_id=${sessionId}`);
      setGameConfig(response.data);
      console.log('Game config loaded for session:', sessionId, response.data);
      return response.data;
    } catch (error) {
      setError('Failed to load game configuration');
      return null;
    }
  };

  // Create new game session and fetch its config
  const createGameSession = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API}/game/session`, {
        player_id: `player_${Date.now()}`
      });
      const session = response.data;
      setCurrentSession(session);
      
      // Set the game config from the session
      setGameConfig(session.config);
      console.log('Session created with config:', session.config);
      
      return session;
    } catch (error) {
      setError('Failed to create game session');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Make a move in the game
  const makeMove = async (letter: string, color: string) => {
    console.log('Making move:', {letter, color, currentSession });
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
        playCorrectMoveSound();
        setMovingSquares(prev => prev.map(s => s.letter === letter && s.color === color && s.isCorrect ? { ...s, caught: true } : s));
        if (round_completed) {
          playRoundCompleteSound();
          if (session.current_round === 3 || (session.current_round === 2 && round_completed)) {
            setShowReward(true);
            setTimeout(() => setShowReward(false), 3000);
          }
          if (game_completed) {
            playGameWonSound();
            triggerConfetti();
            setFinalReward(session.final_reward);
            setGameOver(true);
          } else {
            setTimeout(() => {
              setCaughtLetters([]);
            }, 1000);
          }
        }
      } else {
        playWrongMoveSound();
      }
      
      if (game_completed) {
        if (session.final_reward && session.final_reward !== '❌ Below 50% = Try Again') {
          playGameWonSound();
          triggerConfetti();
        } else {
          playGameOverSound();
        }
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
    const boundaries = { left: 0, right: 750, top: 120, bottom: 550 };
    
    switch (round) {
      case 0:
        // Simple bounce with better spacing
        let newX = x + dx * 1.5;
        let newY = y + dy * 1.5;
        let newDx = dx;
        let newDy = dy;
        
        if (newX > boundaries.right - 40 || newX < boundaries.left + 40) newDx = -dx;
        if (newY > boundaries.bottom - 40 || newY < boundaries.top + 40) newDy = -dy;
        
        return { x: newX, y: newY, dx: newDx, dy: newDy };
        
      case 1:
        // Erratic movement with collision avoidance
        const randomOffsetX = (Math.random() - 0.5) * 3;
        const randomOffsetY = (Math.random() - 0.5) * 3;
        let erraticX = x + dx * 1.2 + randomOffsetX;
        let erraticY = y + dy * 1.2 + randomOffsetY;
        let erraticDx = dx;
        let erraticDy = dy;
        
        if (erraticX > boundaries.right - 50 || erraticX < boundaries.left + 50) {
          erraticDx = -dx + (Math.random() - 0.5) * 2;
        }
        if (erraticY > boundaries.bottom - 50 || erraticY < boundaries.top + 50) {
          erraticDy = -dy + (Math.random() - 0.5) * 2;
        }
        
        return { x: erraticX, y: erraticY, dx: erraticDx, dy: erraticDy };
        
      case 2:
        // Star pattern with varying radii to prevent clustering
        const baseRadius = 120 + (Math.sin(angle * 2) * 40);
        const starAngle = angle + 0.04;
        const starX = 375 + baseRadius * Math.cos(starAngle);
        const starY = 275 + baseRadius * Math.sin(starAngle);
        
        return { x: starX, y: starY, angle: starAngle };
        
      case 3:
        // Circular with different orbit sizes
        const orbitRadius = 100 + (square.id.charCodeAt(square.id.length - 1) % 5) * 20;
        const circleAngle = angle + 0.025;
        const circleX = 375 + orbitRadius * Math.cos(circleAngle);
        const circleY = 275 + orbitRadius * Math.sin(circleAngle);
        
        return { x: circleX, y: circleY, angle: circleAngle };
        
      case 4:
        // Wave pattern with different amplitudes and phases
        const wavePhase = (square.id.charCodeAt(square.id.length - 1) % 4) * Math.PI / 2;
        let waveX = x + dx * 1.3;
        const waveAmplitude = 80 + (square.id.charCodeAt(square.id.length - 1) % 3) * 30;
        const waveY = 275 + waveAmplitude * Math.sin((waveX * 0.015) + wavePhase);
        let waveDx = dx;
        
        if (waveX > boundaries.right - 40 || waveX < boundaries.left + 40) waveDx = -dx;
        
        return { x: waveX, y: waveY, dx: waveDx };
        
      default:
        return square;
    }
  };

  // Initialize squares for current round
  const initializeSquares = useCallback(() => {
    if (!requiredLetters.length) return;
    // Adjust spawn area to avoid score panel (top 100px)
    const spawnTop = 120; // leave space for header
    const spawnHeight = 430; // 550 - 120
    const spawnLeft = 0;
    const spawnWidth = 750;
    const centerX = 375;
    const centerY = 275;
    const spread = 150; // Increased spread to reduce clustering
    
    // Create a grid-like initial positioning to avoid clustering
    const gridSize = Math.ceil(Math.sqrt(requiredLetters.length + 8)); // +8 for distractors
    const cellWidth = spawnWidth / gridSize;
    const cellHeight = spawnHeight / gridSize;
    
    const correctSquares = requiredLetters.map((letterObj, index) => {
      const gridX = (index % gridSize) * cellWidth + cellWidth / 2;
      const gridY = Math.floor(index / gridSize) * cellHeight + cellHeight / 2 + spawnTop;
      
      return {
        id: `correct_${index}`,
        letter: letterObj.letter,
        color: letterObj.color,
        x: gridX + (Math.random() - 0.5) * 60, // Small random offset
        y: gridY + (Math.random() - 0.5) * 60,
        dx: (Math.random() - 0.5) * 5, // Increased speed variety
        dy: (Math.random() - 0.5) * 5,
        angle: Math.random() * Math.PI * 2,
        caught: false,
        isCorrect: true,
        speed: 1 + Math.random() * 0.5 // Speed variation
      };
    });
    
    const distractorLetters = ['B', 'D', 'F', 'G', 'J', 'K', 'M', 'Q', 'V', 'W', 'X', 'Z'];
    const wordLetters = requiredLetters.map(l => l.letter);
    const availableDistractors = distractorLetters.filter(letter => !wordLetters.includes(letter));
    const distractorColors = ['#FF9999', '#99FF99', '#9999FF', '#FFFF99', '#FF99FF', '#99FFFF'];
    const numDistractors = Math.floor(Math.random() * 3) + 3;
    const distractorSquares = [];
    
    for (let i = 0; i < numDistractors; i++) {
      const randomLetter = availableDistractors[Math.floor(Math.random() * availableDistractors.length)];
      const randomColor = distractorColors[Math.floor(Math.random() * distractorColors.length)];
      const gridIndex = requiredLetters.length + i;
      const gridX = (gridIndex % gridSize) * cellWidth + cellWidth / 2;
      const gridY = Math.floor(gridIndex / gridSize) * cellHeight + cellHeight / 2 + spawnTop;
      
      distractorSquares.push({
        id: `distractor_${i}`,
        letter: randomLetter,
        color: randomColor,
        x: gridX + (Math.random() - 0.5) * 60,
        y: gridY + (Math.random() - 0.5) * 60,
        dx: (Math.random() - 0.5) * 5,
        dy: (Math.random() - 0.5) * 5,
        angle: Math.random() * Math.PI * 2,
        caught: false,
        isCorrect: false,
        speed: 1 + Math.random() * 0.5
      });
    }
    
    const wrongColorSquares = [];
    const wrongColors = distractorColors.filter(color => !requiredLetters.some(req => req.color === color));
    const numWrongColors = Math.min(Math.floor(Math.random() * 2) + 2, requiredLetters.length);
    
    for (let i = 0; i < numWrongColors; i++) {
      const correctLetter = requiredLetters[i % requiredLetters.length];
      const wrongColor = wrongColors[Math.floor(Math.random() * wrongColors.length)];
      const gridIndex = requiredLetters.length + numDistractors + i;
      const gridX = (gridIndex % gridSize) * cellWidth + cellWidth / 2;
      const gridY = Math.floor(gridIndex / gridSize) * cellHeight + cellHeight / 2 + spawnTop;
      
      wrongColorSquares.push({
        id: `wrong_color_${i}`,
        letter: correctLetter.letter,
        color: wrongColor,
        x: gridX + (Math.random() - 0.5) * 60,
        y: gridY + (Math.random() - 0.5) * 60,
        dx: (Math.random() - 0.5) * 5,
        dy: (Math.random() - 0.5) * 5,
        angle: Math.random() * Math.PI * 2,
        caught: false,
        isCorrect: false,
        speed: 1 + Math.random() * 0.5
      });
    }
    
    // Combine all squares and shuffle
    const shuffledSquares = [...distractorSquares, ...correctSquares, ...wrongColorSquares].sort(() => Math.random() - 0.5);
    console.log('Initialized squares:', shuffledSquares);
    setMovingSquares(shuffledSquares);
  }, [requiredLetters]);

  // Animation loop
  const animate = useCallback(() => {
    const currentTime = Date.now();
    const timeDiff = currentTime - lastMoveTimeRef.current;

    // Only move squares if 100ms have passed since last movement
    if (timeDiff >= 50) {
      setMovingSquares(prevSquares => prevSquares.map(square => {
        if (square.caught) return square;
        // Only pause the hovered square, not all
        if (hoveredSquare && hoveredSquare === square.id) return square;
        const newPosition = getMovementPattern(currentRound, square);
        return { ...square, ...newPosition };
      }));
      lastMoveTimeRef.current = currentTime;
    }
    
    animationRef.current = window.requestAnimationFrame(animate);
  }, [currentRound, hoveredSquare]);

  // Handle square click
  const handleSquareClick = (square: any) => {
    playBoxClickSound();
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
      console.log('Starting game, initializing squares for round:', currentRound);
      initializeSquares();
    }
  }, [currentRound, gameStarted, gameOver, initializeSquares, gameConfig]);

  useEffect(() => {
    if (gameStarted && !gameOver) {
      lastMoveTimeRef.current = Date.now(); // Initialize the timer
      animationRef.current = window.requestAnimationFrame(animate);
    }
    return () => {
      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameStarted, gameOver, animate]);

  // Remove the initial config fetch since we now get config when creating a session
  // useEffect(() => {
  //   fetchGameConfig();
  // }, []);

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

  // If game is started but config not loaded yet, show loading
  if (gameStarted && !gameConfig) {
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

  return (
    <div className="game-container">
      {showConfetti && (
        <div className="confetti-container">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="confetti-piece"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                backgroundColor: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'][Math.floor(Math.random() * 6)]
              }}
            />
          ))}
        </div>
      )}
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
