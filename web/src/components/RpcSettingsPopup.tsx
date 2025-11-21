import React, { useState, useEffect } from 'react';
import { useNetwork } from '../contexts/NetworkContext';

interface RpcSettingsPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RpcSettingsPopup: React.FC<RpcSettingsPopupProps> = ({ isOpen, onClose }) => {
  const { rpcUrls, setRpcUrls } = useNetwork();
  const [localUrls, setLocalUrls] = useState({
    localnet: rpcUrls.localnet,
    devnet: rpcUrls.devnet,
    mainnet: rpcUrls.mainnet,
  });

  useEffect(() => {
    if (isOpen) {
      setLocalUrls({
        localnet: rpcUrls.localnet,
        devnet: rpcUrls.devnet,
        mainnet: rpcUrls.mainnet,
      });
    }
  }, [isOpen, rpcUrls]);

  const handleSave = () => {
    // Save all RPC URLs to localStorage at once
    setRpcUrls({
      localnet: localUrls.localnet,
      devnet: localUrls.devnet,
      mainnet: localUrls.mainnet,
    });
    onClose();
    // Reload the page to apply the new RPC URLs
    window.location.reload();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: '8px',
          padding: '24px',
          minWidth: '500px',
          maxWidth: '600px',
          color: '#ffffff',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            margin: '0 0 20px 0',
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#ffffff',
          }}
        >
          RPC Settings
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                color: '#cccccc',
              }}
            >
              Localnet Url:
            </label>
            <input
              type="text"
              value={localUrls.localnet}
              onChange={(e) =>
                setLocalUrls({ ...localUrls, localnet: e.target.value })
              }
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: '#0a0a0a',
                border: '1px solid #333',
                borderRadius: '4px',
                color: '#ffffff',
                fontSize: '14px',
                fontFamily: 'monospace',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                color: '#cccccc',
              }}
            >
              Devnet Url:
            </label>
            <input
              type="text"
              value={localUrls.devnet}
              onChange={(e) =>
                setLocalUrls({ ...localUrls, devnet: e.target.value })
              }
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: '#0a0a0a',
                border: '1px solid #333',
                borderRadius: '4px',
                color: '#ffffff',
                fontSize: '14px',
                fontFamily: 'monospace',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                color: '#cccccc',
              }}
            >
              Mainnet Url:
            </label>
            <input
              type="text"
              value={localUrls.mainnet}
              onChange={(e) =>
                setLocalUrls({ ...localUrls, mainnet: e.target.value })
              }
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: '#0a0a0a',
                border: '1px solid #333',
                borderRadius: '4px',
                color: '#ffffff',
                fontSize: '14px',
                fontFamily: 'monospace',
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            marginTop: '24px',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#333',
              border: '1px solid #555',
              borderRadius: '4px',
              color: '#ffffff',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#333';
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f97316',
              border: 'none',
              borderRadius: '4px',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#ea580c';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f97316';
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

