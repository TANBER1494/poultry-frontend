import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { io } from 'socket.io-client';

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : 'http://localhost:5000';

const STORAGE_KEYS = {
  TOKEN: 'poultry_access_token',
  REFRESH_TOKEN: 'poultry_refresh_token',
  USER: 'poultry_user'
};

export const AuthProvider = ({ children }) => {
  // Read from localStorage first, fallback to sessionStorage
  const [token, setToken] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.TOKEN) || sessionStorage.getItem(STORAGE_KEYS.TOKEN)
  );
  const [refreshToken, setRefreshToken] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) || sessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
  );
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem(STORAGE_KEYS.USER) || sessionStorage.getItem(STORAGE_KEYS.USER);
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const [socket, setSocket] = useState(null);
  const loading = false; 

  useEffect(() => {
    let newSocket;
    
    if (user && token) {
      newSocket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      newSocket.on('connect', () => {
        console.log('Socket connected successfully');
        if (user.role === 'SUPER_ADMIN') {
          newSocket.emit('joinRoom', 'SUPER_ADMIN_ROOM');
        } else if (user.role === 'OWNER') {
          newSocket.emit('joinRoom', user.organization_id);
        } else if (user.role === 'SUPERVISOR') {
          newSocket.emit('joinRoom', user.id || user._id); 
        }
        setSocket(newSocket);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection failed:', error.message);
      });
    }

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [user, token]);

  // Updated login function to accept rememberMe boolean
  const login = useCallback((userData, accessToken, incomingRefreshToken, rememberMe = false) => {
    const storage = rememberMe ? localStorage : sessionStorage;
    
    // Clear the opposite storage to prevent conflicts
    if (rememberMe) {
      sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
      sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      sessionStorage.removeItem(STORAGE_KEYS.USER);
    } else {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
    }

    storage.setItem(STORAGE_KEYS.TOKEN, accessToken);
    storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, incomingRefreshToken);
    storage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
    
    setToken(accessToken);
    setRefreshToken(incomingRefreshToken);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    // Clear both storages on logout
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    
    sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.USER);
    
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  }, [socket]);

  const contextValue = {
    token,
    refreshToken,
    user,
    loading,
    socket,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={contextValue}>
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