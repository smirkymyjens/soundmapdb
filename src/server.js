import express from 'express';
import fs from 'fs';
import path from 'path';
import bodyParser from 'body-parser';
import cors from 'cors';
import { fileURLToPath } from 'url'; // Import fileURLToPath
import { clientId, clientSecret } from './config.js'; // Note the .js extension for ES Modules

const app = express();
const PORT = process.env.PORT || 5000;

// Path to songDatabase.json relative to the project root
// Using process.cwd() which should be the project root when running node src/server.js
const DATABASE_FILE = path.join(process.cwd(), 'songDatabase.json');

const REQUIRED_PASSWORD = "soundmap";

// Middleware to protect specific routes with a password
function passwordProtect(req, res, next) {
  const providedPassword = req.headers['x-password'];

  if (providedPassword === REQUIRED_PASSWORD) {
    next(); // Password is correct, proceed
  } else {
    res.status(401).json({ error: 'Unauthorized: Invalid password.' });
  }
}

// Helper function to get Spotify Access Token
async function getSpotifyToken(clientId, clientSecret) {
  const result = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64') // Buffer should be global in Node.js
    },
    body: 'grant_type=client_credentials'
  });

  if (!result.ok) {
    console.error('Failed to fetch Spotify token:', result.statusText);
    return null;
  }

  const data = await result.json();
  return data.access_token;
}

// Helper function to get Spotify Track details by ID
async function getSpotifyTrack(trackId, token) {
  if (!token || !trackId) {
    console.error('No token or track ID provided for Spotify API');
    return null;
  }

  try {
    const result = await fetch(
      `https://api.spotify.com/v1/tracks/${trackId}`,
      {
        headers: {
          'Authorization': 'Bearer ' + token
        }
      }
    );

    if (!result.ok) {
      console.error('Failed to fetch Spotify track:', result.statusText);
      return null;
    }

    const data = await result.json();
    return data;
  } catch (error) {
    console.error('Error fetching Spotify track:', error);
    return null;
  }
}

// Middleware
app.use(cors()); // Enable CORS for all origins (adjust as needed for production)
app.use(bodyParser.json()); // Parse JSON request bodies

console.log('Defining GET /api/songs route'); // Add this log
// Endpoint to get all songs (you might already have this or similar)
app.get('/api/songs', (req, res) => {
  console.log('GET /api/songs route hit'); // Add this log
  console.log('Current working directory:', process.cwd()); // Log CWD
  console.log('Database file path:', DATABASE_FILE); // Log constructed path
  try {
    const data = fs.readFileSync(DATABASE_FILE, 'utf8');
    const songs = JSON.parse(data);
    res.json(songs);
  } catch (error) {
    console.error('Error reading database:', error);
    // If file doesn't exist, return empty array
    if (error.code === 'ENOENT') {
        res.json([]);
    } else {
        res.status(500).json({ error: 'Failed to read database' });
    }
  }
});

// Endpoint to add a new song
app.post('/api/songs/add', passwordProtect, (req, res) => {
  const newSong = req.body; // The new song object from the request body

  if (!newSong || !newSong.song || !newSong.song.name || !newSong.number || !newSong.owner) {
      return res.status(400).json({ error: 'Invalid song data' });
  }

  try {
    // Read the current database
    const data = fs.readFileSync(DATABASE_FILE, 'utf8');
    const songs = JSON.parse(data);

    // Check if a song with the same song ID and number already exists
    const isDuplicate = songs.some(song => 
      song.song && song.song.id === newSong.song.id && 
      song.number === newSong.number
    );

    if (isDuplicate) {
      console.log('Attempted to add duplicate song:', newSong);
      return res.status(409).json({ error: 'Song with this print number already added.' }); // 409 Conflict
    }

    // Add the new song
    songs.push(newSong);

    // Save the updated database
    fs.writeFileSync(DATABASE_FILE, JSON.stringify(songs, null, 2));

    console.log('Song added successfully:', newSong);
    res.json({ success: true, message: 'Song added successfully', song: newSong });
  } catch (error) {
    console.error('Error adding song to database:', error);
    res.status(500).json({ error: 'Failed to add song to database' });
  }
});

// Endpoint to delete a song by ID
app.delete('/api/songs/:id', (req, res) => {
  const songId = req.params.id; // Get the ID from the URL parameter

  try {
    // Read the current database
    const data = fs.readFileSync(DATABASE_FILE, 'utf8');
    let songs = JSON.parse(data);

    // Find the index of the song with the matching ID (compare as strings or numbers as needed)
    const initialLength = songs.length;
    songs = songs.filter(item => item.id.toString() !== songId.toString()); // Filter out the song

    if (songs.length === initialLength) {
        // If length didn't change, song with ID was not found
        return res.status(404).json({ error: `Song with ID ${songId} not found.` });
    }

    // Save the updated database
    fs.writeFileSync(DATABASE_FILE, JSON.stringify(songs, null, 2));

    console.log(`Deleted song with ID: ${songId}`);
    res.json({ success: true, message: `Song with ID ${songId} deleted successfully.` });
  } catch (error) {
    console.error('Error deleting song:', error);
    res.status(500).json({ error: 'Failed to delete song' });
  }
});

// Clean up and populate existing database with missing data (like popularity)
app.get('/api/songs/cleanup', async (req, res) => { // Made async to use await
  try {
    // Read the current database
    const data = fs.readFileSync(DATABASE_FILE, 'utf8');
    let songs = JSON.parse(data);

    const token = await getSpotifyToken(clientId, clientSecret); // Get token
    if (!token) {
        return res.status(500).json({ error: 'Failed to obtain Spotify token' });
    }

    // Process each song
    const processedSongs = [];
    for (const item of songs) { // Use for...of for async operations
      // Check if popularity is missing and song has a Spotify ID
      if (item.song && item.song.id && (item.song.popularity === undefined || item.song.popularity === null)) {
        console.log(`Fetching popularity for song ID: ${item.song.id}`);
        const trackDetails = await getSpotifyTrack(item.song.id, token);
        if (trackDetails && trackDetails.popularity !== undefined) {
          item.song.popularity = trackDetails.popularity; // Add popularity
          console.log(`Updated popularity for ${item.song.name}: ${item.song.popularity}`);
        } else {
            console.warn(`Could not fetch popularity for song ID: ${item.song.id}`);
        }
      }
      // Also apply existing cleanup logic if still needed
      if (item.song && !item.song.artists && item.song.artist) {
        // Existing cleanup logic for artist structure
        const simplifiedSong = {
          id: item.song.id || item.id,
          name: item.song.name || 'Unknown Song',
          artist: item.song.artists && item.song.artists.length > 0 ? item.song.artists[0].name : item.song.artist || 'Unknown Artist',
          albumImage: item.song.album && item.song.album.images && item.song.album.images.length > 0
            ? item.song.album.images[2]?.url
            : null,
          popularity: item.song.popularity // Ensure popularity is carried over
        };
        item.song = simplifiedSong;
      }
      processedSongs.push(item);
    }

    // Save the updated database
    fs.writeFileSync(DATABASE_FILE, JSON.stringify(processedSongs, null, 2));

    res.json({ success: true, message: 'Database cleaned and populated successfully', count: processedSongs.length });
  } catch (error) {
    console.error('Error cleaning/populating database:', error);
    res.status(500).json({ error: 'Failed to clean/populate database' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});