console.log('Serverless function started');

// Log raw MONGODB_URI from process.env
console.log('Raw MONGODB_URI from process.env:', process.env.MONGODB_URI);

import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// const PORT = process.env.PORT || 3001; // PORT is not used in Vercel serverless

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// MongoDB Schema
const artistSchema = new mongoose.Schema({
  id: String,
  name: String
}, { _id: false }); // Disable _id for subdocuments if not needed

const imageSchema = new mongoose.Schema({
  height: Number,
  width: Number,
  url: String
}, { _id: false }); // Disable _id for subdocuments if not needed

const albumSchema = new mongoose.Schema({
    id: String,
    name: String,
    images: [imageSchema]
}, { _id: false }); // Disable _id for subdocuments if not needed

const songContentSchema = new mongoose.Schema({
    id: String,
    name: String,
    artists: [artistSchema],
    album: albumSchema,
    uri: String,
    popularity: Number
}, { _id: false }); // Disable _id for subdocuments if not needed

const songSchema = new mongoose.Schema({
  id: Number,
  song: songContentSchema,
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
    // Log the actual URI being used (masking password)
    const maskedUri = mongoUri.replace(/mongodb:\/\/(.+?):(.+?)@/, 'mongodb://$1:********@');
    console.log('Using MONGODB_URI:', maskedUri);
    console.log('MONGODB_URI is read. Length:', mongoUri.length); // Log presence and length
    console.log('MONGODB_URI starts with:', mongoUri.substring(0, 25) + '...'); // Log start of URI

    // Ensure the connection string is properly formatted
    const formattedUri = mongoUri.trim();

    console.log('Connecting to MongoDB with formatted URI...');
    await mongoose.connect(formattedUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 15000, // Increased timeout
      socketTimeoutMS: 45000,
      connectTimeoutMS: 15000, // Increased connect timeout
      retryWrites: true,
      retryReads: true,
      readPreference: 'secondaryPreferred'
    });

    console.log('Successfully connected to MongoDB');
    // Log the connected database name and collection name
    console.log('Connected database name:', mongoose.connection.name);
    console.log('Song model collection name:', Song.collection.name);
    return true;
  } catch (error) {
    console.error('MongoDB connection error during connectWithRetry:', error.message);
    // Log more detailed error information
    if (error.name === 'MongoServerSelectionError') {
      console.error('Could not connect to MongoDB server. Please check your connection string, network settings, and firewall rules.');
    } else if (error.name === 'MongoParseError') {
      console.error('Invalid MongoDB connection string format.');
    }
     else {
        console.error('Detailed MongoDB connection error object:', error);
    }
    return false;
  }
};

// Connect to MongoDB when the serverless function is initialized
console.log('Initiating initial MongoDB connection...');
connectWithRetry().then(success => {
  if (!success) {
    console.error('Initial MongoDB connection failed');
  } else {
      console.log('Initial MongoDB connection successful');
  }
}).catch(err => {
    console.error('Error during initial MongoDB connection promise handling:', err);
});

// Get all songs
app.get('/api/songs', async (req, res) => {
  console.log('Received GET /api/songs request'); // Log request received
  try {
    if (mongoose.connection.readyState !== 1) {
      console.log('Database not connected, attempting reconnect...');
      const connected = await connectWithRetry();
      if (!connected) {
        console.error('Database connection failed on GET request');
        return res.status(503).json({ error: 'Database connection failed' });
      }
      console.log('Database reconnected successfully');
    }
    const songs = await Song.findOne().select('song.artists song.album.images song.id song.name song.album.id song.album.name song.uri song.popularity number owner').lean();
    console.log(`Found ${songs.length} songs`); // Log number of songs found

    // Log the raw songs array retrieved from the database
    console.log('Raw songs array from database:', songs);

    // Log the raw song data before formatting for debugging
    console.log('Raw song data for first 5 items:', songs.slice(0, 5).map(item => item.song));

    // Apply mapping logic to format songs for the frontend with more robust data extraction
    const formattedSongs = songs.map(item => {
        // Add detailed logging here
        console.log(`Processing song: ${item.song?.name || 'Unknown'} (ID: ${item.song?.id || 'Unknown'}`);
        console.log('item.song:', item.song);
        console.log('item.song.artists:', item.song?.artists);
        console.log('item.song.album.images:', item.song?.album?.images);

        // Find a suitable album image URL
        let albumImageUrl = null;
        if (item.song?.album?.images && item.song.album.images.length > 0) {
            // Try to find a 300x300 image first
            const mediumImage = item.song.album.images.find(image => image.height === 300 || image.width === 300);
            if (mediumImage?.url) {
                albumImageUrl = mediumImage.url;
            } else {
                // Otherwise, take the URL of the first image with a URL
                 albumImageUrl = item.song.album.images.find(image => image.url)?.url || null;
            }
        }
         // Fallback to old albumImage property if no suitable image found in nested structure
        if (!albumImageUrl && item.song?.albumImage) {
             albumImageUrl = item.song.albumImage;
        }

        const simplifiedSong = {
            _id: item._id, // Include _id for delete operations
            id: item.song?.id, // Use optional chaining for safety
            name: item.song?.name || 'Unknown Song', // Use optional chaining and fallback
            // More robust artist extraction
            artist: (item.song?.artists && item.song.artists.length > 0 
                      ? item.song.artists.map(artist => artist.name).join(', ') 
                      : item.song?.artist) || 'Unknown Artist', 
            albumImage: albumImageUrl,
            number: item.number || '', // Fallback for number
            owner: item.owner || 'Unknown Owner', // Fallback for owner
            popularity: item.song?.popularity || 0 // Fallback for popularity
          };
          return simplifiedSong;
    });

    console.log('First few formatted songs:', formattedSongs.slice(0, 5)); // Log example formatted data

    res.json(formattedSongs);
  } catch (error) {
    console.error('Error fetching songs:', error);
    res.status(500).json({ error: 'Failed to fetch songs' });
  }
});

