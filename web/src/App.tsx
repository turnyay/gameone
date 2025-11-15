import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import Games from './pages/Games';
import Game from './pages/Game';

// Import wallet adapter CSS
require('@solana/wallet-adapter-react-ui/styles.css');

const App: React.FC = () => {
  // Set up Solana network
  const endpoint = 'http://127.0.0.1:8899';
  const wallets = [new PhantomWalletAdapter()];

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <Router>
            <Routes>
              <Route path="/games" element={<Games />} />
              <Route path="/game/:gameId" element={<Game />} />
              <Route path="/" element={<Navigate to="/games" replace />} />
            </Routes>
          </Router>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default App; 