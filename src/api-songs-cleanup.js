// This file should be created at api/songs/cleanup.js in your project root
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

    // Check if the database file exists
    if (!fs.existsSync(DATABASE_PATH)) {
      // Create an empty database if it doesn't exist
      fs.writeFileSync(DATABASE_PATH, JSON.stringify([]), 'utf8');
      return res.status(200).json({ success: true, message: 'Database initialized' });
    }

    // Read the existing database just to verify it's valid JSON
    const rawData = fs.readFileSync(DATABASE_PATH, 'utf8');
    const songs = JSON.parse(rawData);
    
    // No actual cleanup needed in this simple implementation
    // In a more complex app, you might check for orphaned records, etc.
    
    return res.status(200).json({ success: true, message: 'Database cleanup completed' });
  } catch (error) {
    console.error('Error during database cleanup:', error);
    return res.status(500).json({ error: 'Failed to perform database cleanup' });
  }
}