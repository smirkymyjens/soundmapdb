import React, { useState } from 'react';
import { FaMusic, FaDownload, FaTrash, FaSearch } from 'react-icons/fa'; // Assuming these icons are available
import { BACKEND_API_URL } from './config'; // Import backend URL

export default function DatabaseContent({ songDatabase, setSongDatabase, saveToJsonFile, getPassword }) {
  console.log('DatabaseContent received songDatabase:', songDatabase);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState('song'); // 'song', 'number', 'owner'
  const [currentPage, setCurrentPage] = useState(1); // State for current page
  const songsPerPage = 10; // Number of songs per page

  const [sortColumn, setSortColumn] = useState(null); // State for sort column: null, 'song', 'number', 'popularity'
  const [sortDirection, setSortDirection] = useState(null); // State for sort direction: null, 'asc', 'desc'

  // Function to delete a song from the database
  const deleteSong = async (id) => { // Made async to use await
    // const password = getPassword(); // Get the password
    // if (!password) { // If password is not obtained (user cancelled prompt)
    //   return;
    // }

    try {
      // Call backend delete endpoint
      const response = await fetch(`${BACKEND_API_URL}/api/songs/${id}`, {
        method: 'DELETE',
        // headers: {
        //   'X-Password': password // Include the password in a custom header
        // }
      });

      if (!response.ok) {
        console.error('Failed to delete song on backend:', response.statusText);
        // Optionally show an error to the user
        return; // Stop if backend deletion failed
      }

      // If backend deletion was successful, update local state
      const updatedDatabase = songDatabase.filter(item => item.id !== id);
      setSongDatabase(updatedDatabase);
      // Note: Local storage update is less critical now as backend is the source of truth
      // localStorage.setItem('songDatabase', JSON.stringify(updatedDatabase));

      console.log(`Song with ID ${id} deleted from frontend state.`);

    } catch (error) {
      console.error('Error deleting song:', error);
      // Optionally show an error to the user
    }
  };

  // Filter songs based on search query and field
  const filteredSongs = songDatabase.filter(item => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();

    switch(searchField) {
      case 'song':
        // Check both song name and artist name for song search (using flattened structure)
        return (item.name && item.name.toLowerCase().includes(query)) ||
               (item.artists && Array.isArray(item.artists) && item.artists.some(artist => artist.name && artist.name.toLowerCase().includes(query))) ||
               (item.artist && item.artist.toLowerCase().includes(query)); // Keep fallback for 'artist' string if backend provides it
      case 'number':
        return item.number && item.number.toString().includes(query);
      case 'owner':
        return item.owner && item.owner.toLowerCase().includes(query);
      default:
        return true;
    }
  });
  console.log('Filtered songs count:', filteredSongs.length);

  // Sort filtered songs based on state
  const sortedSongs = [...filteredSongs].sort((a, b) => {
    // Default sort by id descending (assuming _id or a similar ID is used for default)
    // If using spotifyId for default sort, change b.id - a.id to compare spotifyId strings
    if (sortColumn === null) {
       // Assuming _id or original 'id' is used for default. Adjust if spotifyId is preferred.
       // If your simplified backend returns 'id' as spotifyId, use that.
       // Let's sort by name by default if no column is selected for simplicity with flattened data.
       const aName = (a.name || '').toLowerCase();
       const bName = (b.name || '').toLowerCase();
       if (aName < bName) return -1;
       if (aName > bName) return 1;
       return 0;
    }

    let aValue, bValue;

    switch (sortColumn) {
      case 'song':
        aValue = (a.name || '').toLowerCase(); // Access flattened name
        bValue = (b.name || '').toLowerCase(); // Access flattened name
        break;
      case 'number':
        aValue = parseInt(a.number || '0', 10);
        bValue = parseInt(b.number || '0', 10);
        break;
      case 'popularity':
        aValue = parseInt(a.popularity || '0', 10); // Access flattened popularity
        bValue = parseInt(b.popularity || '0', 10); // Access flattened popularity
        break;
      default:
        // Fallback to sorting by name if an unknown column is passed
        const aName = (a.name || '').toLowerCase();
        const bName = (b.name || '').toLowerCase();
        if (aName < bName) return -1;
        if (aName > bName) return 1;
        return 0;
    }

    if (aValue < bValue) {
      return sortDirection === 'asc' ? -1 : 1;
    } else if (aValue > bValue) {
      return sortDirection === 'asc' ? 1 : -1;
    } else {
      return 0;
    }
  });

  // Handlers for sorting
  const handleSort = (column) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null); // Reset to default sort
      } else {
        setSortDirection('asc'); // Start with asc
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc'); // Default to asc when changing column
    }
    setCurrentPage(1); // Reset to first page on sort change
  };

  // Calculate songs for the current page
  const indexOfLastSong = currentPage * songsPerPage;
  const indexOfFirstSong = indexOfLastSong - songsPerPage;
  const currentSongs = sortedSongs.slice(indexOfFirstSong, indexOfLastSong);

  console.log(`Pagination: currentPage=${currentPage}, songsPerPage=${songsPerPage}`);
  console.log(`Pagination slice: ${indexOfFirstSong} to ${indexOfLastSong}. Current songs count: ${currentSongs.length}`);

  const totalPages = Math.ceil(sortedSongs.length / songsPerPage);

  // Handlers for pagination
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

  return (
    <div className="p-2">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-3xl font-bold text-green-500">Song Database</h1>
      </div>

      {/* Search Bar */}
      <div className="bg-[#181c1b] rounded-xl p-3 mb-3 shadow-lg flex items-center gap-3">
        <FaSearch className="text-green-500 ml-2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search database..."
          className="bg-[#232825] flex-1 px-3 py-1 rounded-lg text-white placeholder-gray-400 focus:outline-none"
        />
        <select
          value={searchField}
          onChange={(e) => setSearchField(e.target.value)}
          className="bg-[#232825] text-white px-2 py-1 rounded-lg focus:outline-none border border-green-500"
        >
          <option value="song">Song/Artist</option>
          <option value="number">Number</option>
          <option value="owner">Last Owner</option>
        </select>
      </div>

      {/* Database Table */}
      <div className="bg-[#181c1b] rounded-xl p-3 shadow-lg">
        <div className="grid grid-cols-12 text-gray-400 border-b border-[#232825] pb-1 mb-1">
          <div className="col-span-1"></div>
          <div className="col-span-4 cursor-pointer hover:text-white" onClick={() => handleSort('song')}>Song {sortColumn === 'song' && (sortDirection === 'asc' ? '▲' : '▼')}</div>
          <div className="col-span-2 cursor-pointer hover:text-white" onClick={() => handleSort('number')}>Number {sortColumn === 'number' && (sortDirection === 'asc' ? '▲' : '▼')}</div>
          <div className="col-span-2">Last Owner</div>
          <div className="col-span-1 text-right cursor-pointer hover:text-white" onClick={() => handleSort('popularity')}>Popularity {sortColumn === 'popularity' && (sortDirection === 'asc' ? '▲' : '▼')}</div>
          <div className="col-span-1 text-right"></div>
        </div>

        {filteredSongs.length === 0 && searchQuery.trim() !== '' ? (
          <div className="py-6 text-center text-gray-400">
            No results found for "{searchQuery}"
          </div>
        ) : filteredSongs.length === 0 && songDatabase.length > 0 && searchQuery.trim() === '' ? (
           <div className="py-6 text-center text-gray-400">
            No songs match the current criteria.
           </div>
        ) : filteredSongs.length === 0 && songDatabase.length === 0 ? (
          <div className="py-6 text-center text-gray-400">
            No songs in the database yet.
          </div>
        ) : (
          currentSongs.map(item => (
            <div key={item._id} className="grid grid-cols-12 items-center py-1 border-b border-[#232825] last:border-b-0">
              <div className="col-span-1">
                {item.albumImage ? (
                   <img src={item.albumImage} alt={item.name} className="w-7 h-7 rounded" />
                ) : (
                  <div className="w-7 h-7 flex items-center justify-center bg-[#232825] rounded">
                    <FaMusic className="text-green-500 text-lg" />
                  </div>
                )}
              </div>
              <div className="col-span-4">
                <div className="text-white font-medium text-sm">{item.name}</div>
                <div className="text-gray-400 text-xs">{item.artist}</div>
              </div>
              <div className="col-span-2 text-white text-sm">{item.number}</div>
              <div className="col-span-2 text-white text-sm">{item.owner}</div>
              <div className="col-span-1 text-right text-white text-sm">{item.popularity}</div>
              <div className="col-span-1 text-right">
                <button
                  onClick={() => deleteSong(item._id)}
                  className="text-gray-400 hover:text-red-500 p-1"
                  title="Delete song"
                >
                  <FaTrash className="text-sm"/>
                </button>
              </div>
            </div>
          ))
        )}

        {totalPages > 1 && (
          <div className="flex justify-between pt-3 border-t border-[#232825] mt-3 items-center">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className="bg-green-500 text-black px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <div className="flex flex-col items-center text-gray-400">
              <span className="text-white text-sm">Page {currentPage} of {totalPages}</span>
              {songDatabase.length > 0 && (
                 <span className="text-xs">
                  {searchQuery ? `${filteredSongs.length} of ${songDatabase.length} songs` : `Total songs: ${songDatabase.length}`}
                </span>
              )}
            </div>

            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="bg-green-500 text-black px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}