import React, { useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { NetworkProvider, useNetwork } from './contexts/NetworkContext';
import Games from './pages/Games';
import Game from './pages/Game';

// Import wallet adapter CSS
require('@solana/wallet-adapter-react-ui/styles.css');

const AppContent: React.FC = () => {
  const { network, rpcUrls } = useNetwork();
  const endpoint = useMemo(() => rpcUrls[network], [network, rpcUrls]);
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Games />} />
              <Route path="/game/:gameId" element={<Game />} />
            </Routes>
          </Router>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

const App: React.FC = () => {
  return (
    <NetworkProvider>
      <AppContent />
    </NetworkProvider>
  );
};

export default App; 