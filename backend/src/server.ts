import { build } from './app.js';
import { config } from './config/index.js';

async function start(): Promise<void> {
  try {
    // Build the app
    const app = await build({
      logger: {
        level: config.logLevel,
        transport: process.env.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
      },
    });
    
    // Start listening
    await app.listen({
      port: config.port,
      host: config.host,
    });
    
    console.log(`🚀 Rustic Debug server listening on http://${config.host}:${config.port}`);
    
    // Graceful shutdown
    const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
    signals.forEach(signal => {
      process.on(signal, async () => {
        console.log(`\nReceived ${signal}, shutting down gracefully...`);
        
        try {
          await app.close();
          console.log('Server closed successfully');
          process.exit(0);
        } catch (error) {
          console.error('Error during shutdown:', error);
          process.exit(1);
        }
      });
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}

export { start };