// Add a new song
app.post('/api/songs', async (req, res) => {
  console.log('Received POST /api/songs request'); // Log request received
  try {
    if (mongoose.connection.readyState !== 1) {
      console.log('Database not connected, attempting reconnect...');
      const connected = await connectWithRetry();
      if (!connected) {
        console.error('Database connection failed on POST request');
        return res.status(503).json({ error: 'Database connection failed' });
      }
      console.log('Database reconnected successfully');
    }
    const newSong = new Song(req.body);
    console.log('Saving new song:', newSong); // Log the song being saved
    await newSong.save();
    console.log('Song saved successfully'); // Log successful save
    res.json({ success: true, song: newSong });
  } catch (error) {
    console.error('Error saving song:', error);
    res.status(500).json({ error: 'Failed to save song' });
  }
});

// Add DELETE endpoint for songs
app.delete('/api/songs/:id', async (req, res) => {
  console.log('Received DELETE /api/songs/:id request', req.params.id); // Log request received
  try {
    if (mongoose.connection.readyState !== 1) {
      console.log('Database not connected, attempting reconnect...');
      const connected = await connectWithRetry();
      if (!connected) {
        console.error('Database connection failed on DELETE request');
        return res.status(503).json({ error: 'Database connection failed' });
      }
      console.log('Database reconnected successfully');
    }
    const songId = req.params.id;
    // Validate if the ID is a valid Mongoose ObjectId if necessary
    // if (!mongoose.Types.ObjectId.isValid(songId)) {
    //   return res.status(400).json({ error: 'Invalid song ID' });
    // }
    
    const result = await Song.findByIdAndDelete(songId);

    if (!result) {
      console.log('Song not found for deletion:', songId);
      return res.status(404).json({ error: 'Song not found' });
    }

    console.log('Song deleted successfully:', songId);
    res.json({ success: true, message: 'Song deleted successfully' });
  } catch (error) {
    console.error('Error deleting song:', error);
    res.status(500).json({ error: 'Failed to delete song' });
  }
});

// Clean up database
app.get('/api/songs/cleanup', async (req, res) => {
  console.log('Received GET /api/songs/cleanup request'); // Log request received
  try {
    if (mongoose.connection.readyState !== 1) {
      console.log('Database not connected, attempting reconnect...');
      const connected = await connectWithRetry();
      if (!connected) {
        console.error('Database connection failed on cleanup request');
        return res.status(503).json({ error: 'Database connection failed' });
      }
      console.log('Database reconnected successfully');
    }
    const songs = await Song.find();
    const cleanedSongs = songs.map(item => {
      if (!item.song.artists && item.song.artist) {
        return item;
      }
      
      const simplifiedSong = {
        id: item.song.id,
        name: item.song.name,
        artist: item.song.artists && item.song.artists.length > 0 ? item.song.artists[0].name : item.song.artist || 'Unknown Artist',
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
    
    console.log('Database cleanup completed'); // Log successful cleanup
    res.json({ success: true, message: 'Database cleaned successfully', count: cleanedSongs.length });
  } catch (error) {
    console.error('Error cleaning database:', error);
    res.status(500).json({ error: 'Failed to clean database' });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  console.log('Received GET /api/health request'); // Log request received
  const dbStatus = mongoose.connection.readyState === 1;
  console.log(`Database status: ${dbStatus ? 'connected' : 'disconnected'}`); // Log database status
  res.json({
    status: 'ok',
    database: dbStatus ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Serve the React app for any other routes - NOT NEEDED in Vercel serverless for static assets
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, 'dist', 'index.html'));
// });

// Export the app for Vercel serverless
export default app; 