import React from 'react';
import { Card } from '../../types/GameTypes';
import CardSearch from '../CardSearch/CardSearch';
import './SelectiveBreedingPopup.css';

interface SelectiveBreedingPopupProps {
  isOpen: boolean;
  cards: Card[];
  onSelect: (selectedCard: Card) => void;
  onCancel: () => void;
}

const SelectiveBreedingPopup: React.FC<SelectiveBreedingPopupProps> = ({
  isOpen,
  cards,
  onSelect,
  onCancel,
}) => {
  return (
    <div className="selective-breeding-dialog-overlay">
      <div className="selective-breeding-dialog">
        <CardSearch
          isOpen={isOpen}
          cards={cards}
          onSelect={(selected) => selected[0] && onSelect(selected[0])}
          onCancel={onCancel}
          isRevealTurn={false}
          selectionCount={1}
          text="Selective Breeding: select a card to trash"
        />
      </div>
    </div>
  );
};

export default SelectiveBreedingPopup; 