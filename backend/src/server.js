import 'dotenv/config';

import { createServer } from 'node:http';

import app from './app.js';
import connectDatabase from './config/database.js';
import {
  initializePublicRoomSocket,
} from './services/publicRoomSocket.service.js';

const port = Number(process.env.PORT) || 5000;

const httpServer = createServer(app);

initializePublicRoomSocket(httpServer);

async function startServer() {
  await connectDatabase();

  httpServer.listen(port, () => {
    console.log(`Ghuraghuri API is running on port ${port}.`);
  });
}

startServer().catch((error) => {
  console.error('The server failed to start:', error);
  process.exit(1);
});
