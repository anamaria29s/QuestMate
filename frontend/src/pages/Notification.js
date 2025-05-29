import React, { useState, useEffect } from 'react';
import './Notification.css';

const NotificationSystem = ({ notifications, removeNotification }) => {
  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          notification={notification}
          removeNotification={removeNotification}
        />
      ))}
    </div>
  );
};

const Notification = ({ notification, removeNotification }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      removeNotification(notification.id);
    }, 5000); 

    return () => clearTimeout(timer);
  }, [notification.id, removeNotification]);

  return (
    <div className={`notification ${notification.type}`}>
      <div className="notification-icon">
        {notification.type === 'achievement' && '🏆'}
        {notification.type === 'info' && 'ℹ️'}
        {notification.type === 'success' && '✅'}
      </div>
      <div className="notification-content">
        <h4>{notification.title}</h4>
        <p>{notification.message}</p>
      </div>
      <button 
        className="notification-close" 
        onClick={() => removeNotification(notification.id)}
      >
        ×
      </button>
    </div>
  );
};

export default NotificationSystem;