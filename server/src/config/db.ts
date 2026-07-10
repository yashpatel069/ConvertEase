import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  try {
    // Disable buffering so queries fail immediately if database is offline instead of waiting
    mongoose.set('bufferCommands', false);
    
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/convertease';
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected successfully.');
  } catch (error) {
    console.error('Error connecting to MongoDB. The server will remain active and auto-reconnect once MongoDB is available:', error);
  }
};
