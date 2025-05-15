// This file should be created at api/songs/add.js in your project root
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

    // Only accept POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check if the database file exists
    if (!fs.existsSync(DATABASE_PATH)) {
      // Create an empty database if it doesn't exist
      fs.writeFileSync(DATABASE_PATH, JSON.stringify([]), 'utf8');
    }

    // Read the existing database
    const rawData = fs.readFileSync(DATABASE_PATH, 'utf8');
    const songs = JSON.parse(rawData);

    // Add the new song from the request body
    const newSong = req.body;
    songs.push(newSong);

    // Write the updated database back to the file
    fs.writeFileSync(DATABASE_PATH, JSON.stringify(songs, null, 2), 'utf8');

    // Return success response
    return res.status(200).json({ success: true, message: 'Song added successfully' });
  } catch (error) {
    console.error('Error adding song to database:', error);
    return res.status(500).json({ error: 'Failed to add song to database' });
  }
}