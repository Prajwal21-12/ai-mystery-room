import { app } from './app.js';
import { connectToDatabase, disconnectFromDatabase, formatMongoConnectionError } from './config/database.js';
import { env } from './config/env.js';

const database = await connectToDatabase().then(
  (connection) => connection,
  (error) => {
    console.error('MongoDB connection failed.', formatMongoConnectionError(error));
    console.info('Continuing with in-memory development fixtures.');
    return { status: 'disconnected' };
  },
);

const server = app.listen(env.PORT, () => {
  console.info(`AI Mystery Room API listening on http://localhost:${env.PORT}`);
  if (!env.GEMINI_API_KEY || !env.GEMINI_MODEL) console.info('Gemini generation is not configured because GEMINI_API_KEY or GEMINI_MODEL is missing; no AI provider connection will be attempted.');
  if (database.status !== 'connected') console.info(`Database status: ${database.status}.`);
});

async function shutdown(signal) {
  console.info(`${signal} received. Closing API server.`);
  server.close(async () => {
    await disconnectFromDatabase();
    process.exit(process.exitCode || 0);
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
