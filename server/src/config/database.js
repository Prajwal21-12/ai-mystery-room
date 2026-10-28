import * as dns from 'node:dns';
import mongoose from 'mongoose';
import { env } from './env.js';

export function configureDevelopmentMongoDns({ nodeEnv = env.NODE_ENV, setDnsServers = dns.setServers } = {}) {
  if (nodeEnv !== 'development') return false;
  setDnsServers(['8.8.8.8', '8.8.4.4']);
  return true;
}

function underlyingConnectionError(error) {
  if (error?.cause) return error.cause;
  const servers = error?.reason?.servers;
  if (servers && typeof servers.values === 'function') {
    for (const server of servers.values()) if (server.error) return server.error;
  }
  return error;
}

export function formatMongoConnectionError(error) {
  const detail = underlyingConnectionError(error);
  const code = error?.code ?? detail?.code ?? detail?.cause?.code ?? null;
  let rawMessage = String(detail?.message ?? error?.message ?? 'MongoDB connection failed.');
  if (env.GEMINI_API_KEY) rawMessage = rawMessage.split(env.GEMINI_API_KEY).join('[redacted]');
  const sanitizedMessage = rawMessage
    .replace(/mongodb(?:\+srv)?:\/\/[^\s"'<>]+/gi, 'mongodb://[redacted]')
    .replace(/(password|passwd|pwd|username|user)\s*[:=]\s*(?:'[^']*'|"[^"]*"|[^\s,;]+)/gi, '$1=[redacted]')
    .replace(/for user\s+(?:'[^']*'|"[^"]*"|[^\s,;]+)/gi, 'for user [redacted]')
    .slice(0, 500);
  return {
    errorName: String(error?.name ?? 'Error').slice(0, 80),
    errorCode: typeof code === 'string' || typeof code === 'number' ? code : null,
    sanitizedMessage,
  };
}

export async function connectToDatabase() {
  if (!env.MONGODB_URI) {
    console.info('MongoDB is not configured. API liveness is available; database-backed features are not ready.');
    return { status: 'not_configured' };
  }

  configureDevelopmentMongoDns();
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  console.info('Connected to MongoDB.');
  return { status: 'connected' };
}

export function getDatabaseStatus() {
  if (!env.MONGODB_URI) return 'not_configured';
  return mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
}

export async function disconnectFromDatabase() {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}
