'use client';

/**
 * Use Auth Hook
 * 
 * Simplified hook for accessing authentication context.
 * 
 * @author MiniMax Agent
 * @version 1.0
 */

import { useContext } from 'react';
import { AuthContext } from '@/contexts/auth-context';

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

export default useAuth;