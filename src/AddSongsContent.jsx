import React, { useState, useRef } from 'react'; // Import useRef for debouncing
import { FaSearch, FaMusic, FaPlus } from 'react-icons/fa'; // Assuming icons are available
import { clientId, clientSecret, BACKEND_API_URL } from './config'; // Import from config file

// Placeholder functions for Spotify API interaction (adapt from MainContent.jsx if needed)
// These should ideally be in a separate service file or passed as props
async function getSpotifyToken(clientId, clientSecret) {
  // Implementation from MainContent.jsx
  try {
    const result = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(clientId + ':' + clientSecret)
      },
      body: 'grant_type=client_credentials'
    });

    if (!result.ok) {
      console.error('Failed to fetch token:', result.statusText);
      return null;
    }

    const data = await result.json();
    return data.access_token;
  } catch (error) {
    console.error('Error fetching Spotify token:', error);
    return null;
  }
}

async function searchSpotify(query, token) {
  // Implementation from MainContent.jsx
  if (!token) {
    console.error('No token provided for Spotify API');
    return [];
  }

  try {
    const result = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
      {
        headers: {
          'Authorization': 'Bearer ' + token
        }
      }
    );

    if (!result.ok) {
      console.error('Failed to search Spotify:', result.statusText);
      return [];
    }

    const data = await result.json();
    return data.tracks.items; // Return the array of tracks
  } catch (error) {
    console.error('Error searching Spotify:', error);
    return [];
  }
}


