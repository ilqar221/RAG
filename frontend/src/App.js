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
        params: { session_name: `Chat ${chatSessions.length + 1}` }
      });
      const newSession = response.data;
      setChatSessions(prev => [newSession, ...prev]);
      setCurrentSession(newSession);
      setMessages([]);
    } catch (error) {
      console.error('Error creating session:', error);
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        chatSessions={chatSessions}
        currentSession={currentSession}
        setCurrentSession={setCurrentSession}
        createNewSession={createNewSession}
        loadMessages={loadMessages}
        documents={documents}
        uploadDocument={uploadDocument}
        deleteDocument={deleteDocument}
        uploadProgress={uploadProgress}
      />

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
  );
}

// Sidebar Component
const Sidebar = ({ 
  currentView, setCurrentView, chatSessions, currentSession, 
  setCurrentSession, createNewSession, loadMessages, documents,
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
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold text-gray-800">RAG System</h1>
        <p className="text-sm text-gray-600 mt-1">Advanced PDF Chat</p>
      </div>

      {/* Navigation */}
      <div className="flex border-b">
        <button
          onClick={() => setCurrentView('chat')}
          className={`flex-1 py-2 px-4 text-sm font-medium ${
            currentView === 'chat' 
              ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Chat
        </button>
        <button
          onClick={() => setCurrentView('documents')}
          className={`flex-1 py-2 px-4 text-sm font-medium ${
            currentView === 'documents' 
              ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Documents
        </button>
      </div>

      {/* Chat Sessions */}
      {currentView === 'chat' && (
        <div className="flex-1 overflow-y-auto">
          <div className="p-3">
            <button
              onClick={createNewSession}
              className="w-full bg-blue-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              + New Chat
            </button>
          </div>

          <div className="px-3 pb-3">
            {chatSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => {
                  setCurrentSession(session);
                  loadMessages(session.id);
                }}
                className={`p-3 rounded-lg cursor-pointer mb-2 transition-colors ${
                  currentSession?.id === session.id
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="font-medium text-gray-900 text-sm truncate">
                  {session.session_name}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(session.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document Quick Actions */}
      {currentView === 'documents' && (
        <div className="p-3">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            ref={fileInputRef}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-green-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            📄 Upload PDF
          </button>
          {uploadProgress > 0 && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-600 mt-1">{uploadProgress}%</div>
            </div>
          )}
        </div>
      )}

      {/* Document Stats */}
      <div className="p-3 border-t bg-gray-50">
        <div className="text-xs text-gray-600">
          📚 {documents.length} documents
        </div>
      </div>
    </div>
  );
};

// Chat Interface Component
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
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Chat Session</h2>
          <p className="text-gray-500">Create a new chat session to start asking questions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-800">{currentSession.session_name}</h2>
        <p className="text-sm text-gray-600">Ask questions about your uploaded documents</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {messages.length === 0 && (
          <div className="text-center mt-10">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">Ready to help!</h3>
            <p className="text-gray-500">Upload some PDF documents and start asking questions</p>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isLoading && <LoadingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t px-6 py-4">
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask a question about your documents..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

// Message Bubble Component
const MessageBubble = ({ message }) => {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-3xl bg-blue-600 text-white rounded-lg px-4 py-2">
          <div className="text-sm">{message.content}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex space-x-3">
      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
        <span className="text-green-600 text-sm">🤖</span>
      </div>
      <div className="flex-1">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap">{message.content}</div>
          </div>
          
          {message.confidence > 0 && (
            <div className="mt-3 flex items-center text-sm text-gray-500">
              <span>Confidence: </span>
              <div className="ml-2 w-16 h-2 bg-gray-200 rounded-full">
                <div
                  className="h-2 bg-green-500 rounded-full"
                  style={{ width: `${message.confidence * 100}%` }}
                ></div>
              </div>
              <span className="ml-2">{Math.round(message.confidence * 100)}%</span>
            </div>
          )}

          {message.sources && message.sources.length > 0 && (
            <div className="mt-4 border-t pt-3">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Sources:</h4>
              <div className="space-y-2">
                {message.sources.map((source, index) => (
                  <div key={index} className="flex items-start space-x-2 p-2 bg-gray-50 rounded text-xs">
                    <span className="text-blue-600 font-medium">📄</span>
                    <div className="flex-1">
                      <div className="text-gray-800">Page {source.page_number}</div>
                      <div className="text-gray-600 mt-1">{source.text}</div>
                      <div className="text-gray-500 mt-1">
                        Similarity: {Math.round(source.similarity_score * 100)}% | Lang: {source.language}
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

// Loading Indicator Component
const LoadingIndicator = () => (
  <div className="flex space-x-3">
    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
      <span className="text-green-600 text-sm">🤖</span>
    </div>
    <div className="flex-1">
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex space-x-2 items-center">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <span className="text-gray-500 text-sm ml-2">Thinking...</span>
        </div>
      </div>
    </div>
  </div>
);

// Document Manager Component
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
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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
    <div className="flex-1 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Document Library</h2>
        <p className="text-gray-600">Manage your uploaded PDF documents</p>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-lg border border-dashed border-gray-300 p-8 mb-6 text-center">
        <div className="text-4xl mb-4">📚</div>
        <h3 className="text-lg font-medium text-gray-700 mb-2">Upload PDF Documents</h3>
        <p className="text-gray-500 mb-4">Support for multilingual documents (English, Azerbaijani)</p>
        
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileUpload}
          ref={fileInputRef}
          className="hidden"
        />
        
        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Choose PDF File
        </button>
        
        {uploadProgress > 0 && (
          <div className="mt-4 max-w-xs mx-auto">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <div className="text-sm text-gray-600 mt-2">Uploading... {uploadProgress}%</div>
          </div>
        )}
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map((doc) => (
          <div key={doc.id} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{getStatusIcon(doc.status)}</span>
                <div>
                  <h3 className="font-medium text-gray-900 text-sm truncate">{doc.filename}</h3>
                  <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                    {doc.status}
                  </div>
                </div>
              </div>
              <button
                onClick={() => deleteDocument(doc.id)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                🗑️
              </button>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Pages:</span>
                <span>{doc.page_count}</span>
              </div>
              <div className="flex justify-between">
                <span>Language:</span>
                <span className="uppercase">{doc.language}</span>
              </div>
              <div className="flex justify-between">
                <span>Chunks:</span>
                <span>{doc.chunk_count || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Uploaded:</span>
                <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {documents.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📂</div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">No documents uploaded</h3>
          <p className="text-gray-500">Upload your first PDF to get started</p>
        </div>
      )}
    </div>
  );
};

export default App;