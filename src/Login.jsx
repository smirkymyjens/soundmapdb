import React, { useState } from 'react';
import Modal from 'react-modal';
import { FaPlus } from 'react-icons/fa'; // Import the plus icon

Modal.setAppElement('#root'); // Set the root element for accessibility

const Login = ({ isOpen, onClose, onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    // Basic validation and authentication logic (replace with your actual auth logic)
    if (username === 'soundmap' && password === 'soundmap') { // Example credentials
      setError('');
      onLogin(); // Call the parent's login handler
    } else {
      setError('Invalid username or password');
    }
  };

  const customStyles = {
    content: {
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      marginRight: '-50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: '#181c1b', // Dark background
      color: 'white', // White text
      padding: '40px',
      borderRadius: '10px',
      textAlign: 'center', // Center the content
      width: '600px', // Set a fixed width (scaled up)
      border: 'none', // Remove border
      outline: 'none', // Remove outline
    },
    overlay: {
      backgroundColor: 'rgba(0, 0, 0, 0.75)', // Semi-transparent black overlay
    },
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose} // Allows closing by clicking outside or pressing Esc (if desired)
      style={customStyles}
      contentLabel="Login Modal"
    >
      {/* Add the plus icon and title container */}
      <div className="flex items-center justify-center mb-6"> {/* Container to center icon and title */}
        <div className="bg-green-500 rounded-lg p-2 mr-3"> {/* Icon container with green background */}
          <FaPlus className="text-black text-3xl" /> {/* Plus icon with large size and black color */}
        </div>
        <h2 className="text-5xl font-bold text-green-500">SoundmapDB</h2> {/* Increased font size, removed mb-6 here as it's on the container */}
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-[#232825] text-white placeholder-gray-400 focus:outline-none border-none"
        />
      </div>
      <div className="mb-6">
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-[#232825] text-white placeholder-gray-400 focus:outline-none border-none"
        />
      </div>
      <button
        onClick={handleLogin}
        className="bg-green-500 text-black px-4 py-2 rounded-lg font-bold hover:bg-green-600"
      >
        Login
      </button>
    </Modal>
  );
};

export default Login; 