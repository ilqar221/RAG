// MongoDB initialization script
print('Creating RAG database and collections...');

// Switch to the RAG database
db = db.getSiblingDB(process.env.MONGO_INITDB_DATABASE || 'rag_db');

// Create collections with validation
db.createCollection('documents', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['id', 'filename', 'language', 'file_hash'],
      properties: {
        id: { bsonType: 'string' },
        filename: { bsonType: 'string' },
        content: { bsonType: 'string' },
        page_count: { bsonType: 'int' },
        language: { bsonType: 'string' },
        file_hash: { bsonType: 'string' },
        uploaded_at: { bsonType: 'date' },
        processing_status: { bsonType: 'string', enum: ['pending', 'processing', 'completed', 'failed'] },
        chunk_count: { bsonType: 'int' }
      }
    }
  }
});

db.createCollection('document_chunks', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['id', 'document_id', 'text', 'page_number'],
      properties: {
        id: { bsonType: 'string' },
        document_id: { bsonType: 'string' },
        text: { bsonType: 'string' },
        page_number: { bsonType: 'int' },
        chunk_index: { bsonType: 'int' },
        language: { bsonType: 'string' },
        embedding: { bsonType: 'array' },
        created_at: { bsonType: 'date' }
      }
    }
  }
});

db.createCollection('chat_sessions', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['id', 'session_name'],
      properties: {
        id: { bsonType: 'string' },
        session_name: { bsonType: 'string' },
        created_at: { bsonType: 'date' },
        updated_at: { bsonType: 'date' }
      }
    }
  }
});

db.createCollection('chat_messages', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['id', 'session_id', 'role', 'content'],
      properties: {
        id: { bsonType: 'string' },
        session_id: { bsonType: 'string' },
        role: { bsonType: 'string', enum: ['user', 'assistant'] },
        content: { bsonType: 'string' },
        sources: { bsonType: 'array' },
        confidence: { bsonType: 'double' },
        timestamp: { bsonType: 'date' }
      }
    }
  }
});

// Create indexes for better performance
db.documents.createIndex({ 'file_hash': 1 }, { unique: true });
db.documents.createIndex({ 'uploaded_at': -1 });
db.documents.createIndex({ 'processing_status': 1 });

db.document_chunks.createIndex({ 'document_id': 1 });
db.document_chunks.createIndex({ 'document_id': 1, 'page_number': 1 });

db.chat_sessions.createIndex({ 'updated_at': -1 });
db.chat_sessions.createIndex({ 'created_at': -1 });

db.chat_messages.createIndex({ 'session_id': 1, 'timestamp': 1 });
db.chat_messages.createIndex({ 'timestamp': -1 });

print('Database setup completed successfully!');
print('Collections created: documents, document_chunks, chat_sessions, chat_messages');
print('Indexes created for optimal performance');
