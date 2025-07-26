import React, { useState, useEffect, useRef } from 'react';
import MessageBubble from '../components/MessageBubble';
import LoadingIndicator from '../components/LoadingIndicator';

const ChatInterface = ({ currentSession, messages, sendQuery, isLoading }) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      const scrollElement = messagesEndRef.current.closest('.overflow-y-auto');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages, isLoading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputText.trim()) {
      sendQuery(inputText);
      setInputText('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!currentSession) {
    return (
      <div className="flex-1 flex items-center justify-center px-4" style={{ background: '#f8fafc', height: 'calc(100vh - 64px)' }}>
        <div className="text-center max-w-2xl mx-auto w-full">
          <div className="w-16 sm:w-20 h-16 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8" 
               style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
            <svg className="w-8 sm:w-10 h-8 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-gray-900">
            What can I help with?
          </h2>
          <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8">
            Ask AI anything
          </p>
          
          {/* Example queries */}
          <div className="space-y-3 max-w-md mx-auto">
            <div className="text-sm text-gray-500 mb-4">Examples of queries:</div>
            {[
              'Explain quantum entanglement simply',
              'Generate a creative app name for task management',
              'Translate "Better late than never" into Latin',
              'Write a short riddle with the answer "time"'
            ].map((example, index) => (
              <button
                key={index}
                onClick={() => setInputText(example)}
                className="block w-full text-left p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 text-sm text-gray-700"
              >
                {example} →
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col" style={{ background: '#f8fafc', height: 'calc(100vh - 64px)' }}>
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full flex flex-col">
          <div className="flex-1 px-4 py-6">
            <div className="max-w-4xl mx-auto">
              {messages.length === 0 && (
                <div className="text-center py-20">
                  <div className="w-12 sm:w-16 h-12 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6" 
                       style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
                    <svg className="w-6 sm:w-8 h-6 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold mb-4 text-gray-900">
                    Hi, there 👋
                  </h3>
                  <p className="text-base sm:text-lg text-gray-600">
                    Tell me what I need to do or ask me next
                  </p>
                </div>
              )}

              {messages.length > 0 && (
                <div className="space-y-6 pb-6">
                  {messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                  {isLoading && <LoadingIndicator />}
                </div>
              )}
            </div>
          </div>
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-end space-x-3">
              <div className="flex-1 relative">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask AI anything"
                  rows={1}
                  className="w-full resize-none rounded-2xl border border-gray-300 px-4 py-3 pr-20 sm:pr-16 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-base"
                  style={{ 
                    minHeight: '48px',
                    maxHeight: '200px',
                    overflowY: 'auto'
                  }}
                  disabled={isLoading}
                />
                
                {/* Voice and Attachment buttons */}
                <div className="absolute right-3 bottom-3 flex items-center space-x-2">
                  <button
                    type="button"
                    className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors hidden sm:block"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors hidden sm:block"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={isLoading || !inputText.trim()}
                className="w-12 h-12 rounded-full flex items-center justify-center text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                style={{ 
                  background: isLoading || !inputText.trim() 
                    ? '#9ca3af' 
                    : 'linear-gradient(135deg, #3b82f6, #1d4ed8)' 
                }}
              >
                {isLoading ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
          </form>
          
          {/* Footer text */}
          <div className="text-center mt-3">
            <p className="text-xs text-gray-500">
              RaFig can make mistakes. Check important info.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
