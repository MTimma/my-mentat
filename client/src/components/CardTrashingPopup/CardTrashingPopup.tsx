import React from 'react';
import { Card } from '../../types/GameTypes';
import CardSearch from '../CardSearch/CardSearch';
import './CardTrashingPopup.css';

interface CardTrashingPopupProps {
  isOpen: boolean;
  cards: Card[];
  onSelect: (selectedCard: Card) => void;
  onCancel: () => void;
  promptText?: string;
}

const CardTrashingPopup: React.FC<CardTrashingPopupProps> = ({
  isOpen,
  cards,
  onSelect,
  onCancel,
  promptText = 'Select a card to trash',
}) => {
  return (
    <div className="card-trashing-dialog-overlay">
      <div className="card-trashing-dialog">
        <CardSearch
          isOpen={isOpen}
          cards={cards}
          onSelect={(selected) => selected[0] && onSelect(selected[0])}
          onCancel={onCancel}
          isRevealTurn={false}
          selectionCount={1}
          text={promptText}
        />
      </div>
    </div>
  );
};

export default CardTrashingPopup;
