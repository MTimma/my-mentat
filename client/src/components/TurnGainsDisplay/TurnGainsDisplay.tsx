import React, { useMemo } from 'react'
import { Card, Gain, RewardType } from '../../types/GameTypes'
import {
  aggregateInfluenceGains,
  aggregateResourceGains,
  computeTurnGainTotals,
  getRepeatedIconDisplay,
  groupGainsForDisplay,
  INLINE_DISCARDS_GROUP_KEY,
  splitGainsByCostAndReward,
  type AggregatedResourceGain,
  type CardTypeTotal,
  type InfluenceTypeTotal,
  type ResourceTypeTotal,
} from '../../utils/turnGainsDisplay'
import {
  factionFromInfluenceGainName,
  getAnyFactionInfluenceGainIcon,
  getAnyFactionInfluenceLossIcon,
  getFactionBumpIcon,
} from '../../utils/influenceDisplay'
import { getRewardDisplayName, getRewardIcon } from '../../utils/rewardIcons'
import './TurnGainsDisplay.css'

export interface TurnGainsDisplayProps {
  gains: Gain[]
  className?: string
  /** Each source group shows a short title above its cost → reward row. */
  showSourceTitles?: boolean
  /** Net summary row (turn history). */
  showTotals?: boolean
  /** Only render the totals row (and combat troop counts), not per-source groups. */
  totalsOnly?: boolean
  /** Resolve acquired/gained cards for thumbnails. */
  resolveCard?: (cardId: number, name: string) => Card | undefined
  /** Troops sent to the Conflict this turn (shown after source groups). */
  troopsDeployedToConflict?: number
  /** Troops retreated from the Conflict this turn. */
  troopsRetreatedFromConflict?: number
  /** Opponent discards: one thumbnail row, no card-name titles. */
  inlineDiscards?: boolean
  /** Totals row: show plain amounts for gains (e.g. 2 spice) without a leading +. */
  omitPositiveSign?: boolean
}

/** Solari/spice: icon + count beside it (matches effect labels), not a count badge on the icon. */
const usesIconWithAmountLabel = (type: RewardType): boolean =>
  type === RewardType.SOLARI || type === RewardType.SPICE

const usesStackedRepeatIcons = (type: RewardType): boolean =>
  type === RewardType.TROOPS ||
  type === RewardType.POOL_TROOP ||
  type === RewardType.CARD ||
  type === RewardType.DRAW ||
  type === RewardType.WATER ||
  type === RewardType.INTRIGUE ||
  type === RewardType.DREADNOUGHT

