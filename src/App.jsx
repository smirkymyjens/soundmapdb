import React, { useState, useEffect } from 'react';
import DatabaseContent from './DatabaseContent';
import Sidebar from './Sidebar';
import AddSongsContent from './AddSongsContent';
import { API_URL } from './config';
import Login from './Login';

const checkDatabaseHealth = async () => {
  try {
    const response = await fetch(`${API_URL}/api/health`);
    if (!response.ok) {
      console.error('Health check failed: HTTP status', response.status);
      return false;
    }
    const data = await response.json();
    console.log('Health check response data:', data);
    return data.database === 'connected';
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
};

const fetchDatabase = async (setIsLoading, setSongDatabase, setError, setDbStatus) => {
  console.log('fetchDatabase function started');
  try {
    setIsLoading(true);
    setError(null);
    setDbStatus('checking...');

    // Check database health
    console.log('Checking database health...');
    const isHealthy = await checkDatabaseHealth();
    console.log('Database health check result:', isHealthy);

    if (!isHealthy) {
      setError('Database connection failed. Please try again later.');
      setDbStatus('disconnected');
      setIsLoading(false);
      console.log('Database not healthy, stopping fetch.');
      return;
    }

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
    setDbStatus('connected');
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

  return (
    <div className="flex min-h-screen bg-black">
      {!isLoggedIn ? (
        <Login
          isOpen={isLoginModalOpen}
          onClose={handleCloseLoginModal}
          onLogin={handleLoginSuccess}
        />
      ) : (
        <>
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
          <div className="flex-1 p-8">
            {error && (
              <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg mb-4 flex justify-between items-center">
                <span>{error}</span>
                <button
                  onClick={handleRetry}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}
            {dbStatus === 'checking' && (
              <div className="bg-blue-500/10 border border-blue-500 text-blue-500 p-4 rounded-lg mb-4">
                Checking database connection...
              </div>
            )}
            {isLoading ? (
              <p className="text-white">Loading...</p>
            ) : activeTab === 'database' ? (
              <DatabaseContent songDatabase={songDatabase} setSongDatabase={setSongDatabase} />
            ) : (
              <AddSongsContent songDatabase={songDatabase} setSongDatabase={setSongDatabase} />
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default App;