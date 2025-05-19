console.log('Serverless function started');

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// MongoDB Schema
const songSchema = new mongoose.Schema({
  id: Number,
  song: {
    id: String,
    name: String,
    artists: [{
      id: String,
      name: String
    }],
    album: {
      id: String,
      name: String,
      images: [{
        height: Number,
        width: Number,
        url: String
      }]
    },
    uri: String,
    popularity: Number
  },
  number: String,
  owner: String
});

const Song = mongoose.model('Song', songSchema);

// MongoDB connection with retry logic
const connectWithRetry = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI is not defined in environment variables');
      return false;
    }

    // Log connection attempt (without sensitive info)
    console.log('Attempting to connect to MongoDB...');
    
    // Ensure the connection string is properly formatted
    const formattedUri = mongoUri.trim();
    
    await mongoose.connect(formattedUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // Increased timeout
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000, // Added connect timeout
      retryWrites: true,
      retryReads: true,
    });
    
    console.log('Successfully connected to MongoDB');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    // Log more detailed error information
    if (error.name === 'MongoServerSelectionError') {
      console.error('Could not connect to MongoDB server. Please check your connection string and network settings.');
    } else if (error.name === 'MongoParseError') {
      console.error('Invalid MongoDB connection string format.');
    }
    return false;
  }
};

// Initial connection attempt with retry
let retryCount = 0;
const maxRetries = 3;

const attemptConnection = async () => {
  while (retryCount < maxRetries) {
    console.log(`Connection attempt ${retryCount + 1} of ${maxRetries}`);
    const connected = await connectWithRetry();
    if (connected) {
      return true;
    }
    retryCount++;
    if (retryCount < maxRetries) {
      console.log(`Retrying in 5 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  return false;
};

// Start connection attempt
attemptConnection().then(success => {
  if (!success) {
    console.error('Failed to connect to MongoDB after multiple attempts');
  }
});

// Get all songs
app.get('/api/songs', async (req, res) => {
  try {
    if (!mongoose.connection.readyState) {
      const connected = await connectWithRetry();
      if (!connected) {
        return res.status(503).json({ error: 'Database connection failed' });
      }
    }
    const songs = await Song.find();
    res.json(songs);
  } catch (error) {
    console.error('Error fetching songs:', error);
    res.status(500).json({ error: 'Failed to fetch songs' });
  }
});

// Add a new song
app.post('/api/songs', async (req, res) => {
  try {
    if (!mongoose.connection.readyState) {
      const connected = await connectWithRetry();
      if (!connected) {
        return res.status(503).json({ error: 'Database connection failed' });
      }
    }
    const newSong = new Song(req.body);
    await newSong.save();
    res.json({ success: true, song: newSong });
  } catch (error) {
    console.error('Error saving song:', error);
    res.status(500).json({ error: 'Failed to save song' });
  }
});

// Clean up database
app.get('/api/songs/cleanup', async (req, res) => {
  try {
    if (!mongoose.connection.readyState) {
      const connected = await connectWithRetry();
      if (!connected) {
        return res.status(503).json({ error: 'Database connection failed' });
      }
    }
    const songs = await Song.find();
    const cleanedSongs = songs.map(item => {
      if (!item.song.artists && item.song.artist) {
        return item;
      }
      
      const simplifiedSong = {
        id: item.song.id,
        name: item.song.name,
        artist: item.song.artists ? item.song.artists[0].name : item.song.artist || 'Unknown Artist',
        albumImage: item.song.album && item.song.album.images && item.song.album.images.length > 1 
          ? item.song.album.images[1].url
          : item.song.album && item.song.album.images && item.song.album.images.length > 0
            ? item.song.album.images[0].url
            : item.song.albumImage || null,
      };
      
      return {
        ...item.toObject(),
        song: simplifiedSong
      };
    });
    
    await Promise.all(cleanedSongs.map(async (song) => {
      await Song.findByIdAndUpdate(song._id, { song: song.song });
    }));
    
    res.json({ success: true, message: 'Database cleaned successfully', count: cleanedSongs.length });
  } catch (error) {
    console.error('Error cleaning database:', error);
    res.status(500).json({ error: 'Failed to clean database' });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1;
  res.json({
    status: 'ok',
    database: dbStatus ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Serve the React app for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 