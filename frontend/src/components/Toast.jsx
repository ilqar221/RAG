import React, { useState, useEffect } from 'react';

const Toast = ({ message, type = 'success', duration = 1500, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // Start with slide-in animation
    const slideInTimer = setTimeout(() => {
      setIsVisible(true);
    }, 50);

    // Start progress bar animation
    const progressTimer = setTimeout(() => {
      setProgress(0);
    }, 100);

    // Start exit animation
    const exitTimer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(() => {
        onClose();
      }, 300);
    }, duration);

    return () => {
      clearTimeout(slideInTimer);
      clearTimeout(progressTimer);
      clearTimeout(exitTimer);
    };
  }, [duration, onClose]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const getToastStyles = () => {
    const baseStyles = "fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-xl flex flex-col min-w-64 max-w-sm transition-all duration-300 ease-out";
    
    let positionClass = "";
    if (!isVisible) {
      positionClass = "transform translate-x-full opacity-0";
    } else if (isLeaving) {
      positionClass = "transform translate-x-full opacity-0";
    } else {
      positionClass = "transform translate-x-0 opacity-100";
    }

    let colorClass = "";
    switch (type) {
      case 'success':
        colorClass = "bg-green-600 text-white";
        break;
      case 'error':
        colorClass = "bg-red-600 text-white";
        break;
      case 'warning':
        colorClass = "bg-yellow-600 text-white";
        break;
      case 'info':
        colorClass = "bg-blue-600 text-white";
        break;
      default:
        colorClass = "bg-gray-600 text-white";
    }

    return `${baseStyles} ${positionClass} ${colorClass}`;
  };

  const getProgressBarColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-800';
      case 'error':
        return 'bg-red-800';
      case 'warning':
        return 'bg-yellow-800';
      case 'info':
        return 'bg-blue-800';
      default:
        return 'bg-gray-800';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={getToastStyles()}>
      {/* Main Content */}
      <div className="flex items-center space-x-2">
        {getIcon()}
        <span className="font-medium text-sm flex-1">{message}</span>
        <button
          onClick={handleClose}
          className="ml-auto flex-shrink-0 text-white hover:text-gray-200 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Progress Bar */}
      <div className="mt-2 w-full bg-black bg-opacity-20 rounded-full h-1">
        <div 
          className={`h-1 rounded-full transition-all ease-linear ${getProgressBarColor()}`}
          style={{ 
            width: `${progress}%`,
            transitionDuration: `${duration}ms`
          }}
        />
      </div>
    </div>
  );
};

export default Toast;
