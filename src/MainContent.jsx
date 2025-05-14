import React, { useState, useRef, useEffect } from 'react';
import { FaMusic, FaCog, FaPlus } from 'react-icons/fa';

const clientId = '5959442ab3a74956af8c4351d3cc87e5';
const clientSecret = '18ae616fdb5c4784991ad2c4608ad392';

export default function MainContent() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedSong, setSelectedSong] = useState(null);
  const [songNumber, setSongNumber] = useState('');
  const [owner, setOwner] = useState('');
  const [songDatabase, setSongDatabase] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const songsPerPage = 10; // Number of songs to display per page
  const debounceRef = useRef(null);

  useEffect(() => {
    const storedSongs = JSON.parse(localStorage.getItem('songDatabase')) || [];
    setSongDatabase(storedSongs);
    console.log('Loaded songs from local storage:', storedSongs); // Log the loaded songs
  }, []);

  async function handleSearch(e) {
    setQuery(e.target.value);
    if (e.target.value.length < 2) return; // avoid too many requests

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const token = await getSpotifyToken(clientId, clientSecret);
      if (token) {
        const tracks = await searchSpotify(e.target.value, token);
        setResults(tracks);
      } else {
        console.error('Failed to retrieve token, cannot search');
      }
    }, 300); // Adjust the delay as needed
  }

  function handleSelectSong(track) {
    setSelectedSong(track);
    setQuery(track.name);
    setResults([]); // Clear results after selection
  }

  function handleAddSong() {
    if (selectedSong && songNumber && owner) {
      const newSong = {
        id: Date.now(), // simple unique id
        song: {
          name: selectedSong.name,
          artists: selectedSong.artists,
          album: selectedSong.album,
          // Add any other necessary properties
        },
        number: songNumber,
        owner: owner
      };
      
      const updatedDatabase = [...songDatabase, newSong];
      setSongDatabase(updatedDatabase);
      console.log('Updated song database:', updatedDatabase); // Log the updated database

      // Save to local storage
      localStorage.setItem('songDatabase', JSON.stringify(updatedDatabase));

      // Reset fields after adding
      setQuery('');
      setSongNumber('');
      setOwner('');
      setSelectedSong(null);
    }
  }

  // Example function to get a token
  async function getSpotifyToken(clientId, clientSecret) {
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
      return null; // Return null if token retrieval fails
    }

    const data = await result.json();
    return data.access_token;
  }

  async function searchSpotify(query, token) {
    if (!token) {
      console.error('No token provided for Spotify API');
      return [];
    }

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
      return []; // Return an empty array if the search fails
    }

    const data = await result.json();
    return data.tracks.items; // Return the array of tracks
  }

  const indexOfLastSong = currentPage * songsPerPage;
  const indexOfFirstSong = indexOfLastSong - songsPerPage;
  const currentSongs = songDatabase.slice(indexOfFirstSong, indexOfLastSong);
  const totalPages = Math.ceil(songDatabase.length / songsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  console.log('Current Page:', currentPage);
  console.log('Total Pages:', totalPages);
  console.log('Current Songs:', currentSongs);

  return (
    <div>
      <h1 className="text-4xl font-bold text-accent mb-6">Add songs to database</h1>
      <div className="bg-[#181c1b] rounded-xl p-6 max-w-3xl shadow-lg flex items-center gap-4">
        <input
          type="text"
          placeholder="Search song"
          value={query}
          onChange={handleSearch}
          className="bg-[#232825] text-white placeholder-gray-400 px-4 py-2 rounded-lg focus:outline-none w-40"
        />
        <input
          type="number"
          placeholder="Number"
          value={songNumber}
          onChange={(e) => setSongNumber(e.target.value)}
          className="bg-[#232825] text-white placeholder-gray-400 px-4 py-2 rounded-lg focus:outline-none w-32"
        />
        <input
          type="text"
          placeholder="Owner"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          className="bg-[#232825] text-white placeholder-gray-400 px-4 py-2 rounded-lg focus:outline-none w-40"
        />
        <button 
          onClick={handleAddSong}
          disabled={!selectedSong || !songNumber || !owner}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
            selectedSong && songNumber && owner 
              ? 'bg-accent text-black hover:bg-accent/90' 
              : 'bg-[#232825] text-gray-400 cursor-not-allowed'
          }`}
        >
          <FaPlus /> Add Song
        </button>
      </div>

      {/* Results Section */}
      {results.length > 0 && (
        <div className="bg-[#232825] rounded-xl mt-4 max-w-3xl shadow-lg p-4">
          <ul>
            {results.map(track => (
              <li 
                key={track.id} 
                className="flex items-center gap-4 py-2 border-b border-[#181c1b] last:border-b-0 cursor-pointer hover:bg-[#181c1b] rounded-lg px-2 transition-colors"
                onClick={() => handleSelectSong(track)}
              >
                {track.album && track.album.images && track.album.images[2] ? (
                  <img src={track.album.images[2].url} alt={track.name} className="w-10 h-10 rounded" />
                ) : (
                  <div className="w-10 h-10 flex items-center justify-center bg-[#181c1b] rounded">
                    <FaMusic className="text-accent text-2xl" />
                  </div>
                )}
                <div>
                  <div className="text-white font-semibold">{track.name}</div>
                  <div className="text-gray-400 text-sm">{track.artists[0].name}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {selectedSong && (
        <div className="bg-accent/10 rounded-xl mt-4 max-w-3xl p-4 border border-accent">
          <div className="text-accent font-semibold">Selected: {selectedSong.name} by {selectedSong.artists[0].name}</div>
        </div>
      )}

      {/* Song Database Section */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-accent mb-4">Song Database</h2>
        <div className="bg-[#181c1b] rounded-xl p-4 max-w-3xl shadow-lg">
          <div className="grid grid-cols-10 text-gray-400 border-b border-[#232825] pb-2 mb-2">
            <div className="col-span-1"></div>
            <div className="col-span-5">Song</div>
            <div className="col-span-2">Number</div>
            <div className="col-span-2">Owner</div>
          </div>
          {currentSongs.length > 0 ? (
            currentSongs.map(item => (
              <div key={item.id} className="grid grid-cols-10 items-center py-2 border-b border-[#232825] last:border-b-0">
                <div className="col-span-1">
                  {item.song.album && item.song.album.images && item.song.album.images[2] ? (
                    <img src={item.song.album.images[2].url} alt={item.song.name} className="w-8 h-8 rounded" />
                  ) : (
                    <div className="w-8 h-8 flex items-center justify-center bg-[#232825] rounded">
                      <FaMusic className="text-accent" />
                    </div>
                  )}
                </div>
                <div className="col-span-5">
                  <div className="text-white font-medium">{item.song.name}</div>
                  <div className="text-gray-400 text-sm">{item.song.artists[0].name}</div>
                </div>
                <div className="col-span-2 text-white">{item.number}</div>
                <div className="col-span-2 text-white">{item.owner}</div>
              </div>
            ))
          ) : (
            <div className="text-gray-400 text-center py-4">No songs in the database yet.</div>
          )}
        </div>
        
        {/* Pagination Controls */}
        <div className="flex justify-between mt-4">
          <button onClick={handlePreviousPage} disabled={currentPage === 1} className="bg-accent text-black px-4 py-2 rounded-lg">
            Previous
          </button>
          <button onClick={handleNextPage} disabled={currentPage === totalPages} className="bg-accent text-black px-4 py-2 rounded-lg">
            Next
          </button>
        </div>
      </div>
    </div>
  );
} 