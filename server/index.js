/**
 * Server entry point — starts the HTTP listener.
 */
import { createApp } from './app.js';
import { config, warnAboutConfig } from './config.js';

const app = createApp();

const server = app.listen(config.port, () => {
  warnAboutConfig();
  console.log('');
  console.log('  ┌─────────────────────────────────────────────┐');
  console.log('  │  PikuFlix server is running                  │');
  console.log('  └─────────────────────────────────────────────┘');
  console.log(`  → Local:   http://localhost:${config.port}`);
  console.log(`  → Env:     ${config.env}`);
  console.log('');
});

// Graceful shutdown so containers stop cleanly.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    console.log(`\n[server] ${signal} received — shutting down.`);
    server.close(() => process.exit(0));
  });
}
