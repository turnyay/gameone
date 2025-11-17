import React, { useEffect, useCallback, useState } from 'react';
import Phaser from 'phaser';
import { MainScene } from './MainScene';
import { UI } from './UI';
import { HexTile } from './HexTile';
import { INITIAL_RESOURCES, RESOURCE_REFRESH_RATE, RESOURCES_PER_REFRESH } from './constants';

const Game: React.FC = () => {
  const [playerColorIndex, setPlayerColorIndex] = useState(0);
  const [moveAllResources, setMoveAllResources] = useState(false);
  const [buttonStates, setButtonStates] = useState({
    addResources: false
  });
  const [availableResources, setAvailableResources] = useState(INITIAL_RESOURCES);
  const [countdownSeconds, setCountdownSeconds] = useState(RESOURCE_REFRESH_RATE);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownSeconds(prev => {
        if (prev <= 1) {
          setAvailableResources(prev => prev + RESOURCES_PER_REFRESH);
          return RESOURCE_REFRESH_RATE;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleButtonClick = (buttonName: keyof typeof buttonStates) => {
    setButtonStates(prev => ({
      ...prev,
      [buttonName]: !prev[buttonName]
    }));
  };

  const handleAddResources = (amount: number) => {
    if (HexTile.selectedTile && availableResources > 0 && amount > 0 && amount <= availableResources) {
      HexTile.selectedTile.addResources(amount);
      setAvailableResources(prev => prev - amount);
    }
  };

  const initGame = useCallback(() => {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: 'game-container',
      width: window.innerWidth * 0.55,
      height: window.innerHeight,
      backgroundColor: '#1a1a1a',
      scene: MainScene,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
      }
    };

    const game = new Phaser.Game(config);

    return () => {
      game.destroy(true);
    };
  }, []);

  useEffect(() => {
    return initGame();
  }, [initGame]);

  return (
    <div style={{ 
      display: 'flex', 
      width: '100vw', 
      height: '100vh',
      backgroundColor: '#1a1a1a'
    }}>
      <div id="game-container" style={{ 
        width: '55%', 
        height: '100%'
      }} />
      <UI
        playerColorIndex={playerColorIndex}
        moveAllResources={moveAllResources}
        setMoveAllResources={setMoveAllResources}
        buttonStates={buttonStates}
        handleButtonClick={handleButtonClick}
        handleAddResources={handleAddResources}
        availableResources={availableResources}
        simulatedTotalResources={availableResources}
        countdownSeconds={countdownSeconds}
      />
    </div>
  );
};

export default React.memo(Game); 