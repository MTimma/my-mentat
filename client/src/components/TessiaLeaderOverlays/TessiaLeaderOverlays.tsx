import React from 'react'
import { Leader } from '../../types/GameTypes'
import {
  isTessiaLeader,
  isTessiaRewardSlotConsumed,
  SNOOPER_ICON_SRC,
  TESSIA_CONSUMED_REWARD_ANCHORS,
} from '../../data/leaderAbilities/tessiaSnoopers'
import './TessiaLeaderOverlays.css'

interface TessiaLeaderOverlaysProps {
  leader: Leader
}

const markerDebug =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('markerDebug')

const TessiaLeaderOverlays: React.FC<TessiaLeaderOverlaysProps> = ({ leader }) => {
  if (!isTessiaLeader(leader)) return null

  return (
    <>
      {TESSIA_CONSUMED_REWARD_ANCHORS.map(anchor =>
        isTessiaRewardSlotConsumed(leader, anchor.slot) ? (
          <div
            key={`tessia-reward-${anchor.slot}`}
            className="tessia-leader-consumed-reward"
            style={{ left: `${anchor.x}%`, top: `${anchor.y}%` }}
            title={`Reward ${anchor.slot} taken or passed`}
          >
            <img src={SNOOPER_ICON_SRC} alt="" aria-hidden="true" />
          </div>
        ) : null
      )}
      {markerDebug ? (
        <div className="tessia-leader-marker-debug" aria-hidden="true">
          {TESSIA_CONSUMED_REWARD_ANCHORS.map(anchor => (
            <div
              key={`db-tessia-reward-${anchor.slot}`}
              className="tessia-leader-marker-debug__dot tessia-leader-marker-debug__dot--reward"
              data-slot={anchor.slot}
              style={{ left: `${anchor.x}%`, top: `${anchor.y}%` }}
              title={`Tessia reward ${anchor.slot}: ${anchor.x}%, ${anchor.y}%`}
            />
          ))}
        </div>
      ) : null}
    </>
  )
}

export default TessiaLeaderOverlays
