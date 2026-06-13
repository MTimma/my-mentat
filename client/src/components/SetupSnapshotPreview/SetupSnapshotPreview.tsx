import { Card, ConflictCard } from '../../types/GameTypes'
import { conflictCardImageSrc } from '../../data/boardMarkerAnchors'
import './SetupSnapshotPreview.css'

interface SetupSnapshotPreviewProps {
  imperiumRow: Card[]
  currentConflict: ConflictCard | null
}

const SetupSnapshotPreview = ({ imperiumRow, currentConflict }: SetupSnapshotPreviewProps) => {
  const conflictImage =
    currentConflict && currentConflict.id > 0
      ? conflictCardImageSrc(currentConflict.id)
      : null

  if (imperiumRow.length === 0 && !conflictImage) return null

  return (
    <div className="setup-snapshot-preview" aria-label="Chosen imperium row and conflict">
      {imperiumRow.length > 0 ? (
        <div className="setup-snapshot-imperium" aria-label="Imperium row">
          {imperiumRow.map(card => (
            <span key={card.id} className="setup-snapshot-card" title={card.name}>
              {card.image ? (
                <img src={card.image} alt="" className="setup-snapshot-thumb" draggable={false} />
              ) : (
                <span className="setup-snapshot-fallback">{card.name}</span>
              )}
            </span>
          ))}
        </div>
      ) : null}
      {imperiumRow.length > 0 && conflictImage ? (
        <span className="setup-snapshot-divider" aria-hidden="true" />
      ) : null}
      {conflictImage && currentConflict ? (
        <span className="setup-snapshot-conflict" title={currentConflict.name}>
          <img src={conflictImage} alt="" className="setup-snapshot-thumb setup-snapshot-thumb--conflict" draggable={false} />
        </span>
      ) : null}
    </div>
  )
}

export default SetupSnapshotPreview