const TurnGainsDisplay: React.FC<TurnGainsDisplayProps> = ({
  gains,
  className = '',
  showSourceTitles = true,
  showTotals = false,
  totalsOnly = false,
  resolveCard,
  troopsDeployedToConflict = 0,
  troopsRetreatedFromConflict = 0,
  inlineDiscards = false,
  omitPositiveSign = false,
}) => {
  const deployedCount = Math.max(0, troopsDeployedToConflict)
  const retreatedCount = Math.max(0, troopsRetreatedFromConflict)
  const totals = useMemo(
    () => (showTotals || totalsOnly ? computeTurnGainTotals(gains) : null),
    [gains, showTotals, totalsOnly]
  )
  const hasTotals =
    totals != null &&
    (totals.resources.length > 0 || totals.influence.length > 0 || totals.cards.length > 0)

  if (!totalsOnly && gains.length === 0 && deployedCount === 0 && retreatedCount === 0) return null
  if (totalsOnly && !hasTotals && deployedCount === 0 && retreatedCount === 0) return null

  const groups = useMemo(
    () => (totalsOnly ? [] : groupGainsForDisplay(gains, { inlineDiscards })),
    [gains, inlineDiscards, totalsOnly]
  )
  const troopIcon = getRewardIcon(RewardType.TROOPS)
  const retreatIcon = getRewardIcon(RewardType.RETREAT)

  const renderGainMultiplier = (amount: number) => {
    const absAmount = Math.abs(amount)
    if (absAmount < 2) return null
    return <span className="gain-multiplier">×{absAmount}</span>
  }

  const iconSrc = (iconPath: string) =>
    iconPath.startsWith('/') ? iconPath : `/${iconPath}`

  const renderGainIcon = (iconPath: string, displayName: string, className = 'gain-icon') => (
    <img
      src={iconSrc(iconPath)}
      alt=""
      className={className}
      aria-hidden="true"
      onError={e => {
        e.currentTarget.style.display = 'none'
        const parent = e.currentTarget.parentElement
        if (!parent || parent.querySelector('.gain-text-fallback')) return
        const textSpan = document.createElement('span')
        textSpan.className = 'gain-text-fallback'
        textSpan.textContent = displayName
        parent.appendChild(textSpan)
      }}
    />
  )

  const renderRepeatedIcons = (iconPath: string, displayName: string, amount: number) => {
    const { iconCount, showTotalMultiplier } = getRepeatedIconDisplay(amount)
    return (
      <>
        {Array.from({ length: iconCount }, (_, i) => (
          <React.Fragment key={i}>{renderGainIcon(iconPath, displayName)}</React.Fragment>
        ))}
        {showTotalMultiplier ? renderGainMultiplier(amount) : null}
      </>
    )
  }

  const renderCardThumb = (cardId: number, name: string, count: number, key: string) => {
    const card = resolveCard?.(cardId, name)
    const image = card?.image
    const label = card?.name ?? name
    const absCount = Math.abs(count)
    if (!image) {
      return (
        <span key={key} className="turn-gain-card-thumb turn-gain-card-thumb--fallback" title={label}>
          <span className="turn-gain-card-thumb-fallback-text">{label}</span>
          {absCount > 1 ? <span className="gain-multiplier">×{absCount}</span> : null}
        </span>
      )
    }
    const { iconCount, showTotalMultiplier } = getRepeatedIconDisplay(absCount)
    return (
      <span key={key} className="turn-gain-card-thumb" title={label}>
        {Array.from({ length: iconCount }, (_, i) => (
          <img
            key={i}
            src={image}
            alt=""
            className="turn-gain-card-thumb-img"
            draggable={false}
          />
        ))}
        {showTotalMultiplier ? <span className="gain-multiplier">×{absCount}</span> : null}
      </span>
    )
  }

  const renderCardGains = (cardId: number | undefined, name: string | undefined, amount: number, key: string) => {
    if (cardId != null && name && resolveCard) {
      return renderCardThumb(cardId, name, amount, key)
    }
    const iconPath = getRewardIcon(RewardType.CARD)
    const displayName = getRewardDisplayName(RewardType.CARD, name)
    if (iconPath && Math.abs(amount) >= 2) {
      return (
        <span key={key} className="gain-item gain-item--reward">
          {renderRepeatedIcons(iconPath, displayName, amount)}
        </span>
      )
    }
    return (
      <span key={key} className="gain-text-fallback">
        {name ?? displayName}
        {Math.abs(amount) > 1 ? ` ×${Math.abs(amount)}` : ''}
      </span>
    )
  }

  const renderResourceWithAmount = (
    iconPath: string,
    amount: number,
    displayName: string,
    side: 'cost' | 'reward'
  ) => {
    const absAmount = Math.abs(amount)
    return (
      <span
        className={`turn-gain-resource-token turn-gain-resource-token--${side}`}
        title={displayName}
        aria-hidden="true"
      >
        {renderGainIcon(iconPath, displayName, 'turn-gain-resource-icon')}
        <span className="turn-gain-resource-amt">{absAmount}</span>
      </span>
    )
  }

  const renderResourceGain = (
    gain: AggregatedResourceGain,
    index: number,
    side: 'cost' | 'reward'
  ) => {
    const rewardType = gain.type as RewardType
    const iconPath = getRewardIcon(rewardType)
    const displayName = getRewardDisplayName(rewardType, gain.name)
    const isCost = side === 'cost'
    const absAmount = Math.abs(gain.amount)
    const ariaLabel =
      absAmount === 1
        ? `${isCost ? 'Paid' : 'Gained'} 1 ${displayName}`
        : `${isCost ? 'Paid' : 'Gained'} ${absAmount} ${displayName}`

    return (
      <div
        key={`${side}-${index}`}
        className={`gain-item gain-item--${side}`}
        aria-label={ariaLabel}
      >
        {rewardType === RewardType.POOL_TROOP ? (
          <span className="turn-gain-pool-troop" title={displayName}>
            <span className="turn-gain-pool-label">pool</span>
            {iconPath ? (
              <>
                {renderGainIcon(iconPath, displayName)}
                {renderGainMultiplier(gain.amount)}
              </>
            ) : (
              <span className="gain-text-fallback">{displayName}</span>
            )}
          </span>
        ) : rewardType === RewardType.CARD ||
        rewardType === RewardType.TRASH ||
        rewardType === RewardType.DISCARD ? (
          renderCardGains(gain.cardId, gain.name, gain.amount, `${side}-card-${index}`)
        ) : rewardType === RewardType.PERSUASION ? (
          <span className="gain-persuasion-badge" title={displayName} aria-hidden="true">
            <span className="gain-persuasion-diamond" />
            <span className="gain-persuasion-count">{isCost ? `−${absAmount}` : absAmount}</span>
          </span>
        ) : iconPath && usesStackedRepeatIcons(rewardType) && absAmount >= 2 ? (
          renderRepeatedIcons(iconPath, displayName, gain.amount)
        ) : iconPath && usesIconWithAmountLabel(rewardType) ? (
          renderResourceWithAmount(iconPath, gain.amount, displayName, side)
        ) : iconPath ? (
          <>
            {renderGainIcon(iconPath, displayName)}
            {renderGainMultiplier(gain.amount)}
          </>
        ) : (
          <span className="gain-text-fallback">{displayName}</span>
        )}
      </div>
    )
  }

  const renderInfluenceGain = (name: string, amount: number, index: number, side: 'cost' | 'reward') => {
    const isCost = side === 'cost'
    const absAmount = Math.abs(amount)
    const faction = factionFromInfluenceGainName(name)
    const iconPath = isCost
      ? faction
        ? `/icon/${faction}.png`
        : getAnyFactionInfluenceLossIcon()
      : faction
        ? getFactionBumpIcon(faction)
        : getAnyFactionInfluenceGainIcon(absAmount)

    return (
      <div
        key={`inf-${side}-${index}`}
        className={`gain-item gain-item--${side}`}
        aria-label={
          absAmount === 1
            ? `${isCost ? 'Lost' : 'Gained'} 1 influence`
            : `${isCost ? 'Lost' : 'Gained'} ${absAmount} influence`
        }
      >
        <img src={iconPath} alt="" className="gain-icon gain-icon--influence" aria-hidden="true" />
        {renderGainMultiplier(amount)}
      </div>
    )
  }

  const sortResourceGainsForDisplay = (resourceGains: AggregatedResourceGain[]) =>
    [...resourceGains].sort((a, b) => {
      const rank = (type: RewardType | string) => (type === RewardType.PERSUASION ? 0 : 1)
      return rank(a.type) - rank(b.type)
    })

  const renderGainSide = (sideGains: Gain[], side: 'cost' | 'reward') => {
    const resourceGains = sortResourceGainsForDisplay(aggregateResourceGains(sideGains))
    const influenceGains = aggregateInfluenceGains(sideGains)
    if (resourceGains.length === 0 && influenceGains.length === 0) return null

    return (
      <div className={`turn-gains-side turn-gains-side--${side}`}>
        {resourceGains.map((gain, idx) => renderResourceGain(gain, idx, side))}
        {influenceGains.map((gain, idx) => renderInfluenceGain(gain.name, gain.amount, idx, side))}
      </div>
    )
  }

  const renderCombatTroopCount = (
    count: number,
    variant: 'deployed' | 'retreated',
    title: string,
    iconPath: string | null,
    displayName: string
  ) => {
    if (count === 0) return null
    return (
      <div className={`turn-gain-source-group turn-gain-combat-group turn-gain-combat-group--${variant}`}>
        <span className="turn-gain-source-title turn-gain-source-title--combat" title={title}>
          {title}
        </span>
        <div
          className="turn-gain-source-flow"
          title={`${title}: ${count}`}
          aria-label={`${title}: ${count} troop${count === 1 ? '' : 's'}`}
        >
          <div className={`turn-gains-side turn-gains-side--${variant}`}>
            {iconPath ? (
              <span className={`turn-gain-combat-token turn-gain-combat-token--${variant}`}>
                {renderGainIcon(iconPath, displayName, 'turn-gain-combat-icon')}
                <span className="turn-gain-combat-count">{count}</span>
              </span>
            ) : (
              <span className="gain-text-fallback">{count}</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  const formatSignedTotal = (value: number) => {
    if (value === 0) return '0'
    if (value < 0) return `−${Math.abs(value)}`
    return omitPositiveSign ? String(value) : `+${value}`
  }

  const renderTotalAmount = (value: number) => {
    if (value === 0) return null
    const isGain = value > 0
    return (
      <span className={`turn-gain-total-amt turn-gain-total-amt--${isGain ? 'gain' : 'cost'}`}>
        {formatSignedTotal(value)}
      </span>
    )
  }

  /** Single-unit gains where the icon alone is sufficient (matches effect labels). */
  const renderTotalIconOnlyAmount = (value: number) => {
    if (Math.abs(value) === 1) return null
    return renderTotalAmount(value)
  }

  const renderTotalInfluenceAmount = renderTotalIconOnlyAmount

  const renderTotalPersuasionAmount = (value: number) => {
    if (value === 0) return null
    const absAmount = Math.abs(value)
    const isCost = value < 0
    return (
      <span
        className="gain-persuasion-badge turn-gain-total-persuasion"
        title={`Persuasion: ${isCost ? '−' : ''}${absAmount}`}
        aria-label={`Persuasion ${isCost ? 'spent' : 'gained'} ${absAmount}`}
      >
        <span className="gain-persuasion-diamond" aria-hidden="true" />
        <span className="gain-persuasion-count">{isCost ? `−${absAmount}` : absAmount}</span>
      </span>
    )
  }

  const renderTotalResource = (total: ResourceTypeTotal) => {
    const iconPath = getRewardIcon(total.type)
    const displayName = getRewardDisplayName(total.type)
    const hasBoth = total.gained > 0 && total.spent > 0
    const isPersuasion = total.type === RewardType.PERSUASION
    const usesIconOnlyForSingleUnit =
      total.type === RewardType.VICTORY_POINTS || total.type === RewardType.WATER
    const renderAmount = usesIconOnlyForSingleUnit ? renderTotalIconOnlyAmount : renderTotalAmount

    return (
      <div
        key={total.type}
        className="turn-gain-total-item"
        title={`${displayName}: ${formatSignedTotal(total.net)}`}
        aria-label={`${displayName} net ${total.net}`}
      >
        {isPersuasion ? null : iconPath ? renderGainIcon(iconPath, displayName, 'turn-gain-total-icon') : null}
        {isPersuasion ? (
          hasBoth ? (
            <span className="turn-gain-total-flow">
              <span className="turn-gain-total-spent">{renderTotalPersuasionAmount(-total.spent)}</span>
              <span className="turn-gain-flow-arrow" aria-hidden="true">
                →
              </span>
              <span className="turn-gain-total-gained">{renderTotalPersuasionAmount(total.gained)}</span>
            </span>
          ) : (
            renderTotalPersuasionAmount(total.net)
          )
        ) : hasBoth ? (
          <span className="turn-gain-total-flow">
            <span className="turn-gain-total-spent">{renderAmount(-total.spent)}</span>
            <span className="turn-gain-flow-arrow" aria-hidden="true">
              →
            </span>
            <span className="turn-gain-total-gained">{renderAmount(total.gained)}</span>
          </span>
        ) : (
          renderAmount(total.net)
        )}
      </div>
    )
  }

  const renderTotalInfluence = (total: InfluenceTypeTotal) => {
    const faction = factionFromInfluenceGainName(total.faction)
    const hasBoth = total.gained > 0 && total.lost > 0
    const iconPath = faction
      ? getFactionBumpIcon(faction)
      : getAnyFactionInfluenceGainIcon(Math.max(total.gained, total.lost, 1))

    return (
      <div
        key={total.faction}
        className="turn-gain-total-item"
        title={`Influence (${total.faction}): ${formatSignedTotal(total.net)}`}
      >
        <img src={iconPath} alt="" className="turn-gain-total-icon turn-gain-total-icon--influence" />
        {hasBoth ? (
          <span className="turn-gain-total-flow">
            <span className="turn-gain-total-spent">{renderTotalInfluenceAmount(-total.lost)}</span>
            <span className="turn-gain-flow-arrow" aria-hidden="true">
              →
            </span>
            <span className="turn-gain-total-gained">{renderTotalInfluenceAmount(total.gained)}</span>
          </span>
        ) : (
          renderTotalInfluenceAmount(total.net)
        )}
      </div>
    )
  }

  const renderTotalCards = (cards: CardTypeTotal[]) => {
    if (cards.length === 0) return null
    return (
      <div className="turn-gain-total-cards">
        {cards.map(card => renderCardThumb(card.cardId, card.name, card.count, `total-card-${card.cardId}`))}
      </div>
    )
  }

  const renderTotalsRow = () => {
    if (!hasTotals) return null
    return (
      <div className="turn-gain-totals-group">
        <span className="turn-gain-source-title turn-gain-source-title--totals">Total</span>
        <div className="turn-gain-totals-row">
          {totals!.resources.map(renderTotalResource)}
          {totals!.influence.map(renderTotalInfluence)}
          {renderTotalCards(totals!.cards)}
        </div>
      </div>
    )
  }

  const troopDisplayName = getRewardDisplayName(RewardType.TROOPS)
  const retreatDisplayName = getRewardDisplayName(RewardType.RETREAT)
  const hasCombatSection = deployedCount > 0 || retreatedCount > 0

  return (
    <div
      className={[
        'turn-gains-display-root',
        showTotals || totalsOnly ? 'turn-gains-display-root--with-totals' : '',
        totalsOnly ? 'turn-gains-display-root--totals-only' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {renderTotalsRow()}
      <div className="turn-gains-display">
      {groups.map(group => {
        const isInlineDiscards = group.key === INLINE_DISCARDS_GROUP_KEY
        const { costs, rewards } = splitGainsByCostAndReward(group.gains)
        const costContent = renderGainSide(costs, 'cost')
        const rewardContent = renderGainSide(rewards, 'reward')
        if (!costContent && !rewardContent) return null

        return (
          <div
            key={group.key}
            className={[
              'turn-gain-source-group',
              isInlineDiscards ? 'turn-gain-source-group--inline-discards' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {showSourceTitles && group.title && !isInlineDiscards ? (
              <span className="turn-gain-source-title" title={group.title}>
                {group.title}
              </span>
            ) : null}
            <div
              className={[
                'turn-gain-source-flow',
                isInlineDiscards ? 'turn-gain-source-flow--inline-discards' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              title={isInlineDiscards ? 'Discarded cards' : group.title}
              aria-label={isInlineDiscards ? 'Discarded cards' : group.title}
            >
              {isInlineDiscards ? (
                <>
                  <span className="turn-gain-inline-discard-label">discard</span>
                  {costContent}
                </>
              ) : (
                <>
                  {costContent}
                  {costContent && rewardContent && (
                    <span className="turn-gain-flow-arrow" aria-hidden="true">
                      →
                    </span>
                  )}
                  {rewardContent}
                </>
              )}
            </div>
          </div>
        )
      })}
      {hasCombatSection ? (
        <>
          {renderCombatTroopCount(
            deployedCount,
            'deployed',
            'Deployed',
            troopIcon,
            troopDisplayName
          )}
          {renderCombatTroopCount(
            retreatedCount,
            'retreated',
            'Retreated',
            retreatIcon ?? troopIcon,
            retreatDisplayName
          )}
        </>
      ) : null}
      </div>
    </div>
  )
}

export default TurnGainsDisplay
