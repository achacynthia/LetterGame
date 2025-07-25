// Minimal in-memory JSON store for sessions and config - sessions persist across hot reloads
import randomColor from 'randomcolor';
import { generate as randomWords } from 'random-words';

type Session = {
  id: string;
  player_id: string;
  current_round: number;
  score: number;
  attempts_remaining: number;
  caught_letters: string[];
  is_completed: boolean;
  final_reward?: string;
  config: GameConfig;
};

// Store for active game sessions - using global to persist across hot reloads
declare global {
  var gameSessionsStore: Map<string, Session> | undefined;
}

const sessions = globalThis.gameSessionsStore ?? new Map<string, Session>();
globalThis.gameSessionsStore = sessions;

type GameConfig = {
  rounds: { word: string; letters: { letter: string; color: string }[] }[];
  max_attempts: number;
};

// Default fallback config
const defaultConfig: GameConfig = {
  rounds: [
    { word: "CAT", letters: [ { letter: "C", color: "#FF9999" }, { letter: "A", color: "#99FF99" }, { letter: "T", color: "#9999FF" } ] },
    { word: "DOG", letters: [ { letter: "D", color: "#FF9999" }, { letter: "O", color: "#99FF99" }, { letter: "G", color: "#9999FF" } ] },
    { word: "SUN", letters: [ { letter: "S", color: "#FF9999" }, { letter: "U", color: "#99FF99" }, { letter: "N", color: "#9999FF" } ] },
    { word: "BOX", letters: [ { letter: "B", color: "#FF9999" }, { letter: "O", color: "#99FF99" }, { letter: "X", color: "#9999FF" } ] },
    { word: "JAM", letters: [ { letter: "J", color: "#FF9999" }, { letter: "A", color: "#99FF99" }, { letter: "M", color: "#9999FF" } ] },
  ],
  max_attempts: 5,
};

// Available colors for letters - fallback if randomcolor fails
const fallbackColors = ["#FF9999", "#99FF99", "#9999FF", "#FFFF99", "#FF99FF", "#99FFFF"];

// Simple word list as backup if API fails
const backupWords = ["CAT", "DOG", "SUN", "BOX", "JAM", "BED", "CUP", "HAT", "PEN", "BAG", "EGG", "FAN", "GUN", "ICE", "KEY"];

// Function to create letter objects with random colors
function createLetterObjects(word: string): { letter: string; color: string }[] {
  return word.split('').map((letter, index) => {
    let color: string;
    try {
      // Generate a random color with good contrast and brightness
      color = randomColor({
        luminosity: 'bright',
        format: 'hex',
        hue: 'random'
      });
    } catch (error) {
      console.warn('Failed to generate random color, using fallback:', error);
      // Fallback to predefined colors
      color = fallbackColors[index % fallbackColors.length];
    }
    
    return {
      letter: letter.toUpperCase(),
      color
    };
  });
}

// Function to get random words using npm package
function fetchRandomWords(count: number = 5): string[] {
  try {
    // Generate random words using the npm package
    const generatedWords = randomWords({ 
      exactly: count * 2, // Generate more than needed to filter
      maxLength: 5,
      minLength: 3
    });
    
    // Filter and format words
    const words: string[] = [];
    for (const word of generatedWords) {
      if (typeof word === 'string') {
        const upperWord = word.toUpperCase();
        // Only include words that are 3-5 characters long and contain only letters
        if (upperWord.length >= 3 && upperWord.length <= 5 && /^[A-Z]+$/.test(upperWord)) {
          words.push(upperWord);
          if (words.length >= count) break;
        }
      }
    }
    
    // If we don't have enough words, fill with backup words
    while (words.length < count) {
      const randomBackup = backupWords[Math.floor(Math.random() * backupWords.length)];
      if (!words.includes(randomBackup)) {
        words.push(randomBackup);
      }
    }
    
    return words.slice(0, count);
  } catch (error) {
    console.error('Failed to generate words with npm package:', error);
    // Return random selection from backup words
    const shuffled = [...backupWords].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }
}

// Function to generate dynamic config
function generateDynamicConfig(): GameConfig {
  try {
    const words = fetchRandomWords(5);
    const rounds = words.map(word => ({
      word,
      letters: createLetterObjects(word)
    }));

    console.log('Generated dynamic config with words:', words);
    return {
      rounds,
      max_attempts: 5
    };
  } catch (error) {
    console.error('Failed to generate dynamic config:', error);
    return defaultConfig;
  }
}

export const db = {
  sessions,
  
  // Method to get config for a specific session
  getSessionConfig(sessionId: string): GameConfig | null {
    const session = sessions.get(sessionId);
    return session ? session.config : null;
  },

  // Method to create a new session with its own config
  createSession(playerId: string): Session {
    const sessionId = crypto.randomUUID();
    const config = generateDynamicConfig();
    
    const session: Session = {
      id: sessionId,
      player_id: playerId,
      current_round: 0,
      score: 0,
      attempts_remaining: config.max_attempts,
      caught_letters: [],
      is_completed: false,
      config
    };
    
    sessions.set(sessionId, session);
    return session;
  }
};
