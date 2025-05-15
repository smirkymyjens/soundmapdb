import React, { useState, useEffect } from 'react';
import DatabaseContent from './DatabaseContent';
import Sidebar from './Sidebar';
import AddSongsContent from './AddSongsContent';
import { API_URL } from './config'; // Import from config file
import Login from './Login'; // Import the Login modal component

const fetchDatabase = async (setIsLoading, setSongDatabase, setError) => {
  try {
    setIsLoading(true);
    setError(null);
    
    // Try to cleanup the database first
    try {
      const cleanupResponse = await fetch(`${API_URL}/api/songs/cleanup`);
      if (!cleanupResponse.ok) {
        console.warn('Database cleanup failed:', cleanupResponse.statusText);
        // Continue anyway, this isn't critical
      } else {
        console.log('Database cleanup triggered successfully.');
      }
    } catch (cleanupError) {
      console.warn('Error during database cleanup:', cleanupError);
      // Continue anyway, this isn't critical
    }

    console.log('Fetching database from:', `${API_URL}/api/songs`);
    const response = await fetch(`${API_URL}/api/songs`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch database: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Data received:', data);
    console.log('Updating songDatabase state with data:', data);
    setSongDatabase(data);
    
    // Store in localStorage as backup
    localStorage.setItem('songDatabase', JSON.stringify(data));
  } catch (error) {
    console.error('Error fetching database:', error);
    setError(error.message);
    
    // Try to recover from localStorage
    const savedData = localStorage.getItem('songDatabase');
    if (savedData) {
      console.log('Using local storage data as fallback:', JSON.parse(savedData));
      setSongDatabase(JSON.parse(savedData));
    } else {
      setSongDatabase([]); // Initialize with empty array if no local storage data
    }
  } finally {
    setIsLoading(false);
  }
};

const App = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [songDatabase, setSongDatabase] = useState([]);
  const [activeTab, setActiveTab] = useState('database'); // State to manage active tab
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(true); // State to control login modal visibility
  const [isLoggedIn, setIsLoggedIn] = useState(false); // State to track if user is logged in
  const [error, setError] = useState(null); // State to track errors

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

  // Function to retry database fetch
  const handleRetryFetch = () => {
    fetchDatabase(setIsLoading, setSongDatabase, setError);
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
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <p className="text-white text-xl">Loading...</p>
              </div>
            ) : error ? (
              <div className="bg-red-500/20 border border-red-500 rounded-xl p-6 max-w-2xl mx-auto text-center">
                <h2 className="text-2xl text-red-400 font-bold mb-4">Error Loading Database</h2>
                <p className="text-white mb-4">{error}</p>
                <button 
                  onClick={handleRetryFetch}
                  className="bg-green-500 text-black px-6 py-2 rounded-lg hover:bg-green-600"
                >
                  Retry
                </button>
                <p className="text-gray-400 mt-4 text-sm">
                  Note: Currently displaying data from local cache (if available)
                </p>
              </div>
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