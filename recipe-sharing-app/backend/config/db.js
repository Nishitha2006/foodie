import mongoose from 'mongoose';

// Connects to MongoDB using the MONGO_URI from .env.
// Exits the process with a clear message if the connection fails,
// because the API cannot work without a database.
export default async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error('❌ MONGO_URI is missing. Copy .env.example to .env and set it.');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log(`✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('   Is MongoDB running? Check MONGO_URI in backend/.env');
    process.exit(1);
  }
}
