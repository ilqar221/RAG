import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// Import Components
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import { ToastProvider, useToast } from './components/ToastProvider';

// Import Pages
import ChatInterface from './pages/ChatInterface';
import DocumentManager from './pages/DocumentManager';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

// Main App Content Component (to use toast hook)
function AppContent() {
  const [currentView, setCurrentView] = useState('chat');
  const [chatSessions, setChatSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Use toast hook
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      await loadChatSessions();
      await loadDocuments();
    } catch (error) {
      console.error('Error initializing app:', error);
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
      setCurrentView('chat');
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const deleteSession = async (sessionId) => {
    try {
      // Call backend API to delete session
      await axios.delete(`${API}/chat/session/${sessionId}`);
      
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
      
      // Update local state
      setChatSessions(prev => prev.filter(session => session.id !== sessionId));
      
      // Show success toast
      showSuccess('Conversation deleted successfully');
    } catch (error) {
      console.error('Error deleting session:', error);
      // Show error toast
      showError('Failed to delete conversation. Please try again.');
      throw error;
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
      {/* Header */}
      <Header 
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        currentView={currentView}
        setCurrentView={setCurrentView}
      />

      <div className="flex h-screen pt-16">
        {/* Sidebar - Hidden for documents view */}
        {currentView === 'chat' && (
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
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
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

// Main App Component with Toast Provider
function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

export default App;