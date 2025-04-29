const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

// Connection URL
const url = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/TgServices?directConnection=true&serverSelectionTimeoutMS=30000';
const dbName = 'TgServices';

// Bot name to remove
const botNameToRemove = 'Father Time';

async function main() {
  console.log('Connecting to MongoDB...');

  // Create a new MongoClient
  const client = new MongoClient(url, {
    connectTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 30000
  });

  try {
    // Connect to the MongoDB server
    await client.connect();
    console.log('Connected to MongoDB server');

    // Get the database
    const db = client.db(dbName);

    // Get the collections
    const botsCollection = db.collection('bots');
    const destinationsCollection = db.collection('destinations');
    const authorizedUsersCollection = db.collection('authorizedusers');

    // Find all bots with the specified name
    const botsToDelete = await botsCollection.find({ name: botNameToRemove }).toArray();

    if (botsToDelete.length === 0) {
      console.log('No bots found with name:', botNameToRemove);
      return;
    }

    console.log(`Found ${botsToDelete.length} bots to delete with name "${botNameToRemove}":`);

    for (const bot of botsToDelete) {
      console.log(`\nDeleting bot:`);
      console.log(`  ID: ${bot._id}`);
      console.log(`  Name: ${bot.name}`);
      console.log(`  Token: ${bot.token}`);
      console.log(`  Active: ${bot.isActive}`);
      console.log(`  Default: ${bot.isDefault}`);

      // Delete any destinations associated with this bot
      const destinationResult = await destinationsCollection.deleteMany({ botId: bot._id });
      console.log(`  Deleted ${destinationResult.deletedCount} destinations associated with this bot`);

      // Delete any authorized users associated with this bot
      const usersResult = await authorizedUsersCollection.deleteMany({ botId: bot._id });
      console.log(`  Deleted ${usersResult.deletedCount} authorized users associated with this bot`);

      // Delete the bot
      const botResult = await botsCollection.deleteOne({ _id: bot._id });

      if (botResult.deletedCount === 1) {
        console.log('  Successfully deleted the bot');
      } else {
        console.log('  Failed to delete the bot');
      }
    }

    // No need for this code anymore as we're handling it in the loop

    // Verify the bot is gone
    const remainingBots = await botsCollection.find({}).toArray();
    console.log(`\nRemaining bots in the database (${remainingBots.length}):`);

    remainingBots.forEach((bot, index) => {
      console.log(`\nBot #${index + 1}:`);
      console.log(`  ID: ${bot._id}`);
      console.log(`  Name: ${bot.name}`);
      console.log(`  Token: ${bot.token}`);
      console.log(`  Active: ${bot.isActive}`);
      console.log(`  Default: ${bot.isDefault}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close the connection
    await client.close();
    console.log('MongoDB connection closed');
  }
}

main().catch(console.error);
