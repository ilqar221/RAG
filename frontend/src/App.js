import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Main App Component
function App() {
  const [currentView, setCurrentView] = useState('chat');
  const [chatSessions, setChatSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      await loadChatSessions();
      await loadDocuments();
    } catch (error) {
      console.error('App initialization error:', error);
    }
  };

  const loadChatSessions = async () => {
    try {
      const response = await axios.get(`${API}/chat/sessions`);
      setChatSessions(response.data);
      if (response.data.length > 0 && !currentSession) {
        setCurrentSession(response.data[0]);
        await loadMessages(response.data[0].id);
      }
    } catch (error) {
      console.error('Error loading chat sessions:', error);
    }
  };

  const loadDocuments = async () => {
    try {
      const response = await axios.get(`${API}/documents`);
      setDocuments(response.data);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const loadMessages = async (sessionId) => {
    try {
      const response = await axios.get(`${API}/chat/${sessionId}/messages`);
      setMessages(response.data);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const createNewSession = async () => {
    try {
      const response = await axios.post(`${API}/chat/session`, null, {
        params: { session_name: `Chat ${new Date().toLocaleDateString()}` }
      });
      const newSession = response.data;
      setChatSessions(prev => [newSession, ...prev]);
      setCurrentSession(newSession);
      setMessages([]);
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const deleteSession = async (sessionId) => {
    try {
      // If deleting current session, switch to another one
      if (currentSession?.id === sessionId) {
        const remainingSessions = chatSessions.filter(s => s.id !== sessionId);
        if (remainingSessions.length > 0) {
          setCurrentSession(remainingSessions[0]);
          await loadMessages(remainingSessions[0].id);
        } else {
          setCurrentSession(null);
          setMessages([]);
        }
      }
      
      setChatSessions(prev => prev.filter(session => session.id !== sessionId));
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const uploadDocument = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      setUploadProgress(0);
      const response = await axios.post(`${API}/upload-document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        }
      });
      
      await loadDocuments();
      setUploadProgress(0);
      return response.data;
    } catch (error) {
      console.error('Upload error:', error);
      setUploadProgress(0);
      throw error;
    }
  };

  const deleteDocument = async (documentId) => {
    try {
      await axios.delete(`${API}/documents/${documentId}`);
      await loadDocuments();
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const sendQuery = async (query) => {
    if (!currentSession || !query.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch(`${API}/chat/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query,
          session_id: currentSession.id,
          max_sources: 5
        })
      });

      const reader = response.body.getReader();
      let assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        sources: [],
        confidence: 0,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              assistantMessage = {
                ...assistantMessage,
                content: data.content,
                sources: data.sources,
                confidence: data.confidence
              };

              setMessages(prev => 
                prev.map(msg => 
                  msg.id === assistantMessage.id ? assistantMessage : msg
                )
              );
            } catch (e) {
              console.error('Parse error:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Query error:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request.',
        sources: [],
        confidence: 0,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, var(--emerald-50) 0%, var(--bg-secondary) 50%, var(--emerald-100) 100%)' }}>
      {/* Modern Header with Glass Effect */}
      <header className="glass-card border-b" style={{ borderColor: 'var(--gray-200)' }}>
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition-all duration-200 focus-emerald"
              style={{ background: 'var(--bg-tertiary)' }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg" 
                   style={{ background: 'linear-gradient(135deg, var(--emerald-500), var(--emerald-600))' }}>
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ 
                  fontFamily: 'Poppins, sans-serif', 
                  color: 'var(--text-primary)',
                  background: 'linear-gradient(135deg, var(--emerald-600), var(--emerald-800))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  Smart Document Chat
                </h1>
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  AI-powered document analysis with multilingual support
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 rounded-2xl p-1.5 shadow-md" 
               style={{ background: 'var(--bg-tertiary)' }}>
            <button
              onClick={() => setCurrentView('chat')}
              className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 focus-emerald ${
                currentView === 'chat' 
                  ? 'shadow-md text-white button-hover-lift' 
                  : 'hover:shadow-sm'
              }`}
              style={{
                background: currentView === 'chat' 
                  ? 'linear-gradient(135deg, var(--emerald-500), var(--emerald-600))' 
                  : 'transparent',
                color: currentView === 'chat' ? '#ffffff' : 'var(--text-secondary)'
              }}
            >
              💬 Chat
            </button>
            <button
              onClick={() => setCurrentView('documents')}
              className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 focus-emerald ${
                currentView === 'documents' 
                  ? 'shadow-md text-white button-hover-lift' 
                  : 'hover:shadow-sm'
              }`}
              style={{
                background: currentView === 'documents' 
                  ? 'linear-gradient(135deg, var(--emerald-500), var(--emerald-600))' 
                  : 'transparent',
                color: currentView === 'documents' ? '#ffffff' : 'var(--text-secondary)'
              }}
            >
              📚 Library
            </button>
          </div>
        </div>
      </header>

      <div className="flex h-screen pt-20">
        {/* Enhanced Sidebar */}
        <div className={`transition-all duration-300 ${sidebarOpen ? 'w-80' : 'w-0'} overflow-hidden`}>
          <Sidebar
            currentView={currentView}
            setCurrentView={setCurrentView}
            chatSessions={chatSessions}
            currentSession={currentSession}
            setCurrentSession={setCurrentSession}
            createNewSession={createNewSession}
            deleteSession={deleteSession}
            loadMessages={loadMessages}
            documents={documents}
            uploadDocument={uploadDocument}
            deleteDocument={deleteDocument}
            uploadProgress={uploadProgress}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {currentView === 'chat' ? (
            <ChatInterface
              currentSession={currentSession}
              messages={messages}
              sendQuery={sendQuery}
              isLoading={isLoading}
            />
          ) : (
            <DocumentManager
              documents={documents}
              uploadDocument={uploadDocument}
              deleteDocument={deleteDocument}
              uploadProgress={uploadProgress}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Enhanced Sidebar Component
const Sidebar = ({ 
  currentView, setCurrentView, chatSessions, currentSession, 
  setCurrentSession, createNewSession, deleteSession, loadMessages, documents,
  uploadDocument, deleteDocument, uploadProgress 
}) => {
  const fileInputRef = useRef(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        await uploadDocument(file);
      } catch (error) {
        alert('Upload failed: ' + error.message);
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col glass-card" style={{ 
      borderColor: 'var(--gray-200)',
      borderRight: '1px solid var(--gray-200)'
    }}>
      {/* Chat Sessions */}
      {currentView === 'chat' && (
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <button
              onClick={createNewSession}
              className="w-full py-4 px-6 rounded-2xl font-semibold button-hover-lift focus-emerald shadow-md text-white animate-fade-in"
              style={{ 
                background: 'linear-gradient(135deg, var(--emerald-500), var(--emerald-600))',
                fontFamily: 'Poppins, sans-serif'
              }}
            >
              <div className="flex items-center justify-center space-x-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                <span>New Conversation</span>
              </div>
            </button>
          </div>

          <div className="px-6 pb-6">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4" 
                style={{ 
                  color: 'var(--text-tertiary)', 
                  fontFamily: 'Poppins, sans-serif',
                  fontSize: '11px',
                  letterSpacing: '1px'
                }}>
              Recent Conversations
            </h3>
            <div className="space-y-3">
              {chatSessions.map((session) => (
                <div
                  key={session.id}
                  className={`group relative p-4 rounded-2xl cursor-pointer transition-all duration-300 card ${
                    currentSession?.id === session.id
                      ? 'shadow-md' 
                      : 'hover:shadow-md'
                  }`}
                  style={{
                    background: currentSession?.id === session.id 
                      ? 'linear-gradient(135deg, var(--emerald-50), var(--emerald-100))' 
                      : 'var(--bg-primary)',
                    borderColor: currentSession?.id === session.id ? 'var(--emerald-200)' : 'var(--gray-200)'
                  }}
                >
                  <div onClick={() => {
                    setCurrentSession(session);
                    loadMessages(session.id);
                  }}>
                    <div className="font-semibold text-base truncate pr-10 mb-2" 
                         style={{ color: 'var(--text-primary)' }}>
                      {session.session_name}
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-xs px-2 py-1 rounded-full" 
                           style={{ 
                             background: 'var(--emerald-100)', 
                             color: 'var(--emerald-700)',
                             border: '1px solid var(--emerald-200)'
                           }}>
                        {new Date(session.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Delete this chat session? This action cannot be undone.')) {
                        deleteSession(session.id);
                      }
                    }}
                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 rounded-lg transition-all duration-200 hover:shadow-sm focus-emerald"
                    style={{ 
                      background: 'var(--bg-primary)',
                      color: 'var(--text-muted)'
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Document Upload Section */}
      {currentView === 'documents' && (
        <div className="p-6">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            ref={fileInputRef}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-4 px-6 rounded-2xl font-semibold button-hover-lift focus-emerald shadow-md text-white"
            style={{ 
              background: 'linear-gradient(135deg, var(--emerald-500), var(--emerald-600))',
              fontFamily: 'Poppins, sans-serif'
            }}
          >
            <div className="flex items-center justify-center space-x-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>Upload PDF Document</span>
            </div>
          </button>
          
          {uploadProgress > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-sm font-medium mb-2" 
                   style={{ color: 'var(--text-secondary)' }}>
                <span>Processing document...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full rounded-full h-3 shadow-inner" 
                   style={{ background: 'var(--gray-200)' }}>
                <div
                  className="progress-bar h-3 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Enhanced Stats Footer */}
      <div className="p-6 border-t" style={{ 
        borderColor: 'var(--gray-200)', 
        background: 'var(--bg-tertiary)' 
      }}>
        <div className="flex items-center justify-center space-x-6 text-sm">
          <div className="flex items-center space-x-2 px-3 py-2 rounded-xl" 
               style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
            <div className="w-2 h-2 rounded-full" style={{ background: 'var(--emerald-500)' }}></div>
            <span className="font-medium">{chatSessions.length} Chats</span>
          </div>
          <div className="flex items-center space-x-2 px-3 py-2 rounded-xl" 
               style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
            <div className="w-2 h-2 rounded-full" style={{ background: 'var(--emerald-600)' }}></div>
            <span className="font-medium">{documents.length} Documents</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced Chat Interface Component
const ChatInterface = ({ currentSession, messages, sendQuery, isLoading }) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputText.trim()) {
      sendQuery(inputText);
      setInputText('');
    }
  };

  if (!currentSession) {
    return (
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="text-center max-w-lg animate-fade-in">
          <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg animate-pulse" 
               style={{ background: 'linear-gradient(135deg, var(--emerald-500), var(--emerald-600))' }}>
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold mb-4" style={{ 
            fontFamily: 'Poppins, sans-serif',
            color: 'var(--text-primary)'
          }}>
            Welcome to Smart Document Chat
          </h2>
          <p className="text-lg mb-8 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Start a new conversation to unlock AI-powered insights from your documents
          </p>
          <div className="space-y-4 text-base">
            {[
              { icon: '🧠', text: 'Advanced AI document analysis' },
              { icon: '🔍', text: 'Intelligent source citations' }, 
              { icon: '🌍', text: 'Multilingual support (English + Azerbaijani)' }
            ].map((feature, index) => (
              <div key={index} className="flex items-center justify-center space-x-3 p-4 rounded-2xl card" 
                   style={{ background: 'var(--bg-primary)' }}>
                <span className="text-2xl">{feature.icon}</span>
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col" style={{ background: 'var(--bg-secondary)' }}>
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="text-center mt-16 animate-fade-in">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg" 
                 style={{ background: 'linear-gradient(135deg, var(--emerald-500), var(--emerald-600))' }}>
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-4" style={{ 
              fontFamily: 'Poppins, sans-serif',
              color: 'var(--text-primary)'
            }}>
              Ready to explore your documents!
            </h3>
            <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
              Ask me anything about the content in your uploaded PDFs
            </p>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isLoading && <LoadingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Enhanced Input Area */}
      <div className="border-t p-6 glass-card" style={{ borderColor: 'var(--gray-200)' }}>
        <form onSubmit={handleSubmit} className="flex space-x-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask a question about your documents..."
              className="input pr-12 text-base focus-emerald"
              disabled={isLoading}
              style={{
                background: 'var(--bg-primary)',
                borderColor: inputText.trim() ? 'var(--emerald-300)' : 'var(--gray-300)',
                color: 'var(--text-primary)'
              }}
            />
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2" 
                 style={{ color: 'var(--text-muted)' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
          </div>
          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="px-8 py-3 rounded-2xl font-semibold button-hover-lift focus-emerald shadow-md text-white disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ 
              background: isLoading || !inputText.trim() 
                ? 'var(--gray-400)' 
                : 'linear-gradient(135deg, var(--emerald-500), var(--emerald-600))',
              fontFamily: 'Poppins, sans-serif'
            }}
          >
            <div className="flex items-center space-x-3">
              {isLoading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
              <span>{isLoading ? 'Analyzing...' : 'Send'}</span>
            </div>
          </button>
        </form>
      </div>
    </div>
  );
};

// Enhanced Message Bubble Component
const MessageBubble = ({ message }) => {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end animate-slide-in">
        <div className="chat-bubble-user px-6 py-4 shadow-lg">
          <div className="text-base font-medium leading-relaxed">{message.content}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex space-x-4 animate-slide-in">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md" 
           style={{ background: 'linear-gradient(135deg, var(--emerald-400), var(--emerald-500))' }}>
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </div>
      <div className="flex-1">
        <div className="chat-bubble-ai p-6 shadow-sm">
          <div className="prose prose-lg max-w-none">
            <div className="whitespace-pre-wrap leading-relaxed text-base" 
                 style={{ color: 'var(--text-primary)', lineHeight: '1.7' }}>
              {message.content}
            </div>
          </div>
          
          {message.confidence > 0 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center space-x-3 text-sm">
                <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Confidence:
                </span>
                <div className="w-24 h-3 rounded-full overflow-hidden shadow-inner" 
                     style={{ background: 'var(--gray-200)' }}>
                  <div
                    className="h-3 rounded-full transition-all duration-700"
                    style={{ 
                      width: `${message.confidence * 100}%`,
                      background: `linear-gradient(90deg, 
                        ${message.confidence > 0.8 ? 'var(--emerald-400)' : 
                          message.confidence > 0.6 ? '#f59e0b' : '#ef4444'}, 
                        ${message.confidence > 0.8 ? 'var(--emerald-500)' : 
                          message.confidence > 0.6 ? '#d97706' : '#dc2626'})`
                    }}
                  ></div>
                </div>
                <span className="font-bold text-base" style={{ 
                  color: message.confidence > 0.8 ? 'var(--emerald-600)' : 
                         message.confidence > 0.6 ? '#d97706' : '#dc2626'
                }}>
                  {Math.round(message.confidence * 100)}%
                </span>
              </div>
            </div>
          )}

          {message.sources && message.sources.length > 0 && (
            <div className="mt-6 border-t pt-6" style={{ borderColor: 'var(--gray-200)' }}>
              <h4 className="text-base font-bold mb-4 flex items-center" 
                  style={{ color: 'var(--text-primary)', fontFamily: 'Poppins, sans-serif' }}>
                <svg className="w-5 h-5 mr-3" style={{ color: 'var(--emerald-500)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Sources ({message.sources.length})
              </h4>
              <div className="space-y-4">
                {message.sources.map((source, index) => (
                  <div key={index} className="source-citation p-4 hover:shadow-md">
                    <div className="flex items-start space-x-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" 
                           style={{ background: 'var(--emerald-100)', color: 'var(--emerald-600)' }}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                            Page {source.page_number}
                          </div>
                          <div className="flex items-center space-x-2 text-xs">
                            <span className="px-3 py-1.5 rounded-full font-medium border" 
                                  style={{ 
                                    background: 'var(--emerald-50)', 
                                    color: 'var(--emerald-700)',
                                    borderColor: 'var(--emerald-200)'
                                  }}>
                              {Math.round(source.similarity_score * 100)}% match
                            </span>
                            <span className="px-3 py-1.5 rounded-full font-medium uppercase border" 
                                  style={{ 
                                    background: 'var(--gray-100)', 
                                    color: 'var(--gray-700)',
                                    borderColor: 'var(--gray-300)'
                                  }}>
                              {source.language}
                            </span>
                          </div>
                        </div>
                        <div className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          {source.text}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Enhanced Loading Indicator Component
const LoadingIndicator = () => (
  <div className="flex space-x-4 animate-fade-in">
    <div className="w-12 h-12 rounded-2xl flex items-center justify-center animate-pulse shadow-md" 
         style={{ background: 'linear-gradient(135deg, var(--emerald-400), var(--emerald-500))' }}>
      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    </div>
    <div className="flex-1">
      <div className="chat-bubble-ai p-6 shadow-sm">
        <div className="flex space-x-4 items-center">
          <div className="flex space-x-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-3 h-3 rounded-full animate-bounce" 
                   style={{ 
                     background: 'var(--emerald-500)',
                     animationDelay: `${i * 0.15}s`
                   }}></div>
            ))}
          </div>
          <span className="text-base font-medium" style={{ color: 'var(--text-secondary)' }}>
            AI is analyzing your documents and generating response...
          </span>
        </div>
        <div className="mt-4 flex items-center space-x-3">
          <div className="w-8 h-1 rounded-full" style={{ background: 'var(--emerald-200)' }}>
            <div className="h-1 rounded-full animate-pulse" 
                 style={{ background: 'var(--emerald-500)', width: '60%' }}></div>
          </div>
          <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
            Processing...
          </span>
        </div>
      </div>
    </div>
  </div>
);

// Enhanced Document Manager Component
const DocumentManager = ({ documents, uploadDocument, deleteDocument, uploadProgress }) => {
  const fileInputRef = useRef(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        await uploadDocument(file);
      } catch (error) {
        alert('Upload failed: ' + error.message);
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': 
        return 'badge-success';
      case 'processing': 
        return 'badge-warning';
      case 'failed': 
        return 'badge-error';
      default: 
        return 'badge-success';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return '✅';
      case 'processing': return '⏳';
      case 'failed': return '❌';
      default: return '📄';
    }
  };

  return (
    <div className="flex-1 p-8" style={{ background: 'var(--bg-secondary)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-10 animate-fade-in">
          <h2 className="text-4xl font-bold mb-4" style={{ 
            fontFamily: 'Poppins, sans-serif',
            color: 'var(--text-primary)'
          }}>
            Document Library
          </h2>
          <p className="text-xl leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Upload and manage your PDF documents for AI-powered multilingual analysis
          </p>
        </div>

        {/* Enhanced Upload Section */}
        <div className="upload-zone rounded-3xl p-12 mb-12 text-center">
          <div className="max-w-lg mx-auto">
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg" 
                 style={{ background: 'linear-gradient(135deg, var(--emerald-500), var(--emerald-600))' }}>
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-3" style={{ 
              fontFamily: 'Poppins, sans-serif',
              color: 'var(--text-primary)'
            }}>
              Upload PDF Documents
            </h3>
            <p className="text-lg mb-8 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Drag and drop your files here, or click to browse your computer
            </p>
            
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              ref={fileInputRef}
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-10 py-4 rounded-2xl font-bold text-lg button-hover-lift focus-emerald shadow-lg text-white"
              style={{ 
                background: 'linear-gradient(135deg, var(--emerald-500), var(--emerald-600))',
                fontFamily: 'Poppins, sans-serif'
              }}
            >
              Choose Files to Upload
            </button>
            
            {uploadProgress > 0 && (
              <div className="mt-8">
                <div className="flex justify-between text-base font-semibold mb-3" 
                     style={{ color: 'var(--text-primary)' }}>
                  <span>Processing your document...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full rounded-2xl h-4 shadow-inner" 
                     style={{ background: 'var(--gray-200)' }}>
                  <div
                    className="progress-bar h-4 rounded-2xl transition-all duration-500"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm mt-3 font-medium" style={{ color: 'var(--text-tertiary)' }}>
                  Extracting text, detecting language, and creating embeddings...
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Documents Grid */}
        {documents.length > 0 ? (
          <div>
            <h3 className="text-2xl font-bold mb-6" style={{ 
              fontFamily: 'Poppins, sans-serif',
              color: 'var(--text-primary)'
            }}>
              Your Documents ({documents.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {documents.map((doc) => (
                <div key={doc.id} className="card p-6 animate-slide-in">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm" 
                           style={{ background: 'var(--emerald-100)' }}>
                        <span className="text-3xl">{getStatusIcon(doc.status)}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-lg mb-2 truncate" 
                            style={{ 
                              color: 'var(--text-primary)',
                              fontFamily: 'Poppins, sans-serif',
                              maxWidth: '160px'
                            }}>
                          {doc.filename}
                        </h4>
                        <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${getStatusColor(doc.status)}`}>
                          {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete "${doc.filename}"? This action cannot be undone.`)) {
                          deleteDocument(doc.id);
                        }
                      }}
                      className="p-2.5 rounded-xl transition-all duration-200 hover:shadow-md focus-emerald"
                      style={{ 
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-muted)'
                      }}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {[
                      { label: 'Pages', value: doc.page_count, icon: '📄' },
                      { label: 'Language', value: doc.language?.toUpperCase() || 'Unknown', icon: '🌍' },
                      { label: 'Text Chunks', value: doc.chunk_count || 0, icon: '🔤' },
                      { label: 'Uploaded', value: new Date(doc.uploaded_at).toLocaleDateString(), icon: '📅' }
                    ].map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-2 px-3 rounded-xl" 
                           style={{ background: 'var(--bg-tertiary)' }}>
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">{item.icon}</span>
                          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                            {item.label}
                          </span>
                        </div>
                        <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-20 animate-fade-in">
            <div className="w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg" 
                 style={{ background: 'var(--gray-100)' }}>
              <svg className="w-14 h-14" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-3xl font-bold mb-4" style={{ 
              fontFamily: 'Poppins, sans-serif',
              color: 'var(--text-primary)'
            }}>
              No documents uploaded yet
            </h3>
            <p className="text-lg mb-8 max-w-md mx-auto leading-relaxed" 
               style={{ color: 'var(--text-secondary)' }}>
              Upload your first PDF to get started with AI-powered multilingual document analysis
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-8 py-4 rounded-2xl font-bold text-lg button-hover-lift focus-emerald shadow-lg text-white"
              style={{ 
                background: 'linear-gradient(135deg, var(--emerald-500), var(--emerald-600))',
                fontFamily: 'Poppins, sans-serif'
              }}
            >
              Upload Your First Document
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;