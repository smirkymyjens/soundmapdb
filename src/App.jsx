import React, { useState, useEffect } from 'react';
import DatabaseContent from './DatabaseContent';
import Sidebar from './Sidebar';
import AddSongsContent from './AddSongsContent';
import { API_URL } from './config';
import Login from './Login';

const fetchDatabase = async (setIsLoading, setSongDatabase, setError) => {
  try {
    setIsLoading(true);
    setError(null);

    // First check if the database is healthy
    const healthCheck = await fetch(`${API_URL}/api/health`);
    if (!healthCheck.ok) {
      throw new Error('Database service is unavailable');
    }

    const healthData = await healthCheck.json();
    if (healthData.database !== 'connected') {
      throw new Error('Database connection failed');
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
  const [activeTab, setActiveTab] = useState('database'); // State to manage active tab
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(true); // State to control login modal visibility, initially open
  const [isLoggedIn, setIsLoggedIn] = useState(false); // State to track if user is logged in
  const [error, setError] = useState(null);

  // Function to handle successful login from the modal
  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    setIsLoginModalOpen(false); // Close the modal on successful login
  };

  // Function to handle closing the modal (optional, can be restricted)
  const handleCloseLoginModal = () => {
    // Forcing login, so perhaps don't allow closing without login?
    // setIsLoginModalOpen(false);
  };

  useEffect(() => {
    // Only fetch database if logged in
    if (isLoggedIn) {
      fetchDatabase(setIsLoading, setSongDatabase, setError);
    }
  }, [isLoggedIn]); // Dependency on isLoggedIn ensures fetch happens after login

  return (
    <div className="flex min-h-screen bg-black"> {/* Added background color */}
      {/* Conditionally render the main app content or the login modal */}
      {!isLoggedIn ? (
        <Login
          isOpen={isLoginModalOpen}
          onClose={handleCloseLoginModal} // Pass the close handler
          onLogin={handleLoginSuccess} // Pass the success handler
        />
      ) : (
        <>
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
          <div className="flex-1 p-8"> {/* Increased padding */}
            {error && (
              <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg mb-4">
                {error}
              </div>
            )}
            {isLoading ? (
              <p className="text-white">Loading...</p> // Styled loading text
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