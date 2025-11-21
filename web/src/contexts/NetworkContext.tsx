import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Network = 'localnet' | 'devnet' | 'mainnet';

interface NetworkContextType {
  network: Network;
  setNetwork: (network: Network) => void;
  rpcUrls: {
    localnet: string;
    devnet: string;
    mainnet: string;
  };
  setRpcUrl: (network: Network, url: string) => void;
  setRpcUrls: (urls: { localnet: string; devnet: string; mainnet: string }) => void;
  getCurrentRpcUrl: () => string;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

const DEFAULT_RPC_URLS = {
  localnet: 'http://127.0.0.1:8899',
  devnet: 'https://api.devnet.solana.com',
  mainnet: 'https://api.mainnet-beta.solana.com',
};

export const NetworkProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [network, setNetworkState] = useState<Network>(() => {
    const saved = localStorage.getItem('solana-network');
    return (saved as Network) || 'devnet';
  });

  const [rpcUrls, setRpcUrlsState] = useState(() => {
    const saved = localStorage.getItem('solana-rpc-urls');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          localnet: parsed.localnet || DEFAULT_RPC_URLS.localnet,
          devnet: parsed.devnet || DEFAULT_RPC_URLS.devnet,
          mainnet: parsed.mainnet || DEFAULT_RPC_URLS.mainnet,
        };
      } catch {
        return DEFAULT_RPC_URLS;
      }
    }
    return DEFAULT_RPC_URLS;
  });

  const setNetwork = (newNetwork: Network) => {
    setNetworkState(newNetwork);
    localStorage.setItem('solana-network', newNetwork);
    // Reload the page to apply the new network
    window.location.reload();
  };

  const setRpcUrl = (net: Network, url: string) => {
    const newRpcUrls = { ...rpcUrls, [net]: url };
    setRpcUrlsState(newRpcUrls);
    localStorage.setItem('solana-rpc-urls', JSON.stringify(newRpcUrls));
  };

  const setRpcUrls = (urls: { localnet: string; devnet: string; mainnet: string }) => {
    setRpcUrlsState(urls);
    localStorage.setItem('solana-rpc-urls', JSON.stringify(urls));
  };

  const getCurrentRpcUrl = () => {
    return rpcUrls[network];
  };

  return (
    <NetworkContext.Provider
      value={{
        network,
        setNetwork,
        rpcUrls,
        setRpcUrl,
        setRpcUrls,
        getCurrentRpcUrl,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};

