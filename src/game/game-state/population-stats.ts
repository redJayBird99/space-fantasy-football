import { Player } from "../character/player";
import { mean, variance } from "../../util/math";

// player population statistics
interface PopStats {
  sampleSize: number;
  meanScore: number;
  medianScore: number;
  lowestScore: number;
  highestScore: number;
  standardDev: number;
}

/**
 * get the statistics from the current players skills state
 */
function getPopStats(players: Player[]): PopStats {
  const scores = players.map((p) => Player.getScore(p)).sort((a, b) => a - b);
  const meanScore = mean(scores);

  return {
    sampleSize: players.length,
    meanScore,
    medianScore: scores[Math.floor(scores.length / 2)],
    lowestScore: scores[0],
    highestScore: scores[scores.length - 1],
    standardDev: Math.sqrt(variance(scores, meanScore)),
  };
}

export { PopStats, getPopStats };
