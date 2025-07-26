# RAG System with Multilingual Support

This project is a comprehensive Retrieval-Augmented Generation (RAG) system with a FastAPI backend and a React frontend. It allows users to upload PDF documents, ask questions about them, and receive AI-powered answers with source citations.

## Features

- **Multilingual PDF Processing**: Supports both English and Azerbaijani.
- **AI-Powered Chat**: Uses Google's Gemini for intelligent responses.
- **Vector Search**: Leverages Qdrant for efficient semantic search.
- **Modern UI**: Built with React and Tailwind CSS for a responsive experience.
- **Multiple File Uploads**: Upload multiple documents at once with progress tracking.
- **Asynchronous Processing**: Handles document processing in the background.

## Tech Stack

- **Backend**: FastAPI, Python, MongoDB, Qdrant
- **Frontend**: React, Axios, Tailwind CSS
- **AI**: Google Gemini, Sentence-Transformers

## Getting Started

### Prerequisites

- Python 3.9+
- Node.js and npm
- MongoDB instance

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ilqareskerov/RAG.git
   cd RAG
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # On Windows use `.venv\Scripts\activate`
   pip install -r requirements.txt
   # Special install for emergentintegrations
   pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
   ```

3. **Frontend Setup:**
   ```bash
   cd ../frontend
   npm install
   ```

### Configuration

1. **Backend**: Create a `.env` file in the `backend` directory:
   ```
   MONGO_URL=mongodb://localhost:27017
   DB_NAME=rag_db
   GOOGLE_API_KEY=your_google_api_key
   ```

2. **Frontend**: Create a `.env` file in the `frontend` directory:
   ```
   REACT_APP_BACKEND_URL=http://localhost:8000
   ```

### Running the Application

1. **Start the backend server:**
   ```bash
   cd backend
   uvicorn server:app --reload
   ```

2. **Start the frontend development server:**
   ```bash
   cd ../frontend
   npm start
   ```

## Future Improvements

- [ ] **OpenAI Integration**: Add support for OpenAI models as an alternative to Gemini.
- [ ] **UI Enhancements**:
  - [ ] Improve chat message streaming for a smoother experience.
  - [ ] Add a dark mode theme.
  - [ ] Implement pagination for document and chat session lists.
- [ ] **Deployment**: Create Dockerfiles for easy deployment.
- [ ] **Testing**: Add comprehensive unit and integration tests.
- [ ] **Security**: Implement user authentication and authorization.
- [ ] **Scalability**: Use a persistent Qdrant instance instead of in-memory.