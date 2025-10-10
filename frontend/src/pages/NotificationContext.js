import React, { createContext, useState, useContext, useEffect } from 'react';
import Notification from './Notification';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (notification) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { ...notification, id }]);
  };

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Clear all notifications after 3 seconds when notifications array changes
  useEffect(() => {
    if (notifications.length > 0) {
      const timer = setTimeout(() => {
        clearAllNotifications();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [notifications.length]);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, clearAllNotifications }}>
      {children}
      <Notification notifications={notifications} removeNotification={removeNotification} />
    </NotificationContext.Provider>
  );
};