require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const DATABASE_FILE = path.join(__dirname, 'songDatabase.json');

// MongoDB Schema (must match the one in server.js)
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

const migrateData = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI is not defined in your .env file. Please add it.');
    process.exit(1);
  }

  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Read data from JSON file
    console.log(`Reading data from ${DATABASE_FILE}...`);
    const data = fs.readFileSync(DATABASE_FILE, 'utf8');
    const songsToMigrate = JSON.parse(data);
    console.log(`Found ${songsToMigrate.length} songs in the JSON file.`);

    // Clear existing data in the collection (optional, but good for a clean migration)
    console.log('Clearing existing songs in MongoDB collection...');
    await Song.deleteMany({});
    console.log('Existing songs cleared.');

    // Insert data into MongoDB
    if (songsToMigrate.length > 0) {
      console.log('Inserting songs into MongoDB...');
      const result = await Song.insertMany(songsToMigrate);
      console.log(`Successfully inserted ${result.length} songs into MongoDB.`);
    } else {
      console.log('No songs to insert.');
    }

  } catch (error) {
    console.error('Error during data migration:', error);
  } finally {
    // Disconnect from MongoDB
    console.log('Disconnecting from MongoDB...');
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
};

migrateData(); 