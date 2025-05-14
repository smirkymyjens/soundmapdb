const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3001;
const DATABASE_FILE = path.join(__dirname, 'songDatabase.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Create database file if it doesn't exist
if (!fs.existsSync(DATABASE_FILE)) {
  fs.writeFileSync(DATABASE_FILE, JSON.stringify([]));
}

// Get the database
app.get('/api/songs', (req, res) => {
  try {
    const data = fs.readFileSync(DATABASE_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error reading database:', error);
    res.status(500).json({ error: 'Failed to read database' });
  }
});

// Save to the database
app.post('/api/songs', (req, res) => {
  try {
    fs.writeFileSync(DATABASE_FILE, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving database:', error);
    res.status(500).json({ error: 'Failed to save database' });
  }
});

// Download the database file
app.get('/api/songs/download', (req, res) => {
  res.download(DATABASE_FILE, 'song-database.json');
});

// Clean up existing database by removing unnecessary Spotify data
app.get('/api/songs/cleanup', (req, res) => {
  try {
    // Read the current database
    const data = fs.readFileSync(DATABASE_FILE, 'utf8');
    const songs = JSON.parse(data);
    
    // Clean up each song
    const cleanedSongs = songs.map(item => {
      // Skip already cleaned songs with stats
      if (
        !item.song.artists && 
        item.song.artist
      ) {
        return item;
      }
      
      // Extract only essential data
      const simplifiedSong = {
        id: item.song.id,
        name: item.song.name,
        artist: item.song.artists ? item.song.artists[0].name : item.song.artist || 'Unknown Artist',
        albumImage: item.song.album && item.song.album.images && item.song.album.images.length > 1 
          ? item.song.album.images[1].url  // Use medium-sized image for better quality
          : item.song.album && item.song.album.images && item.song.album.images.length > 0
            ? item.song.album.images[0].url // Fallback to any available image
            : item.song.albumImage || null,
      };
      
      return {
        ...item,
        song: simplifiedSong
      };
    });
    
    // Save the cleaned database
    fs.writeFileSync(DATABASE_FILE, JSON.stringify(cleanedSongs, null, 2));
    
    res.json({ success: true, message: 'Database cleaned successfully', count: cleanedSongs.length });
  } catch (error) {
    console.error('Error cleaning database:', error);
    res.status(500).json({ error: 'Failed to clean database' });
  }
});

// Serve the React app for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Database file: ${DATABASE_FILE}`);
}); 