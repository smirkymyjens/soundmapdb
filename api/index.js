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
    }, { _id: false }); // Still disable _id for subdocuments if not needed

    const imageSchema = new mongoose.Schema({
      height: Number,
      width: Number,
      url: String
    }, { _id: false }); // Still disable _id for subdocuments if not needed

    const albumSchema = new mongoose.Schema({
        id: String,
        name: String,
        images: [imageSchema]
    }, { _id: false }); // Still disable _id for subdocuments if not needed

    // Main song schema with flattened fields
    const songSchema = new mongoose.Schema({
      // Using Spotify song ID as a regular field. Mongoose _id will be the primary key.
      spotifyId: String, // Store the Spotify ID here (previously song.id)
      name: String,      // Previously song.name
      artists: [artistSchema], // Previously song.artists
      album: albumSchema,       // Previously song.album
      uri: String,       // Previously song.uri
      popularity: Number,// Previously song.popularity
      number: String,    // Remains the same
      owner: String      // Remains the same
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

    // Query the songs collection. We no longer need to select deeply nested fields explicitly
    const songs = await Song.find().lean();
    console.log(`Found ${songs.length} songs`); // Log number of songs found

    // Log the raw songs array retrieved from the database
    console.log('Raw songs array from database:', songs);

    // Apply mapping logic to format songs for the frontend with robust data extraction from flattened structure
    const formattedSongs = songs.map(item => {
        // Update logs for flattened structure
        console.log(`Processing song: ${item.name || 'Unknown'} (ID: ${item.spotifyId || item._id})`);
        console.log('item:', item); // Log the entire item for debugging
        console.log('item.artists:', item.artists);
        console.log('item.album?.images:', item.album?.images);


        // Find a suitable album image URL from the flattened album structure
        let albumImageUrl = null;
        if (item.album?.images && item.album.images.length > 0) {
            // Try to find a 300x300 image first
            const mediumImage = item.album.images.find(image => image.height === 300 || image.width === 300);
            if (mediumImage?.url) {
                albumImageUrl = mediumImage.url;
            } else {
                // Otherwise, take the URL of the first image with a URL
                albumImageUrl = item.album.images.find(image => image.url)?.url || null;
            }
        }
        // Fallback to an old albumImage property if needed (ensure this property exists in your data if used)
        if (!albumImageUrl && item.albumImage) { // Note: albumImage is not in new schema, remove if not needed
            albumImageUrl = item.albumImage;
        }

        const simplifiedSong = {
            _id: item._id, // Include _id for delete operations
            id: item.spotifyId, // Use the new spotifyId field
            name: item.name || 'Unknown Song', // Use flattened name
            // More robust artist extraction from flattened artists array
            artist: (item.artists && item.artists.length > 0
                      ? item.artists.map(artist => artist.name).join(', ')
                      : item.artist) || 'Unknown Artist', // Use flattened artists
            albumImage: albumImageUrl,
            number: item.number || '', // Use flattened number
            owner: item.owner || 'Unknown Owner', // Use flattened owner
            popularity: item.popularity || 0 // Use flattened popularity
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
    const newSong = {
      spotifyId: req.body.spotifyId, // Use the Spotify track ID as spotifyId
      name: req.body.name,
      artists: req.body.artists, // Spotify data already has artists as an array of objects
      album: req.body.album,   // Spotify data already has album as an object with images
      uri: req.body.uri,
      popularity: req.body.popularity,
      number: req.body.number, // Get from input field
      owner: req.body.owner         // Get from input field
    };
    console.log('Saving new song:', newSong); // Log the song being saved
    const song = new Song(newSong);
    await song.save();
    console.log('Song saved successfully'); // Log successful save
    res.json({ success: true, song: song });
  } catch (error) {
    console.error('Error saving song:', error);
    res.status(500).json({ error: 'Failed to save song' });
  }
});

// Add DELETE endpoint for songs
app.delete('/api/songs/:id', async (req, res) => {
  console.log('DELETE /api/songs/:id route hit', req.params.id); // Add this log
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
    
    const cleanupPromises = songs.map(async (item) => {
      // Access properties directly from the flattened item
      let needsUpdate = false;
      const update = {};

      // Example: Ensure artists is an array and format artist string if needed
      if (item.artists && Array.isArray(item.artists)) {
          const artistString = item.artists.map(artist => artist.name).join(', ');
          // You might decide if you want to store this artist string permanently
          // If you want to add it, uncomment the line below:
          // update.artist = artistString;
          // needsUpdate = true;
      } else if (item.artist) {
          // If there's an old 'artist' string field but no 'artists' array, potentially convert it
          // This logic depends on what your cleanup intends to fix
          // console.log(`Song ${item._id} has old artist string: ${item.artist}`);
          // You might want to create an 'artists' array from the 'artist' string
          // update.artists = [{ name: item.artist }];
          // delete update.artist; // Remove the old field
          // needsUpdate = true;
      }

      // Example: Find and potentially store album image URL
      let albumImageUrl = null;
      if (item.album?.images && item.album.images.length > 0) {
          const mediumImage = item.album.images.find(image => image.height === 300 || image.width === 300);
          if (mediumImage?.url) {
              albumImageUrl = mediumImage.url;
          } else {
              albumImageUrl = item.album.images.find(image => image.url)?.url || null;
          }
          // If you want to add this derived image URL permanently, uncomment below:
          // update.albumImage = albumImageUrl;
          // needsUpdate = true;
      } else if (item.albumImage) {
          // If there's an old albumImage string but no album/images, handle it
          // This depends on your cleanup goal
          // console.log(`Song ${item._id} has old albumImage string: ${item.albumImage}`);
          // You might want to populate the album/images structure or just keep it.
      }

      // Add other cleanup/migration logic here if needed for other fields
      // For example, ensuring required fields exist or have default values.

      if (needsUpdate) {
        console.log(`Updating song ${item._id}`, update);
        // Update the document at the top level, not nested under 'song'
        return Song.findByIdAndUpdate(item._id, update, { new: true });
      } else {
        return Promise.resolve(item); // No update needed for this item
      }
    });
    
    await Promise.all(cleanupPromises);
    
    console.log('Database cleanup completed'); // Log successful cleanup
    // Consider returning a summary of changes if needed
    res.json({ success: true, message: 'Database cleanup completed.' });

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