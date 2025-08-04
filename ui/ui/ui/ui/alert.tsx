import React from 'react';

type AlertProps = {
  type?: 'info' | 'warning' | 'error' | 'success';
  children: React.ReactNode;
};

const colors = {
  info: '#2196F3',
  warning: '#FF9800',
  error: '#F44336',
  success: '#4CAF50',
};

const Alert: React.FC<AlertProps> = ({ type = 'info', children }) => {
  return (
    <div
      style={{
        padding: '12px 16px',
        borderRadius: 4,
        backgroundColor: colors[type],
        color: '#fff',
        marginBottom: 16,
      }}
    >
      {children}
    </div>
  );
};

export default Alert;
