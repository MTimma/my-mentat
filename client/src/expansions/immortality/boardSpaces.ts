import { AgentIcon, type SpaceProps } from '../../types/GameTypes'

/** Immortality retune — replaces base Research Station (id 3) when the expansion is on. */
export const IMMORTALITY_RESEARCH_STATION: SpaceProps = {
  id: 3,
  name: 'Research Station',
  conflictMarker: true,
  agentIcon: AgentIcon.CITY,
  cost: { water: 2 },
  effects: [{ reward: { drawCards: 2, research: 1 } }],
  image: 'board/immortality/research_station.png',
  immortality: true,
}

export const IMMORTALITY_BOARD_SPACES: SpaceProps[] = [IMMORTALITY_RESEARCH_STATION]
