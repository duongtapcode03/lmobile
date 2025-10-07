import React from 'react';
import './Loading.scss';

interface LoadingProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'spin' | 'bounce' | 'pulse';
  color?: string;
  text?: string;
  overlay?: boolean;
  className?: string;
}

const Loading: React.FC<LoadingProps> = ({
  size = 'medium',
  variant = 'spin',
  color = '#22c55e',
  text,
  overlay = false,
  className = ''
}) => {
  const sizeClasses = {
    small: 'loading-small',
    medium: 'loading-medium',
    large: 'loading-large'
  };

  const variantClasses = {
    spin: '',
    bounce: 'loading-bounce',
    pulse: 'loading-pulse'
  };

  const loadingContent = (
    <div className={`loading-container ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}>
      <div className="loading-spinner">
        <div className="loading-dot" style={{ backgroundColor: color }}></div>
        <div className="loading-dot" style={{ backgroundColor: color }}></div>
        <div className="loading-dot" style={{ backgroundColor: color }}></div>
        <div className="loading-dot" style={{ backgroundColor: color }}></div>
      </div>
      {text && (
        <div className="loading-text" style={{ color }}>
          {text}
        </div>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="loading-overlay">
        {loadingContent}
      </div>
    );
  }

  return loadingContent;
};

export default Loading;
