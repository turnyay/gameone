import React from 'react';
import { HexTile } from './HexTile';
import { PLAYER_COLORS } from './constants';

interface UIProps {
  playerColorIndex: number;
  moveAllResources: boolean;
  setMoveAllResources: (value: boolean) => void;
  buttonStates: {
    addResources: boolean;
  };
  handleButtonClick: (buttonName: 'addResources') => void;
  handleAddResources: () => void;
  availableResources: number;
  countdownSeconds: number;
}

const getColorFromIndex = (index: number) => {
  return PLAYER_COLORS[index];
};

export const UI: React.FC<UIProps> = ({
  playerColorIndex,
  moveAllResources,
  setMoveAllResources,
  buttonStates,
  handleButtonClick,
  handleAddResources,
  availableResources,
  countdownSeconds
}) => {
  return (
    <>
      <div style={{ 
        width: '20%', 
        height: '100%',
        padding: '20px',
        color: '#fff',
        borderRight: '1px solid #333'
      }}>
        <h2 style={{ marginBottom: '20px' }}>Actions</h2>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '10px' 
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            marginBottom: '10px'
          }}>
            <input
              type="checkbox"
              checked={moveAllResources}
              onChange={(e) => setMoveAllResources(e.target.checked)}
              style={{
                width: '16px',
                height: '16px',
                cursor: 'pointer'
              }}
            />
            <span>Move all resources</span>
          </div>
          <button 
            onClick={() => {
              handleButtonClick('addResources');
              handleAddResources();
            }}
            disabled={!HexTile.selectedTile || availableResources === 0}
            style={{
              padding: '10px',
              backgroundColor: !HexTile.selectedTile || availableResources === 0 ? '#666' : 
                buttonStates.addResources ? '#008000' : '#006400',
              border: '1px solid #444',
              color: '#fff',
              borderRadius: '4px',
              cursor: !HexTile.selectedTile || availableResources === 0 ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s ease',
              transform: buttonStates.addResources ? 'scale(0.98)' : 'scale(1)',
              opacity: !HexTile.selectedTile || availableResources === 0 ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!buttonStates.addResources && HexTile.selectedTile && availableResources > 0) {
                e.currentTarget.style.backgroundColor = '#008000';
              }
            }}
            onMouseLeave={(e) => {
              if (!buttonStates.addResources && HexTile.selectedTile && availableResources > 0) {
                e.currentTarget.style.backgroundColor = '#006400';
              }
            }}
          >
            Add Resources
          </button>
        </div>

        <div style={{ margin: '30px 0' }}>
          <h2 style={{ marginBottom: '20px' }}>Resources Available</h2>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '10px',
            marginBottom: '20px',
            fontFamily: 'monospace',
            fontSize: '14px'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#888' }}>Resources:</span>
              <span style={{ color: '#ffa500' }}>{availableResources}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#888' }}>More resources in:</span>
              <span style={{ color: '#ffa500' }}>{countdownSeconds} seconds</span>
            </div>
          </div>
        </div>

        <div style={{ margin: '30px 0' }}>
          <h2 style={{ marginBottom: '20px' }}>Game Info</h2>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '10px',
            marginBottom: '20px',
            fontFamily: 'monospace',
            fontSize: '14px'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#888' }}>Game ID:</span>
              <span style={{ color: '#ffa500' }}>9C6Mu...Wn1pG</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#888' }}>Game Prize Total:</span>
              <span style={{ color: '#ffa500' }}>4.25345 SOL</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#888' }}>Target Life Remaining:</span>
              <span style={{ color: '#ffa500' }}>427/1000</span>
            </div>
          </div>
        </div>

        <div style={{ margin: '50px 0' }}>
          <h2 style={{ marginBottom: '20px' }}>My Profile</h2>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '10px',
            marginBottom: '20px',
            fontFamily: 'monospace',
            fontSize: '14px'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#888' }}>Player ID:</span>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '8px' 
              }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: `#${getColorFromIndex(playerColorIndex).toString(16).padStart(6, '0')}`,
                  borderRadius: '2px'
                }} />
                <span style={{ color: '#ffa500' }}>7xK9p...mN2vR</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#888' }}>Target Life Acquired:</span>
              <span style={{ color: '#ffa500' }}>0/1000</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#888' }}>Percent Gameboard:</span>
              <span style={{ color: '#ffa500' }}>0.73% (1/137)</span>
            </div>
          </div>
        </div>
      </div>
      <div style={{ 
        width: '25%',
        height: '100%',
        padding: '20px',
        color: '#fff'
      }}>
        <h2 style={{ marginBottom: '20px' }}>Live Feed</h2>
        <div style={{
          backgroundColor: '#000000',
          borderRadius: '4px',
          padding: '10px 5px',
          height: 'calc(100% - 200px)',
          overflowY: 'auto',
          fontFamily: 'monospace',
          fontSize: '12px',
          lineHeight: '1.5'
        }}>
          {(() => {
            const now = new Date();
            const formatTime = (date: Date) => {
              return date.toLocaleTimeString('en-US', { 
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              });
            };
            return (
              <>
                <div style={{ color: '#ffa500', textAlign: 'left', paddingLeft: '0' }}>
                  [{formatTime(now)}] Connected to Solana blockchain...
                </div>
                <div style={{ color: '#ffa500', textAlign: 'left', paddingLeft: '0' }}>
                  [{formatTime(new Date(now.getTime() + 1000))}] Loaded game board ok
                </div>
                <div style={{ color: '#ffa500', textAlign: 'left', paddingLeft: '0' }}>
                  [{formatTime(new Date(now.getTime() + 2000))}] Initialized player resources
                </div>
                <div style={{ color: '#ffa500', textAlign: 'left', paddingLeft: '0' }}>
                  [{formatTime(new Date(now.getTime() + 3000))}] Ready for gameplay
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </>
  );
}; 