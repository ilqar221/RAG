import React from 'react';

const LoadingIndicator = () => (
  <div className="flex mb-6">
    <div className="max-w-3xl">
      <div className="flex items-start space-x-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              {[0, 1, 2].map((i) => (
                <div 
                  key={i} 
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                ></div>
              ))}
            </div>
            <span className="text-sm text-gray-500 ml-2">
              Thinking...
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default LoadingIndicator;
