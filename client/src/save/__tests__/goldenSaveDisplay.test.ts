import { describe, expect, it } from 'vitest'
import { buildHistoryFromEvents } from '../buildHistory'
import { replaySaveDoc } from '../replay'
import { projectTurnHistory } from '../turnHistoryDisplayProjection'
import { listSaveFixtures, loadSaveFixture } from './loadSaveFixture'

describe('golden save display', () => {
  const fixtures = listSaveFixtures()

  it('has at least one save fixture', () => {
    expect(fixtures.length).toBeGreaterThan(0)
  })

  for (const name of fixtures) {
    describe(`fixture: ${name}`, () => {
      const doc = loadSaveFixture(name)

      it('replays without checksum divergences', () => {
        const { divergences } = replaySaveDoc(doc)
        expect(divergences).toEqual([])
      })

      it('builds non-empty history from events', () => {
        const history = buildHistoryFromEvents(doc.setup, doc.events)
        expect(history.length).toBeGreaterThan(0)
      })

      it('matches display projection snapshot', () => {
        const history = buildHistoryFromEvents(doc.setup, doc.events)
        expect(projectTurnHistory(history)).toMatchSnapshot()
      })
    })
  }
})
