import React, { useEffect, useState } from 'react';
import { checkAuth } from './AuthService';

const AuthCheck = ({ children }) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const verifyAuth = async () => {
      const authStatus = await checkAuth();
      setIsAuthenticated(authStatus);
      setIsChecking(false);
      
      if (!authStatus) {
        window.location.href = '/login';
      }
    };

    verifyAuth();
  }, []);

  if (isChecking) {
    return <div className="auth-loading">Checking authentication...</div>;
  }

  return isAuthenticated ? children : null;
};

export default AuthCheck;