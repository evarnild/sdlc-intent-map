#!/usr/bin/env node
// `npm start -- [<repo>] [--port <n>]`: serves the intent map of an SDLC-kit
// repository on 127.0.0.1 (B1-B3). It opens no browser and writes nothing.
import { parseArgs, startServer } from '../src/server/server.mjs';

try {
  const { repo, port } = parseArgs(process.argv.slice(2));
  const { url, root } = await startServer({ repo, port });
  console.log(`Intent map for ${root}: ${url}`);
} catch (e) {
  console.error(`intent-map: ${e.message}`);
  process.exit(1);
}
