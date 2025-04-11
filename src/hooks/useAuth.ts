// src/hooks/useAuth.ts
import { useEffect, useState } from 'react';

export function useAuth() {
  const [authenticated, setAuthenticated] = useState(false);
  const [userType, setUserType] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    //localStorage.setItem("token", "fake-token");
    //localStorage.setItem("userType", "freelancer"); // ou "agency", "supermarket", "admin"

    const type = localStorage.getItem('userType'); // exemplo: "supermarket", "agency" etc.
    setAuthenticated(!!token);
    setUserType(type);
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    setAuthenticated(false);
    setUserType(null);
    window.location.href = '/';
  };

  return { authenticated, userType, logout };
}
