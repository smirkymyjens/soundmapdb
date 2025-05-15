// This file should be created at api/songs/[id].js in your project root
import fs from 'fs';
import path from 'path';

// Define the path to the database file
const DATABASE_PATH = path.join(process.cwd(), 'songDatabase.json');

export default function handler(req, res) {
  try {
    // CORS headers for development
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Password');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // Only accept DELETE requests
    if (req.method !== 'DELETE') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Get the song ID from the URL parameter
    const { id } = req.query;

    // Check if the database file exists
    if (!fs.existsSync(DATABASE_PATH)) {
      return res.status(404).json({ error: 'Database file not found' });
    }

    // Read the existing database
    const rawData = fs.readFileSync(DATABASE_PATH, 'utf8');
    const songs = JSON.parse(rawData);

    // Filter out the song to delete
    const filteredSongs = songs.filter(song => song.id != id);

    // Check if a song was actually removed
    if (filteredSongs.length === songs.length) {
      return res.status(404).json({ error: 'Song not found' });
    }

    // Write the updated database back to the file
    fs.writeFileSync(DATABASE_PATH, JSON.stringify(filteredSongs, null, 2), 'utf8');

    // Return success response
    return res.status(200).json({ success: true, message: 'Song deleted successfully' });
  } catch (error) {
    console.error('Error deleting song from database:', error);
    return res.status(500).json({ error: 'Failed to delete song from database' });
  }
}