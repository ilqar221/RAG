import React, { useRef, useState } from 'react';

const DocumentManager = ({ documents, uploadDocument, deleteDocument, uploadProgress }) => {
  const fileInputRef = useRef(null);
  const [expandedSources, setExpandedSources] = useState({});

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    try {
      for (const file of files) {
        if (file.type === 'application/pdf') {
          await uploadDocument(file);
        }
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Upload failed: ' + error.message);
    }
    
    // Reset the input
    event.target.value = '';
  };

  const toggleSources = (docId) => {
    setExpandedSources(prev => ({
      ...prev,
      [docId]: !prev[docId]
    }));
  };

  return (
    <div className="flex-1 flex flex-col" style={{ background: '#f8fafc', height: 'calc(100vh - 64px)' }}>
      {/* Header */}

      {/* Main Content Area - Split Layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 p-4 sm:p-6 lg:p-8">
        
        {/* Left Side - Upload Area */}
        <div className="lg:w-1/3 flex flex-col">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 h-full">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Documents</h2>
            
            {/* Upload Zone */}
            <div 
              className="border-2 border-dashed border-blue-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 transition-colors mb-6"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center"
                   style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              
              <h3 className="text-base font-medium text-gray-900 mb-2">Upload PDF Files</h3>
              <p className="text-sm text-gray-600 mb-4">
                Drag & drop or click to browse
              </p>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="inline-flex items-center px-4 py-2 text-white font-medium text-sm rounded-lg transition-colors duration-200"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}
                onMouseEnter={(e) => e.target.style.background = 'linear-gradient(135deg, #2563eb, #1e40af)'}
                onMouseLeave={(e) => e.target.style.background = 'linear-gradient(135deg, #3b82f6, #1d4ed8)'}
              >
                Choose Files
              </button>
            </div>

            {/* Upload Progress */}
            {uploadProgress > 0 && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                         style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-900">Uploading...</span>
                  </div>
                  <span className="text-sm font-medium" style={{ color: '#10b981' }}>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${uploadProgress}%`,
                      background: 'linear-gradient(135deg, #10b981, #059669)'
                    }}
                  ></div>
                </div>
              </div>
            )}

            {/* Upload Stats */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Statistics</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Documents:</span>
                  <span className="font-medium text-gray-900">{documents.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Completed:</span>
                  <span className="font-medium" style={{ color: '#10b981' }}>
                    {documents.filter(doc => doc.status === 'completed').length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Processing:</span>
                  <span className="font-medium" style={{ color: '#f59e0b' }}>
                    {documents.filter(doc => doc.status === 'processing').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Documents List */}
        <div className="lg:w-2/3 flex flex-col">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-full flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Your Documents</h2>
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                  {documents.length} {documents.length === 1 ? 'document' : 'documents'}
                </span>
              </div>
            </div>
            
            {/* Scrollable Documents List */}
            <div className="flex-1 overflow-y-auto p-6">
              {documents.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
                  <p className="text-gray-600">Upload your first PDF document to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {documents.map((doc) => {
                    const getStatusColor = (status) => {
                      switch(status) {
                        case 'completed': return '#10b981';
                        case 'processing': return '#f59e0b';
                        case 'pending': return '#6b7280';
                        case 'failed': return '#ef4444';
                        default: return '#6b7280';
                      }
                    };

                    const getStatusBadge = (status) => {
                      switch(status) {
                        case 'completed': return 'bg-green-100 text-green-800';
                        case 'processing': return 'bg-yellow-100 text-yellow-800';
                        case 'pending': return 'bg-gray-100 text-gray-800';
                        case 'failed': return 'bg-red-100 text-red-800';
                        default: return 'bg-gray-100 text-gray-800';
                      }
                    };

                    const getLanguageColor = (lang) => {
                      switch(lang) {
                        case 'en': return 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
                        case 'az': return 'linear-gradient(135deg, #ef4444, #dc2626)';
                        default: return 'linear-gradient(135deg, #8b5cf6, #7c3aed)';
                      }
                    };

                    return (
                      <div
                        key={doc.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 hover:border-gray-300"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                 style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-base font-semibold text-gray-900 mb-1 truncate">{doc.filename}</h4>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 mb-2">
                                <span>{doc.page_count} pages</span>
                                <span>{doc.chunk_count || 0} chunks</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(doc.status)}`}>
                                  {doc.status}
                                </span>
                                <div className="flex items-center space-x-1">
                                  <div className="w-2 h-2 rounded-full" 
                                       style={{ background: getLanguageColor(doc.language) }}></div>
                                  <span className="text-xs font-medium">{doc.language.toUpperCase()}</span>
                                </div>
                              </div>
                              <p className="text-xs text-gray-500 mb-2">
                                Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                              </p>

                              {/* Sources Dropdown Button */}
                              {doc.chunk_count > 0 && (
                                <button
                                  onClick={() => toggleSources(doc.id)}
                                  className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                                >
                                  <svg className={`w-3 h-3 transition-transform ${expandedSources[doc.id] ? 'rotate-180' : ''}`} 
                                       fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                  <span>{expandedSources[doc.id] ? 'Hide' : 'View'} Sources ({doc.chunk_count})</span>
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                if (window.confirm('Delete this document?')) {
                                  deleteDocument(doc.id);
                                }
                              }}
                              className="p-2 text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Expanded Sources */}
                        {expandedSources[doc.id] && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <h5 className="text-sm font-medium text-gray-900 mb-3">Document Sources</h5>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {/* Mock sources - in real app, these would come from API */}
                              {Array.from({ length: doc.chunk_count || 0 }, (_, index) => (
                                <div key={index} className="bg-gray-50 rounded-lg p-3 text-xs">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium text-gray-900">Chunk {index + 1}</span>
                                    <span className="text-gray-500">Page {Math.floor(index / 3) + 1}</span>
                                  </div>
                                  <p className="text-gray-600 leading-relaxed">
                                    This is a preview of chunk {index + 1} from the document. 
                                    It contains processed text content that can be used for AI analysis and search...
                                  </p>
                                  <div className="flex items-center justify-between mt-2">
                                    <span className="text-gray-500">Characters: {150 + (index * 23)}</span>
                                    <div className="flex items-center space-x-1">
                                      <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                      <span className="text-green-600 font-medium">Processed</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <input
        type="file"
        accept=".pdf"
        multiple
        onChange={handleFileUpload}
        ref={fileInputRef}
        className="hidden"
      />
    </div>
  );
};

export default DocumentManager;
