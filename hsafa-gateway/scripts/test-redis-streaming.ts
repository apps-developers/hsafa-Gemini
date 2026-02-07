#!/usr/bin/env npx ts-node
/**
 * Redis Streaming Test Script
 * 
 * This script helps you test and visualize the Redis streaming events.
 * 
 * Usage:
 *   # Monitor a specific run's stream
 *   npx ts-node scripts/test-redis-streaming.ts run <runId>
 *   
 *   # Monitor a smart space's stream  
 *   npx ts-node scripts/test-redis-streaming.ts smartspace <smartSpaceId>
 *   
 *   # List all streams
 *   npx ts-node scripts/test-redis-streaming.ts list
 *   
 *   # Read all events from a run's stream
 *   npx ts-node scripts/test-redis-streaming.ts read <runId>
 */

import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function parseRedisFields(fields: string[]): Record<string, string> {
  const fieldMap: Record<string, string> = {};
  for (let i = 0; i < fields.length; i += 2) {
    fieldMap[fields[i]] = fields[i + 1];
  }
  return fieldMap;
}

function getEventColor(type: string): string {
  if (type.includes('error') || type.includes('failed')) return colors.red;
  if (type.includes('start')) return colors.green;
  if (type.includes('end') || type.includes('finish') || type.includes('completed')) return colors.blue;
  if (type.includes('delta')) return colors.yellow;
  if (type.includes('tool')) return colors.magenta;
  if (type.includes('reasoning')) return colors.cyan;
  return colors.reset;
}

function formatEvent(id: string, fields: Record<string, string>) {
  const type = fields.type || 'unknown';
  const ts = fields.ts || '';
  const payload = fields.payload ? JSON.parse(fields.payload) : {};
  
  const color = getEventColor(type);
  const timeStr = ts ? new Date(ts).toLocaleTimeString() : '';
  
  console.log(`${colors.dim}[${id}]${colors.reset} ${colors.dim}${timeStr}${colors.reset}`);
  console.log(`  ${color}${colors.bright}${type}${colors.reset}`);
  
  // Pretty print payload based on event type
  if (type === 'text-delta' || type === 'reasoning-delta') {
    console.log(`  ${colors.dim}delta:${colors.reset} "${payload.delta || ''}"`);
  } else if (type === 'tool-input-available') {
    console.log(`  ${colors.dim}tool:${colors.reset} ${payload.toolName}`);
    console.log(`  ${colors.dim}input:${colors.reset}`, JSON.stringify(payload.input, null, 2).split('\n').map((l, i) => i === 0 ? l : '    ' + l).join('\n'));
  } else if (type === 'tool-output-available') {
    console.log(`  ${colors.dim}tool:${colors.reset} ${payload.toolName}`);
    console.log(`  ${colors.dim}output:${colors.reset}`, JSON.stringify(payload.output, null, 2).split('\n').map((l, i) => i === 0 ? l : '    ' + l).join('\n'));
  } else if (type === 'tool-input-delta') {
    console.log(`  ${colors.dim}tool:${colors.reset} ${payload.toolName}`);
    console.log(`  ${colors.dim}delta:${colors.reset} "${payload.inputTextDelta || ''}"`);
    if (payload.partialInput) {
      console.log(`  ${colors.dim}partial:${colors.reset}`, JSON.stringify(payload.partialInput));
    }
  } else if (Object.keys(payload).length > 0) {
    const payloadStr = JSON.stringify(payload, null, 2);
    if (payloadStr.length < 200) {
      console.log(`  ${colors.dim}payload:${colors.reset}`, payloadStr);
    } else {
      console.log(`  ${colors.dim}payload:${colors.reset}`, payloadStr.substring(0, 200) + '...');
    }
  }
  console.log();
}

async function monitorStream(streamKey: string) {
  console.log(`${colors.bright}Monitoring stream: ${streamKey}${colors.reset}`);
  console.log(`${colors.dim}Press Ctrl+C to stop${colors.reset}\n`);

  // Get the last ID to start from
  const last = await redis.xrevrange(streamKey, '+', '-', 'COUNT', 1);
  let lastId = Array.isArray(last) && last.length > 0 ? last[0][0] : '0-0';

  // Subscribe to notifications
  const subscriber = redis.duplicate();
  const notifyChannel = streamKey.replace(':stream', ':notify');

  subscriber.on('message', async () => {
    const newEvents = await redis.xread('STREAMS', streamKey, lastId);
    if (newEvents && newEvents.length > 0) {
      for (const [, messages] of newEvents) {
        for (const [id, fields] of messages) {
          const fieldMap = parseRedisFields(fields);
          formatEvent(id, fieldMap);
          lastId = id;
        }
      }
    }
  });

  await subscriber.subscribe(notifyChannel);
  console.log(`${colors.green}Subscribed to ${notifyChannel}${colors.reset}\n`);

  // Keep alive
  process.on('SIGINT', async () => {
    console.log(`\n${colors.dim}Unsubscribing...${colors.reset}`);
    await subscriber.unsubscribe(notifyChannel);
    await subscriber.quit();
    await redis.quit();
    process.exit(0);
  });
}

