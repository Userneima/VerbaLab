import React, { createContext, useContext } from 'react';
import { useAppStore, AppStore } from './useStore';
import { useAuth } from './AuthContext';

const StoreContext = createContext<AppStore | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { getAccessToken } = useAuth();
  const store = useAppStore(getAccessToken());
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): AppStore {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}