import mongoose from 'mongoose';

async function connectDatabase() {
  const databaseUri = process.env.MONGODB_URI;

  if (!databaseUri) {
    console.warn('MONGODB_URI is not set. The server will run without a database connection.');
    return;
  }

  await mongoose.connect(databaseUri);
  console.log('MongoDB connected successfully.');
}

export default connectDatabase;
