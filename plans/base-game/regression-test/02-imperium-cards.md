# Imperium & starting cards

Manifest: `client/src/test-fixtures/base-game-manifest.json` (43 unique imperium row names, base filter).

## Per-card test template (agent)

For each `imperiumRow[].codeName`:

```ts
it('Arrakis Recruiter: agent +1 troop; reveal 1 persuasion 1 sword', () => {
  let s = getBaseTestState()
  const card = IMPERIUM_ROW_DECK.find(c => c.name === 'Arrakis Recruiter')!
  s = withCardOnTop(s, 0, card)
  s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: card.id })
  s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: /* valid icon */ })
  // assert troops, gains, currTurn.agentSpaceId
})
```

Stubs live in `imperiumRowCards.test.ts` (2× `it.todo` per card: agent box + reveal).

## Starting deck (10 cards)

| Card | Priority checks |
|------|-----------------|
| Duncan Idaho | Agent draw + optional water/troop; reveal swords |
| The Voice | Blocks opponent spaces |
| Stilgar | Fremen spaces |
| Seek Allies | Reveal trash-self + persuasion (`intrigueCards.test.ts` — fix failing) |
| … | See `STARTING_DECK` in `cards.ts` |

## Reserve

| Card | Acquire location |
|------|------------------|
| Spice Must Flow | Reserve pile |
| Arrakis Liaison | Reserve |
| Foldspace | Board space Foldspace |

## Custom effects (high priority)

Cards with `CustomEffect` in data need dedicated tests (not only resource deltas):

- The Voice, Reverend Mother Mohiam, Piter De Vries, Shifting Allegiances, etc.

Cross-ref spreadsheet columns **Agent Box**, **Reveal (Per/Sword/Other)**, **Acquire**.
