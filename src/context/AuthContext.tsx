import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserAccount, UserRole } from '../types/database';

interface AuthContextType {
  currentUser: UserAccount;
  role: UserRole;
  switchRole: (role: UserRole) => void;
  favorites: string[];
  toggleFavorite: (channelId: string) => void;
  isFavorite: (channelId: string) => boolean;
  isSmartTVMode: boolean;
  toggleSmartTVMode: () => void;
}

const DEFAULT_ADMIN: UserAccount = {
  id: 'usr-admin-1',
  email: 'admin@playbeat.live',
  name: 'Executive Super Admin',
  role: 'SUPER_ADMIN',
  favorites: ['ch-sky-me-4k', 'ch-ptv-sports-hd', 'ch-hbo-east-4k'],
  watchHistory: [],
  devices: [
    { id: 'dev-1', name: 'Samsung 4K QLED Living Room', type: 'Smart TV', lastActive: 'Just now' },
    { id: 'dev-2', name: 'MacBook Pro Admin Workstation', type: 'Desktop', lastActive: 'Just now' },
  ],
  subscriptionTier: 'ENTERPRISE_VIP',
};

const DEFAULT_CUSTOMER: UserAccount = {
  id: 'usr-client-1',
  email: 'viewer@playbeat.live',
  name: 'VIP Viewer Client',
  role: 'CUSTOMER',
  favorites: ['ch-sky-me-4k', 'ch-hbo-east-4k'],
  watchHistory: [],
  devices: [
    { id: 'dev-3', name: 'Apple TV 4K Bedroom', type: 'Smart TV', lastActive: 'Just now' },
  ],
  subscriptionTier: 'PREMIUM_4K',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>('CUSTOMER');
  const [favorites, setFavorites] = useState<string[]>(['ch-sky-me-4k', 'ch-ptv-sports-hd', 'ch-hbo-east-4k']);
  const [isSmartTVMode, setIsSmartTVMode] = useState<boolean>(false);

  const currentUser = role === 'SUPER_ADMIN' ? DEFAULT_ADMIN : DEFAULT_CUSTOMER;

  const switchRole = (newRole: UserRole) => {
    setRole(newRole);
  };

  const toggleFavorite = (channelId: string) => {
    setFavorites((prev) =>
      prev.includes(channelId) ? prev.filter((id) => id !== channelId) : [...prev, channelId]
    );
  };

  const isFavorite = (channelId: string) => favorites.includes(channelId);

  const toggleSmartTVMode = () => setIsSmartTVMode((prev) => !prev);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role,
        switchRole,
        favorites,
        toggleFavorite,
        isFavorite,
        isSmartTVMode,
        toggleSmartTVMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
