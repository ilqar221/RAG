import React, { useState } from 'react';

const MessageBubble = ({ message }) => {
  const [expandedSources, setExpandedSources] = useState(false);

  const toggleSources = () => {
    setExpandedSources(prev => !prev);
  };
  if (message.role === 'user') {
    return (
      <div className="flex justify-end mb-6">
        <div className="max-w-3xl">
          <div className="flex items-start space-x-3">
            <div className="flex-1">
              <div className="bg-gray-100 rounded-3xl px-4 py-3">
                <div className="text-gray-900 whitespace-pre-wrap break-words">
                  {message.content}
                </div>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-medium">U</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex mb-6">
      <div className="max-w-3xl">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-gray-900 whitespace-pre-wrap break-words leading-relaxed">
              {message.content}
            </div>
            
            {/* Confidence indicator */}
            {message.confidence > 0 && (
              <div className="mt-4 flex items-center space-x-2 text-sm text-gray-500">
                <span>Confidence:</span>
                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${message.confidence * 100}%`,
                      backgroundColor: message.confidence > 0.8 ? '#10b981' : 
                                     message.confidence > 0.6 ? '#f59e0b' : '#ef4444'
                    }}
                  ></div>
                </div>
                <span className="font-medium">
                  {Math.round(message.confidence * 100)}%
                </span>
              </div>
            )}

            {/* Sources */}
            {message.sources && message.sources.length > 0 && (
              <div className="mt-4 border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-700 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Sources ({message.sources.length})
                  </h4>
                  <button
                    onClick={toggleSources}
                    className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 transition-colors px-2 py-1 rounded hover:bg-blue-50"
                  >
                    <svg className={`w-3 h-3 transition-transform ${expandedSources ? 'rotate-180' : ''}`} 
                         fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    <span>{expandedSources ? 'Hide' : 'Show'} Details</span>
                  </button>
                </div>
                
                {expandedSources && (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {message.sources.map((source, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex items-start space-x-3">
                          <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700">
                                Page {source.page_number}
                              </span>
                              <div className="flex items-center space-x-2 text-xs">
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">
                                  {Math.round(source.similarity_score * 100)}% match
                                </span>
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full uppercase">
                                  {source.language}
                                </span>
                              </div>
                            </div>
                            <div className="text-sm text-gray-600 leading-relaxed">
                              {source.text}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {!expandedSources && (
                  <div className="text-xs text-gray-500 mt-2">
                    Click "Show Details" to view {message.sources.length} source{message.sources.length > 1 ? 's' : ''} from your documents
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
