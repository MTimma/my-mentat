import React, { useState } from 'react';
import { useGame } from '../GameContext/GameContext';
import './CombatResults.css';

interface PlayerResult {
  playerId: number;
  strength: number;
  place: string;
}

interface CombatResultsProps {
  onConfirm: () => void;
}

const CombatResults: React.FC<CombatResultsProps> = ({ onConfirm }) => {
  const { gameState } = useGame();
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);

  const calculateResults = (): PlayerResult[] => {
    const results: PlayerResult[] = [];
    const strengths = Object.entries(gameState.combatStrength)
      .map(([id, strength]) => ({
        playerId: parseInt(id),
        strength: strength || 0
      }))
      .filter(p => p.strength > 0)
      .sort((a, b) => b.strength - a.strength);

    if (strengths.length === 0) return [];

    // Group players by strength
    const strengthGroups: { strength: number; players: number[] }[] = [];
    strengths.forEach((player) => {
      const existingGroup = strengthGroups.find(g => g.strength === player.strength);
      if (existingGroup) {
        existingGroup.players.push(player.playerId);
      } else {
        strengthGroups.push({ strength: player.strength, players: [player.playerId] });
      }
    });

    // Assign places based on groups
    let currentPlace = 1;
    strengthGroups.forEach((group) => {
      const place = group.players.length > 1 ? 
        (currentPlace === 1 ? '2nd' : currentPlace === 2 ? '3rd' : '-') : 
        (currentPlace === 1 ? '1st' : currentPlace === 2 ? '2nd' : currentPlace === 3 ? '3rd' : '-');

      // If this is a tie for first, next non-tied group starts at position 3
      if (group.players.length > 1 && currentPlace === 1) {
        currentPlace = 3;
      } 
      // If this is a tie for second, remaining players get nothing
      else if (group.players.length > 1 && currentPlace === 2) {
        currentPlace = 4;
      }
      // Normal progression
      else {
        currentPlace++;
      }

      group.players.forEach(playerId => {
        results.push({
          playerId,
          strength: group.strength,
          place: place
        });
      });
    });

    return results;
  };

  const results = calculateResults();

  const getPlayerCombatGains = (playerId: number) => {
    return gameState.gains.combatGains?.filter(gain => gain.playerId === playerId) || [];
  };

  return (
    <div className="combat-results">
      <h2>Combat Results</h2>
      <table>
        <thead>
          <tr>
            <th>Player</th>
            <th>Strength</th>
            <th>Place</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result) => (
            <tr key={result.playerId}>
              <td>{gameState.players.find(p => p.id === result.playerId)?.leader.name || `Player ${result.playerId + 1}`}</td>
              <td>{result.strength}</td>
              <td>{result.place}</td>
              <td>
                <button 
                  className="details-button"
                  onClick={() => setSelectedPlayerId(result.playerId)}
                >
                  View Details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="confirm-button" onClick={onConfirm}>
        Confirm
      </button>

      {selectedPlayerId !== null && (
        <div className="combat-details-modal">
          <div className="combat-details-content">
            <h3>Combat Details</h3>
            <table>
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Amount</th>
                  <th>Round</th>
                </tr>
              </thead>
              <tbody>
                {getPlayerCombatGains(selectedPlayerId).map((gain, index) => (
                  <tr key={index}>
                    <td>{gain.name}</td>
                    <td>{gain.amount}</td>
                    <td>{gain.round}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="close-button" onClick={() => setSelectedPlayerId(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CombatResults; 