async function readStream(streamKey: string) {
  console.log(`${colors.bright}Reading all events from: ${streamKey}${colors.reset}\n`);

  const events = await redis.xrange(streamKey, '-', '+');
  
  if (!events || events.length === 0) {
    console.log(`${colors.yellow}No events found in stream${colors.reset}`);
    return;
  }

  console.log(`${colors.green}Found ${events.length} events${colors.reset}\n`);

  for (const [id, fields] of events) {
    const fieldMap = parseRedisFields(fields);
    formatEvent(id, fieldMap);
  }
}

async function listStreams() {
  console.log(`${colors.bright}Listing Redis streams...${colors.reset}\n`);

  // Scan for run streams
  const runStreams: string[] = [];
  let cursor = '0';
  do {
    const [newCursor, keys] = await redis.scan(cursor, 'MATCH', 'run:*:stream', 'COUNT', 100);
    cursor = newCursor;
    runStreams.push(...keys);
  } while (cursor !== '0');

  // Scan for smartspace streams
  const smartSpaceStreams: string[] = [];
  cursor = '0';
  do {
    const [newCursor, keys] = await redis.scan(cursor, 'MATCH', 'smartSpace:*:stream', 'COUNT', 100);
    cursor = newCursor;
    smartSpaceStreams.push(...keys);
  } while (cursor !== '0');

  console.log(`${colors.cyan}Run Streams (${runStreams.length}):${colors.reset}`);
  for (const key of runStreams.slice(0, 20)) {
    const len = await redis.xlen(key);
    const runId = key.replace('run:', '').replace(':stream', '');
    console.log(`  ${colors.dim}${runId}${colors.reset} (${len} events)`);
  }
  if (runStreams.length > 20) {
    console.log(`  ${colors.dim}... and ${runStreams.length - 20} more${colors.reset}`);
  }

  console.log();
  console.log(`${colors.magenta}SmartSpace Streams (${smartSpaceStreams.length}):${colors.reset}`);
  for (const key of smartSpaceStreams.slice(0, 20)) {
    const len = await redis.xlen(key);
    const ssId = key.replace('smartSpace:', '').replace(':stream', '');
    console.log(`  ${colors.dim}${ssId}${colors.reset} (${len} events)`);
  }
  if (smartSpaceStreams.length > 20) {
    console.log(`  ${colors.dim}... and ${smartSpaceStreams.length - 20} more${colors.reset}`);
  }
}

async function main() {
  const [, , command, id] = process.argv;

  try {
    switch (command) {
      case 'run':
        if (!id) {
          console.error('Usage: npx ts-node scripts/test-redis-streaming.ts run <runId>');
          process.exit(1);
        }
        await monitorStream(`run:${id}:stream`);
        break;

      case 'smartspace':
        if (!id) {
          console.error('Usage: npx ts-node scripts/test-redis-streaming.ts smartspace <smartSpaceId>');
          process.exit(1);
        }
        await monitorStream(`smartSpace:${id}:stream`);
        break;

      case 'read':
        if (!id) {
          console.error('Usage: npx ts-node scripts/test-redis-streaming.ts read <runId>');
          process.exit(1);
        }
        await readStream(`run:${id}:stream`);
        await redis.quit();
        break;

      case 'list':
        await listStreams();
        await redis.quit();
        break;

      default:
        console.log(`
${colors.bright}Redis Streaming Test Script${colors.reset}

${colors.cyan}Commands:${colors.reset}
  ${colors.green}run <runId>${colors.reset}        - Monitor a run's stream in real-time
  ${colors.green}smartspace <id>${colors.reset}   - Monitor a smart space's stream in real-time
  ${colors.green}read <runId>${colors.reset}       - Read all events from a run's stream
  ${colors.green}list${colors.reset}               - List all streams in Redis

${colors.cyan}Examples:${colors.reset}
  npx ts-node scripts/test-redis-streaming.ts run abc123-def456
  npx ts-node scripts/test-redis-streaming.ts smartspace xyz789
  npx ts-node scripts/test-redis-streaming.ts list

${colors.cyan}Event Types:${colors.reset}
  ${colors.green}start${colors.reset}              - Message start
  ${colors.yellow}text-delta${colors.reset}         - Text content chunk
  ${colors.cyan}reasoning-delta${colors.reset}    - Reasoning/thinking chunk
  ${colors.magenta}tool-input-start${colors.reset}   - Tool call initiated
  ${colors.magenta}tool-input-delta${colors.reset}   - Tool args streaming (with partial JSON)
  ${colors.magenta}tool-input-available${colors.reset} - Tool call complete (full JSON input)
  ${colors.magenta}tool-output-available${colors.reset} - Tool result (full JSON output)
  ${colors.blue}finish${colors.reset}             - Message complete
        `);
        await redis.quit();
    }
  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset}`, error);
    await redis.quit();
    process.exit(1);
  }
}

main();
