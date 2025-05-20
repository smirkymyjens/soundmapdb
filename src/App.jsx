import React, { useState, useEffect } from 'react';
import DatabaseContent from './DatabaseContent';
import Sidebar from './Sidebar';
import AddSongsContent from './AddSongsContent';
import { API_URL } from './config';
import Login from './Login';
import { Analytics } from "@vercel/analytics/react";

const fetchDatabase = async (setIsLoading, setSongDatabase, setError, setDbStatus) => {
  console.log('fetchDatabase function started');
  try {
    setIsLoading(true);
    setError(null);
    setDbStatus('connected');

    console.log('Fetching songs...');
    const cleanupResponse = await fetch(`${API_URL}/api/songs/cleanup`);
    if (!cleanupResponse.ok) {
      console.error('Failed to run database cleanup:', cleanupResponse.statusText);
    }

    const response = await fetch(`${API_URL}/api/songs`);
    if (!response.ok) {
      throw new Error('Failed to fetch database');
    }
    const data = await response.json();
    setSongDatabase(data);
    localStorage.setItem('songDatabase', JSON.stringify(data));
    console.log('Songs fetched successfully:', data.length, 'songs');

  } catch (error) {
    console.error('Error in fetchDatabase:', error);
    setError(`Failed to load songs: ${error.message}`);
    setDbStatus('disconnected');
    setSongDatabase([]);
    localStorage.setItem('songDatabase', JSON.stringify([]));
  } finally {
    setIsLoading(false);
    console.log('fetchDatabase function finished');
  }
};

const App = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [songDatabase, setSongDatabase] = useState([]);
  const [activeTab, setActiveTab] = useState('database');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState(null);
  const [dbStatus, setDbStatus] = useState('disconnected');

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    setIsLoginModalOpen(false);
  };

  const handleCloseLoginModal = () => {
    // Forcing login, so perhaps don't allow closing without login?
    // setIsLoginModalOpen(false);
  };

  useEffect(() => {
    console.log('useEffect triggered, fetching database...');
    fetchDatabase(setIsLoading, setSongDatabase, setError, setDbStatus);
  }, [/* Dependencies - add dependencies that should refetch the database if needed */]);

  const handleRetry = () => {
    setError(null);
    setDbStatus('checking');
    fetchDatabase(setIsLoading, setSongDatabase, setError, setDbStatus);
  };

  console.log('App component rendering. isLoggedIn:', isLoggedIn, 'isLoading:', isLoading, 'error:', !!error, 'dbStatus:', dbStatus); // Log state on render

  return (
    <div className="flex min-h-screen bg-black">
      <Analytics />
      {!isLoggedIn ? (
        <>
          {console.log('Rendering Login component')}
          <Login
            isOpen={isLoginModalOpen}
            onClose={handleCloseLoginModal}
            onLogin={handleLoginSuccess}
          />
        </>
      ) : (
        <>
          {console.log('Rendering logged-in view')}
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
          <div className="flex-1 p-8">
            {error && (
              <>
                {console.log('Rendering error message')}
                <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg mb-4 flex justify-between items-center">
                  <span>{error}</span>
                  <button
                    onClick={handleRetry}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </>
            )}
            {dbStatus === 'checking' && (
              <>
                 {console.log('Rendering checking status')}
                 <div className="bg-blue-500/10 border border-blue-500 text-blue-500 p-4 rounded-lg mb-4">
                  Checking database connection...
                </div>
              </>
            )}
            {isLoading ? (
              <>
                {console.log('Rendering loading state')}
                <p className="text-white">Loading...</p>
              </>
            ) : activeTab === 'database' ? (
              <>
                {console.log('Rendering DatabaseContent')}
                <DatabaseContent songDatabase={songDatabase} setSongDatabase={setSongDatabase} />
              </>
            ) : (
              <>
                {console.log('Rendering AddSongsContent')}
                <AddSongsContent songDatabase={songDatabase} setSongDatabase={setSongDatabase} />
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default App;