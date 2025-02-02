import React, { useState } from 'react'
import { Leader, PlayerColor } from '../types/GameTypes'
import { LEADERS } from '../data/leaders'
import { motion, AnimatePresence } from 'framer-motion'

interface GameSetupProps {
  onComplete: (playerSetups: PlayerSetup[]) => void
}

interface PlayerSetup {
  leaderId: string
  color: PlayerColor
  playerNumber: number
}

const GameSetup: React.FC<GameSetupProps> = ({ onComplete }) => {
  const [playerCount, setPlayerCount] = useState<number>(0)
  const [playerSetups, setPlayerSetups] = useState<PlayerSetup[]>([])
  const [currentStep, setCurrentStep] = useState<'count' | 'setup'>('count')

  const availableColors = Object.values(PlayerColor)
    .filter(color => !playerSetups.find(p => p.color === color))

  const handlePlayerCountSelect = (count: number) => {
    setPlayerCount(count)
    setCurrentStep('setup')
  }

  const handlePlayerSetup = (setup: PlayerSetup) => {
    setPlayerSetups([...playerSetups, setup])
    if (playerSetups.length + 1 === playerCount) {
      onComplete(playerSetups)
    }
  }

  return (
    <motion.div 
      className="game-setup"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <AnimatePresence mode="wait">
        {currentStep === 'count' ? (
          <motion.div 
            key="count"
            className="player-count-selection"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <h2>Select Number of Players</h2>
            <div className="count-buttons">
              {[2, 3, 4].map(count => (
                <button
                  key={count}
                  onClick={() => handlePlayerCountSelect(count)}
                  className="count-button"
                >
                  {count} Players
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="setup"
            className="player-setup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <h2>Player {playerSetups.length + 1} Setup</h2>
            <div className="setup-options">
              <div className="leader-selection">
                <h3>Choose Your Leader</h3>
                <div className="leader-grid">
                  {LEADERS.map(leader => (
                    <button
                      key={leader.name}
                      className="leader-button"
                      onClick={() => handlePlayerSetup({
                        leaderId: leader.name,
                        color: availableColors[0],
                        playerNumber: playerSetups.length + 1
                      })}
                    >
                      <h4>{leader.name}</h4>
                      <p>{leader.ability.name}</p>
                      <div className="complexity">
                        {'★'.repeat(leader.complexity)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default GameSetup 