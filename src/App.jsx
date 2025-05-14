import React, { useState, useEffect } from 'react';
import DatabaseContent from './DatabaseContent';
import Sidebar from './Sidebar';
import AddSongsContent from './AddSongsContent';
import { API_URL, BACKEND_API_URL } from './config'; // Import from config file
import Login from './Login'; // Import the Login modal component

const fetchDatabase = async (setIsLoading, setSongDatabase) => {
  try {
    setIsLoading(true);
    // No need to call cleanup here every time, maybe call it manually or have a separate trigger
    const cleanupResponse = await fetch(`${API_URL}/api/songs/cleanup`, {
      // Removed headers
    });

    if (!cleanupResponse.ok) {
      console.error('Failed to run database cleanup:', cleanupResponse.statusText);
      // Optionally handle this error, maybe skip fetching the database or show a message
    } else {
      console.log('Database cleanup triggered successfully.');
    }

    console.log('Fetching database...');
    const response = await fetch(`${API_URL}/api/songs`, {
      // Removed headers
    });
    const data = await response.json();
    console.log('Data received:', data);
    console.log('Updating songDatabase state with data:', data);
    setSongDatabase(data);
  } catch (error) {
    console.error('Error fetching database:', error);
    const savedData = localStorage.getItem('songDatabase');
    if (savedData) {
      console.log('Using local storage data:', JSON.parse(savedData));
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
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(true); // State to control login modal visibility, initially open
  const [isLoggedIn, setIsLoggedIn] = useState(false); // State to track if user is logged in

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
      fetchDatabase(setIsLoading, setSongDatabase);
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