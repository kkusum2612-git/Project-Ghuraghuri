import 'dotenv/config';
import app from './app.js';
import connectDatabase from './config/database.js';

const port = Number(process.env.PORT) || 5000;

async function startServer() {
  await connectDatabase();

  app.listen(port, () => {
    console.log(`Ghuraghuri API is running on port ${port}.`);
  });
}

startServer().catch((error) => {
  console.error('The server failed to start:', error);
  process.exit(1);
});
