import React, { useState } from 'react';
import { FactionType, Player, GameState, GainSource } from '../../types/GameTypes';
import { BoardScopedModal } from '../BoardScopedModal';
import {
  conflictChoiceAsFixedOptions,
  isInfluenceBoardChoice,
} from '../../utils/influenceBoardChoice';
import { isBlockedSequentialConflictChoice } from '../../utils/conflictDistinctFactions';
import { getFactionBumpIcon } from '../../utils/influenceDisplay';
import { combatRewardPlace } from '../../utils/combatPlacements';
import FreighterIcon, { freighterArrowDirectionFromCustom } from '../FreighterIcon/FreighterIcon';
import './CombatResults.css';

interface PlayerResult {
  playerId: number;
  strength: number;
  place: string;
}

interface CombatResultsProps {
  players: Player[];
  combatStrength: Record<number, number>;
  history: GameState[];
  onConfirm: () => void;
  pendingConflictRewardChoices?: GameState['pendingConflictRewardChoices'];
  influenceBoardChoiceActive?: boolean;
  onResolveConflictChoice?: (choiceId: string, optionIndex: number) => void;
}

const FACTION_LABELS: Record<FactionType, string> = {
  [FactionType.EMPEROR]: 'Emperor',
  [FactionType.SPACING_GUILD]: 'Spacing Guild',
  [FactionType.BENE_GESSERIT]: 'Bene Gesserit',
  [FactionType.FREMEN]: 'Fremen',
};

function formatRewardLabel(reward: import('../../types/GameTypes').Reward): string {
  if (reward.spice) return `${reward.spice} Spice`
  if (reward.intrigueCards) return `${reward.intrigueCards} Intrigue`
  if (reward.solari) return `${reward.solari} Solari`
  if (reward.influence?.amounts?.[0]) {
    const { faction, amount } = reward.influence.amounts[0]
    return `${amount} Influence (${faction})`
  }
  return 'Choose'
}

function isConflictInfluenceChoice(
  choice: NonNullable<GameState['pendingConflictRewardChoices']>[number]
): boolean {
  return isInfluenceBoardChoice(conflictChoiceAsFixedOptions(choice))
}

const CombatResults: React.FC<CombatResultsProps> = ({
  players,
  combatStrength,
  history,
  onConfirm,
  pendingConflictRewardChoices = [],
  influenceBoardChoiceActive = false,
  onResolveConflictChoice
}) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);

  const calculateResults = (): PlayerResult[] => {
    const results: PlayerResult[] = [];
    const strengths = Object.entries(combatStrength)
      .map(([id, strength]) => ({
        playerId: parseInt(id),
        strength: strength || 0
      }))
      .filter(p => p.strength > 0)
      .sort((a, b) => b.strength - a.strength);

    if (strengths.length === 0) return [];

    const fieldStrengths = strengths.map(player => player.strength)
    const placeLabel = (place: number): string => {
      if (place === 1) return '1st'
      if (place === 2) return '2nd'
      if (place === 3) return '3rd'
      return '-'
    }

    strengths.forEach(player => {
      results.push({
        playerId: player.playerId,
        strength: player.strength,
        place: placeLabel(combatRewardPlace(player.strength, fieldStrengths)),
      })
    })

    return results;
  };

  const results = calculateResults();
  const hasParticipants = results.length > 0;

  const getPlayerCombatGains = (playerId: number) => {
    return history.map(state => state.gains).flatMap(gain => gain?.filter(g => g.playerId === playerId && g.source === GainSource.CONFLICT) || []) || [];
  };

  const overlayClassName = [
    'combat-results-overlay',
    influenceBoardChoiceActive ? 'combat-results-overlay--influence-board-choice' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <BoardScopedModal isOpen overlayClassName={overlayClassName}>
    <div className="combat-results">
      <h2>Combat Results</h2>
      {!hasParticipants ? (
        <p className="combat-results-empty">No participants in the conflict</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Player</th>
              <th>
                <span className="combat-results-strength-heading">
                  <img src="/icon/sword.png" alt="" className="combat-results-strength-icon" aria-hidden="true" />
                  Strength
                </span>
              </th>
              <th>Place</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <tr key={result.playerId}>
                <td>{players[result.playerId]?.leader.name || `Player ${result.playerId + 1}`}</td>
                <td>
                  <span className="combat-results-strength-value">
                    <img src="/icon/sword.png" alt="" className="combat-results-strength-icon" aria-hidden="true" />
                    {result.strength}
                  </span>
                </td>
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
      )}
      {pendingConflictRewardChoices && pendingConflictRewardChoices.length > 0 ? (
        <div className="conflict-reward-choices">
          <h3>Choose your conflict rewards</h3>
          {pendingConflictRewardChoices.map((choice) => {
            const blockedByDistinctFaction = isBlockedSequentialConflictChoice(
              choice,
              pendingConflictRewardChoices
            )
            const influenceChoice = isConflictInfluenceChoice(choice)
            const useBoardForChoice =
              influenceChoice && influenceBoardChoiceActive && !blockedByDistinctFaction
            return (
              <div key={choice.id} className="conflict-choice-block">
                <span className="choice-player">
                  {players[choice.playerId]?.leader.name || `Player ${choice.playerId + 1}`} ({choice.placement}):
                </span>
                {blockedByDistinctFaction ? (
                  <p className="conflict-choice-board-hint">
                    Resolve the previous influence choice first.
                  </p>
                ) : useBoardForChoice ? (
                  <p className="conflict-choice-board-hint">
                    Click a highlighted influence track on the board.
                  </p>
                ) : (
                  <div className="choice-options">
                    {choice.options.map((opt, oidx) => {
                      const faction = opt.reward.influence?.amounts?.[0]?.faction
                      const amount = opt.reward.influence?.amounts?.[0]?.amount
                      if (influenceChoice && faction && amount != null && amount > 0) {
                        return (
                          <button
                            key={oidx}
                            type="button"
                            className="conflict-choice-faction-btn"
                            title={`${FACTION_LABELS[faction]} +${amount} influence`}
                            onClick={() => onResolveConflictChoice?.(choice.id, oidx)}
                          >
                            <img
                              src={getFactionBumpIcon(faction)}
                              alt=""
                              className="conflict-choice-faction-icon"
                              aria-hidden="true"
                            />
                            <span className="conflict-choice-faction-label">{FACTION_LABELS[faction]}</span>
                          </button>
                        )
                      }
                      const freighterDirection = freighterArrowDirectionFromCustom(opt.reward.custom)
                      if (freighterDirection) {
                        return (
                          <button
                            key={oidx}
                            type="button"
                            className="effect-btn choice conflict-choice-freighter-btn"
                            title={opt.rewardLabel ?? (freighterDirection === 'up' ? 'Advance' : 'Recall')}
                            onClick={() => onResolveConflictChoice?.(choice.id, oidx)}
                          >
                            <FreighterIcon
                              direction={freighterDirection}
                              size="lg"
                              title={opt.rewardLabel ?? (freighterDirection === 'up' ? 'Advance' : 'Recall')}
                            />
                          </button>
                        )
                      }
                      return (
                        <button
                          key={oidx}
                          className="effect-btn choice"
                          onClick={() => onResolveConflictChoice?.(choice.id, oidx)}
                        >
                          {opt.rewardLabel ?? formatRewardLabel(opt.reward)}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <button className="confirm-button" onClick={onConfirm}>
          Confirm
        </button>
      )}

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
    </BoardScopedModal>
  );
};

export default CombatResults;
