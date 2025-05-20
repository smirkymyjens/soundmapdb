require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const DATABASE_FILE = path.join(__dirname, 'songDatabase.json');

// MongoDB Schemas (Simplified)
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
  spotifyId: String,
  name: String,
  artists: [artistSchema],
  album: albumSchema,
  uri: String,
  popularity: Number,
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

    // Insert data into MongoDB one by one after manual construction and validation
    console.log('Inserting songs into MongoDB one by one with manual construction...');
    let insertedCount = 0;
    let failedCount = 0;

    for (const songData of songsToMigrate) {
      try {
        // Manually construct the flattened document to ensure schema compliance
        const songDocument = new Song({
            spotifyId: songData.song?.id, // Map original song.id to the new spotifyId field
            name: songData.song?.name,    // Map original song.name directly
            artists: songData.song?.artists && Array.isArray(songData.song.artists) // Map and ensure artists array structure
                ? songData.song.artists.map(artist => ({ id: artist.id, name: artist.name }))
                : [],
             album: songData.song?.album ? { // Map the original album object directly
                id: songData.song.album.id,
                name: songData.song.album.name,
                 images: songData.song.album.images && Array.isArray(songData.song.album.images) // Map and ensure images array structure
                    ? songData.song.album.images.map(image => ({ url: image.url, height: image.height, width: image.width }))
                    : [],
             } : undefined, // Handle cases where album might be missing
            uri: songData.song?.uri,        // Map original song.uri directly
            popularity: songData.song?.popularity, // Map original song.popularity directly
            number: songData.number,        // Keep existing mapping for number
            owner: songData.owner,          // Keep existing mapping for owner
        });

        // Validate the document against the schema
        await songDocument.validate();

        // Log the document structure being saved (optional, but helpful for debugging)
        // console.log('Saving document structure:', JSON.stringify(songDocument, null, 2));

        // Save the document to the database
        await songDocument.save();
        insertedCount++;
        // console.log(`Successfully inserted song: ${songData.song.name}`); // Optional: Log each song
      } catch (error) {
        failedCount++;
        console.error(`Failed to insert song: ${songData.song?.name || 'Unknown Song'}. Error:`, error.message);
         // Log more detailed validation errors if available
        if (error.errors) {
            for (const field in error.errors) {
                console.error(`  Validation Error for field ${field}: ${error.errors[field].message}`);
            }
        }
         // Log the original songData that failed to insert
        console.error('  Original songData that failed:', JSON.stringify(songData, null, 2));
      }
    }

    console.log(`Migration finished. Successfully inserted ${insertedCount} songs, failed to insert ${failedCount} songs.`);

  } catch (error) {
    console.error('Error during data migration setup:', error);
  } finally {
    // Disconnect from MongoDB
    console.log('Disconnecting from MongoDB...');
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    // Do not process.exit(0) here, let it finish naturally or on error
  }
};

migrateData(); 