const AddSongsContent = ({ songDatabase, setSongDatabase, getPassword }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [printNumber, setPrintNumber] = useState(''); // State for "Print" number
  const [owner, setOwner] = useState(''); // State for "Last Owner"
  const [searchResults, setSearchResults] = useState([]); // State for Spotify search results
  const [selectedSong, setSelectedSong] = useState(null); // State for selected song
  const debounceRef = useRef(null); // Ref for debouncing search input

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    setSelectedSong(null); // Clear selected song when typing

    if (query.length < 2) { // Avoid searching for very short queries
      setSearchResults([]);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const token = await getSpotifyToken(clientId, clientSecret);
      if (token) {
        const tracks = await searchSpotify(query, token);
        setSearchResults(tracks);
      } else {
        console.error('Failed to retrieve Spotify token or search');
        setSearchResults([]);
      }
    }, 300); // Debounce delay
  };

  const handleSelectSong = (track) => {
    setSelectedSong(track);
    setSearchQuery(track.name + ' - ' + track.artists.map(artist => artist.name).join(', ')); // Display selected song
    setSearchResults([]); // Clear search results after selecting
  };


  const handleAddSong = async () => {
    if (selectedSong && printNumber && owner) {
      // Construct the new song object with the flattened schema for the backend
      const newSong = {
        spotifyId: selectedSong.id, // Use the Spotify track ID for the new spotifyId field
        name: selectedSong.name,
        artists: selectedSong.artists, // Spotify data already provides artists in a compatible array structure
        album: selectedSong.album,   // Spotify data already provides album in a compatible object structure
        uri: selectedSong.uri,
        popularity: selectedSong.popularity,
        number: printNumber, // Get the number from the input field
        owner: owner         // Get the owner from the input field
      };

      try {
        const response = await fetch(`${BACKEND_API_URL}/api/songs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newSong)
        });

        if (!response.ok) {
          // If backend failed, log the error response body if available
          const errorText = await response.text();
          console.error('Failed to add song on backend. Status:', response.status, 'Body:', errorText);
          throw new Error('Failed to add song: ' + (errorText || response.statusText));
        }

        const result = await response.json();
        if (result.success) {
          // Add the newly saved song (which includes the _id from the backend)
          const updatedDatabase = [...songDatabase, result.song];
          setSongDatabase(updatedDatabase);
          // Note: Local storage is less critical now as backend is the source of truth
          // localStorage.setItem('songDatabase', JSON.stringify(updatedDatabase));


          // Reset fields after adding
          setSearchQuery('');
          setPrintNumber('');
          setOwner('');
          setSelectedSong(null);
        }
      } catch (error) {
        console.error('Error adding song:', error);
         // Display a user-friendly error message if needed
         alert('Failed to add song: ' + error.message);

        // Removed fallback to local storage only, as backend should be the source of truth now.
        // If backend fails, the song wasn't added.
      }
    }
  };

  return (
    <div className="p-2">
      <h1 className="text-4xl font-bold text-green-500 mb-6">Add songs to database</h1> {/* Adjusted color */}
      <div className="bg-[#181c1b] rounded-xl p-3 mb-3 shadow-lg flex items-center gap-3"> {/* Added flex-wrap */}
        {/* Search Input */}
        <div className="flex items-center bg-[#232825] rounded-lg flex-1 min-w-[200px]"> {/* Added min-width */}
            <FaSearch className="text-green-500 ml-4" /> {/* Adjusted color */}
            <input
                type="text"
                placeholder="Search song..."
                value={searchQuery}
                onChange={handleSearch}
                className="bg-[#232825] text-white placeholder-gray-400 px-4 py-2 rounded-lg focus:outline-none w-full"
            />
        </div>

        {/* Print Number Input */}
        <input
          type="number"
          placeholder="Print"
          value={printNumber}
          onChange={(e) => setPrintNumber(e.target.value)}
          className="bg-[#232825] text-white placeholder-gray-400 px-4 py-2 rounded-lg focus:outline-none w-32" // Fixed width
        />

        {/* Last Owner Input */}
        <input
          type="text"
          placeholder="Last Owner"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          className="bg-[#232825] text-white placeholder-gray-400 px-4 py-2 rounded-lg focus:outline-none flex-1 min-w-[150px]" // Added min-width
        />

        {/* Add Song Button */}
        <button
          onClick={handleAddSong}
          disabled={!selectedSong || !printNumber || !owner} // Disable if fields are empty
          className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
            selectedSong && printNumber && owner
              ? 'bg-green-500 text-black hover:bg-green-600' // Adjusted color
              : 'bg-[#232825] text-gray-400 cursor-not-allowed'
          }`}
        >
          <FaPlus /> Add Song
        </button>
      </div>

      {/* Search Results Section */}
      {searchResults.length > 0 && (
        <div className="bg-[#181c1b] rounded-xl p-3 mb-3 shadow-lg flex items-center gap-3">
          <ul>
            {searchResults.map(track => (
              <li
                key={track.id}
                className="flex items-center gap-4 py-2 border-b border-[#181c1b] last:border-b-0 cursor-pointer hover:bg-[#181c1b] rounded-lg px-2 transition-colors"
                onClick={() => handleSelectSong(track)}
              >
                {track.album && track.album.images && track.album.images[2] ? (
                  <img src={track.album.images[2].url} alt={track.name} className="w-10 h-10 rounded" />
                ) : (
                  <div className="w-10 h-10 flex items-center justify-center bg-[#181c1b] rounded">
                    <FaMusic className="text-green-500 text-2xl" /> {/* Adjusted color */}
                  </div>
                )}
                <div>
                  <div className="text-white font-semibold">{track.name}</div>
                  <div className="text-gray-400 text-sm">{track.artists.map(artist => artist.name).join(', ')}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

       {/* Selected Song Display */}
       {selectedSong && (
        <div className="bg-green-500/10 rounded-xl mt-4 max-w-3xl p-4 border border-green-500 text-green-500 font-semibold"> {/* Adjusted color */}
            Selected: {selectedSong.name} by {selectedSong.artists.map(artist => artist.name).join(', ')}
        </div>
       )}

       {/* Note about saving */}
       <div className="mt-4 text-gray-500 text-sm">
           Note: Songs are added to the displayed list and saved to songDatabase.json via the backend server.
       </div>

    </div>
  );
};

export default AddSongsContent;