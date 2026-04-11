import { useState, useEffect } from 'react';
import { api } from './api';

interface UserProfile {
  id: number;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'user';
  auth_provider: 'local' | 'google' | 'both';
}

export function useUser() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await api.get<UserProfile>('/auth/me');
        setUser(data);
      } catch (err) {
        if (err instanceof Error && err.message === 'AUTH_EXPIRED') return;
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, []);

  return { user, isLoading };
}
