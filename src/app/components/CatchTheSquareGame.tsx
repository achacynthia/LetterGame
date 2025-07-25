"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import gsap from 'gsap';
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
  const [audioEnabled, setAudioEnabled] = useState(true);

  const gameAreaRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastMoveTimeRef = useRef<number>(0);
  const welcomeCardRef = useRef<HTMLDivElement>(null);
  const gameHeaderRef = useRef<HTMLDivElement>(null);
  const confettiRef = useRef<HTMLDivElement>(null);
  const rewardPopupRef = useRef<HTMLDivElement>(null);
  const backgroundAudioRef = useRef<HTMLAudioElement | null>(null);

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

  // Background audio controls
  const startBackgroundAudio = useCallback(() => {
    if (!audioEnabled) return;
    
    try {
      if (!backgroundAudioRef.current) {
        backgroundAudioRef.current = new Audio('/sound-effects/game-music-loop-1.mp3');
        backgroundAudioRef.current.loop = true;
        backgroundAudioRef.current.volume = 0.3; // Set volume to 30%
      }
      
      const playPromise = backgroundAudioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.log('Background audio autoplay prevented:', error);
        });
      }
    } catch (error) {
      console.log('Background audio not supported:', error);
    }
  }, [audioEnabled]);

  const stopBackgroundAudio = useCallback(() => {
    if (backgroundAudioRef.current) {
      backgroundAudioRef.current.pause();
      backgroundAudioRef.current.currentTime = 0;
    }
  }, []);

  const pauseBackgroundAudio = useCallback(() => {
    if (backgroundAudioRef.current) {
      backgroundAudioRef.current.pause();
    }
  }, []);

  const resumeBackgroundAudio = useCallback(() => {
    if (backgroundAudioRef.current) {
      const playPromise = backgroundAudioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.log('Background audio resume failed:', error);
        });
      }
    }
  }, []);

  // Toggle audio on/off
  const toggleAudio = useCallback(() => {
    setAudioEnabled(prev => {
      const newValue = !prev;
      if (newValue && gameStarted && !gameOver) {
        startBackgroundAudio();
      } else if (!newValue) {
        stopBackgroundAudio();
      }
      return newValue;
    });
  }, [gameStarted, gameOver, startBackgroundAudio, stopBackgroundAudio]);

  // Enhanced confetti effect with GSAP
  const triggerConfetti = useCallback(() => {
    setShowConfetti(true);
    
    // Animate confetti entrance
    if (confettiRef.current) {
      const confettiPieces = confettiRef.current.querySelectorAll('.confetti-piece');
      
      gsap.fromTo(confettiPieces, 
        { 
          y: -100, 
          rotation: 0, 
          scale: 0,
          opacity: 1 
        },
        {
          y: window.innerHeight + 100,
          rotation: 720,
          scale: gsap.utils.random(0.5, 1.5),
          duration: gsap.utils.random(2, 4),
          ease: "power2.out",
          stagger: {
            amount: 1,
            from: "random"
          }
        }
      );
    }
    
    setTimeout(() => setShowConfetti(false), 4000);
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
          console.log('Round completed! Current round:', session.current_round);
          
          // Show reward popup for rounds 2, 3, or 4 (when completing rounds 3, 4, or 5)
          if (session.current_round >= 2 && session.current_round <= 4) {
            console.log('Showing reward popup for round completion');
            setShowReward(true);
            setTimeout(() => setShowReward(false), 3000);
          }
          
          if (game_completed) {
            // Stop background audio when game completes
            stopBackgroundAudio();
            
            if (session.final_reward && session.final_reward !== '❌ Below 50% = Try Again') {
              playGameWonSound();
              triggerConfetti();
            } else {
              playGameOverSound();
            }
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
        // Stop background audio when game completes
        stopBackgroundAudio();
        
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

  // Handle square click with GSAP animation
  const handleSquareClick = (square: any, event: React.MouseEvent) => {
    playBoxClickSound();
    
    // GSAP click animation
    const target = event.currentTarget as HTMLElement;
    gsap.to(target, {
      scale: 1.3,
      duration: 0.1,
      yoyo: true,
      repeat: 1,
      ease: "power2.out"
    });
    
    // Add ripple effect
    gsap.fromTo(target, 
      { 
        boxShadow: `0 0 0 0px ${square.color}80` 
      },
      {
        boxShadow: `0 0 0 20px ${square.color}00`,
        duration: 0.6,
        ease: "power2.out"
      }
    );
    
    if (square.isCorrect) {
      const expectedLetter = requiredLetters[caughtLetters.length];
      if (square.letter === expectedLetter.letter && square.color === expectedLetter.color) {
        // Correct click - animate success
        gsap.to(target, {
          scale: 0,
          rotation: 360,
          duration: 0.5,
          ease: "back.in(1.7)",
          onComplete: () => {
            makeMove(square.letter, square.color);
            setMovingSquares(prev => prev.map(s => s.id === square.id ? { ...s, caught: true } : s));
          }
        });
      } else {
        // Wrong sequence - shake animation
        gsap.to(target, {
          x: "+=10",
          duration: 0.1,
          yoyo: true,
          repeat: 5,
          ease: "power2.inOut",
          onComplete: () => {
            gsap.set(target, { x: 0 });
            makeMove(square.letter, square.color);
          }
        });
      }
    } else {
      // Wrong square - shake and fade
      gsap.to(target, {
        x: "+=10",
        duration: 0.1,
        yoyo: true,
        repeat: 3,
        ease: "power2.inOut",
        onComplete: () => {
          gsap.set(target, { x: 0 });
          makeMove(square.letter, square.color);
        }
      });
    }
  };

  // Start game with entrance animation
  const startGame = async () => {
    // Animate welcome card exit
    if (welcomeCardRef.current) {
      gsap.to(welcomeCardRef.current, {
        scale: 0.9,
        opacity: 0,
        duration: 0.3,
        ease: "power2.in"
      });
    }
    
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
      
      // Start background audio when game begins
      startBackgroundAudio();
      
      // Animate game header entrance
      setTimeout(() => {
        if (gameHeaderRef.current) {
          gsap.fromTo(gameHeaderRef.current,
            { y: -50, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.5, ease: "power2.out" }
          );
        }
        if (gameAreaRef.current) {
          gsap.fromTo(gameAreaRef.current,
            { scale: 0.8, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.6, ease: "back.out(1.7)", delay: 0.2 }
          );
        }
      }, 100);
    }
  };

  // Animate score changes
  useEffect(() => {
    const scoreBadge = document.querySelector('.score-badge');
    if (scoreBadge && score > 0) {
      gsap.fromTo(scoreBadge,
        { scale: 1.3, backgroundColor: '#4ade80' },
        { scale: 1, backgroundColor: '', duration: 0.5, ease: "bounce.out" }
      );
    }
  }, [score]);

  // Animate attempts decrease
  useEffect(() => {
    const attemptsBadge = document.querySelector('.attempts-badge');
    if (attemptsBadge && attempts < 5) {
      gsap.fromTo(attemptsBadge,
        { scale: 1.2, x: -5 },
        { scale: 1, x: 0, duration: 0.3, ease: "power2.out" }
      );
      
      if (attempts <= 2) {
        gsap.to(attemptsBadge, {
          backgroundColor: '#ef4444',
          duration: 0.3
        });
      }
    }
  }, [attempts]);

  // Add entrance animation for welcome screen
  useEffect(() => {
    if (!gameStarted && welcomeCardRef.current) {
      gsap.fromTo(welcomeCardRef.current,
        { scale: 0.8, opacity: 0, y: 50 },
        { scale: 1, opacity: 1, y: 0, duration: 0.8, ease: "back.out(1.7)" }
      );
    }
  }, [gameStarted]);

  // Animate letter boxes when caught letters change
  useEffect(() => {
    const letterBoxes = document.querySelectorAll('.letter-box.caught');
    if (letterBoxes.length > 0) {
      gsap.fromTo(letterBoxes[letterBoxes.length - 1],
        { scale: 0, rotation: -180 },
        { scale: 1, rotation: 0, duration: 0.5, ease: "back.out(1.7)" }
      );
    }
  }, [caughtLetters]);

  // Animate reward popup
  useEffect(() => {
    console.log('Reward popup effect triggered. showReward:', showReward, 'rewardPopupRef.current:', !!rewardPopupRef.current);
    
    if (showReward && rewardPopupRef.current) {
      console.log('Animating reward popup');
      
      // Set initial state
      gsap.set(rewardPopupRef.current, { scale: 0, rotation: -180, opacity: 0 });
      
      // Animate in
      gsap.to(rewardPopupRef.current, {
        scale: 1, 
        rotation: 0, 
        opacity: 1, 
        duration: 0.6, 
        ease: "back.out(1.7)"
      });
    }
  }, [showReward]);

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

  // Cleanup background audio on component unmount
  useEffect(() => {
    return () => {
      if (backgroundAudioRef.current) {
        backgroundAudioRef.current.pause();
        backgroundAudioRef.current = null;
      }
    };
  }, []);

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
        <div ref={welcomeCardRef}>
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
              
              <div style={{ marginTop: '20px' }}>
                <Button 
                  onClick={toggleAudio} 
                  style={{ 
                    backgroundColor: audioEnabled ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    padding: '8px 16px',
                    borderRadius: '8px'
                  }}
                >
                  {audioEnabled ? '🔊 Audio On' : '🔇 Audio Off'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className="game-container">
        <div ref={(el) => {
          if (el && gameOver) {
            gsap.fromTo(el,
              { scale: 0.7, opacity: 0, y: 100 },
              { scale: 1, opacity: 1, y: 0, duration: 0.8, ease: "back.out(1.7)" }
            );
          }
        }}>
          <Card className="game-over">
            <div className="game-over-content">
              <h2 className="final-reward">{finalReward}</h2>
              <div className="final-stats">
                <p>Final Score: {score}</p>
                <p>Rounds Completed: {currentRound + (caughtLetters.length === requiredLetters.length ? 1 : 0)}/5</p>
              </div>
              <div ref={(el) => {
                if (el) {
                  gsap.fromTo(el,
                    { scale: 0.8, opacity: 0 },
                    { scale: 1, opacity: 1, duration: 0.5, ease: "bounce.out", delay: 0.5 }
                  );
                }
              }}>
                <Button 
                  onClick={startGame} 
                  className="restart-button" 
                  disabled={loading}
                >
                  {loading ? 'Starting...' : 'Play Again'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
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
        <div className="confetti-container" ref={confettiRef}>
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
      <div className="game-header" ref={gameHeaderRef}>
        <div className="game-stats">
          <Badge variant="secondary">Round: {currentRound + 1}/5</Badge>
          <Badge variant="secondary" className="score-badge">Score: {score}</Badge>
          <Badge variant={attempts <= 2 ? "destructive" : "secondary"} className="attempts-badge">
            Attempts: {attempts}
          </Badge>
          <Button 
            onClick={toggleAudio}
            style={{
              marginLeft: '10px',
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: audioEnabled ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '4px'
            }}
          >
            {audioEnabled ? '🔊' : '🔇'}
          </Button>
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
              onClick={(e) => handleSquareClick(square, e)}
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
        <div className="reward-popup" style={{ 
          position: 'fixed', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)', 
          zIndex: 2000,
          background: 'linear-gradient(45deg, #FFD700, #FF6B6B)',
          padding: '30px',
          borderRadius: '20px',
          textAlign: 'center',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
        }}>
          <div className="reward-content" ref={rewardPopupRef} style={{ color: 'white' }}>
            <h3 style={{ fontSize: '2rem', marginBottom: '10px', textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)' }}>
              🎉 Round Complete!
            </h3>
            <p style={{ fontSize: '1.2rem', margin: '5px 0' }}>Score: {score}</p>
            <p style={{ fontSize: '1.2rem', margin: '5px 0' }}>Attempts Remaining: {attempts}</p>
            <p style={{ fontSize: '1.2rem', margin: '5px 0' }}>Keep Going!</p>
          </div>
        </div>
      )}
    </div>
  );
}
