// Minimal in-memory JSON store for sessions and config
type Session = {
  id: string;
  player_id: string;
  current_round: number;
  score: number;
  attempts_remaining: number;
  caught_letters: string[];
  is_completed: boolean;
  final_reward?: string;
};

type GameConfig = {
  rounds: { word: string; letters: { letter: string; color: string }[] }[];
  max_attempts: number;
};

export const db = {
  sessions: new Map<string, Session>(),
  config: {
    rounds: [
      { word: "CAT", letters: [ { letter: "C", color: "#FF9999" }, { letter: "A", color: "#99FF99" }, { letter: "T", color: "#9999FF" } ] },
      { word: "DOG", letters: [ { letter: "D", color: "#FF9999" }, { letter: "O", color: "#99FF99" }, { letter: "G", color: "#9999FF" } ] },
      { word: "SUN", letters: [ { letter: "S", color: "#FF9999" }, { letter: "U", color: "#99FF99" }, { letter: "N", color: "#9999FF" } ] },
      { word: "BOX", letters: [ { letter: "B", color: "#FF9999" }, { letter: "O", color: "#99FF99" }, { letter: "X", color: "#9999FF" } ] },
      { word: "JAM", letters: [ { letter: "J", color: "#FF9999" }, { letter: "A", color: "#99FF99" }, { letter: "M", color: "#9999FF" } ] },
    ],
    max_attempts: 5,
  } as GameConfig,
};
