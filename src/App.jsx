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
      throw new Error('Database service is unavailable');
    }
    const data = await response.json();
    return data.database === 'connected';
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
};

const fetchDatabase = async (setIsLoading, setSongDatabase, setError, setDbStatus) => {
  try {
    setIsLoading(true);
    setError(null);

    // Check database health
    const isHealthy = await checkDatabaseHealth();
    setDbStatus(isHealthy ? 'connected' : 'disconnected');

    if (!isHealthy) {
      throw new Error('Database connection failed. Please try again later.');
    }

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
  } catch (error) {
    console.error('Error fetching database:', error);
    setError(error.message);
    const savedData = localStorage.getItem('songDatabase');
    if (savedData) {
      setSongDatabase(JSON.parse(savedData));
    } else {
      setSongDatabase([]);
    }
  } finally {
    setIsLoading(false);
  }
};

const App = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [songDatabase, setSongDatabase] = useState([]);
  const [activeTab, setActiveTab] = useState('database');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState(null);
  const [dbStatus, setDbStatus] = useState('checking');

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    setIsLoginModalOpen(false);
  };

  const handleCloseLoginModal = () => {
    // Forcing login, so perhaps don't allow closing without login?
    // setIsLoginModalOpen(false);
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchDatabase(setIsLoading, setSongDatabase, setError, setDbStatus);
    }
  }, [isLoggedIn]);

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