/**
 * Start All Shinobi Monitors - Actually trigger monitors to begin streaming
 * This physically starts FFmpeg processes for each monitor
 */

const axios = require('axios');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const SHINOBI_URL = process.env.SHINOBI_URL || 'http://localhost:8443';

const client = axios.create({
  baseURL: SHINOBI_URL,
  timeout: 10000,
});

// Get all unique group keys from database
async function getAllGroupKeys() {
  const mysql = require('mysql2/promise');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const [rows] = await connection.query(
    'SELECT DISTINCT group_key, api_key FROM users WHERE group_key IS NOT NULL AND api_key IS NOT NULL'
  );

  await connection.end();
  return rows;
}

// Get all monitors for a group
async function getMonitors(apiKey, groupKey) {
  try {
    const { data } = await client.get(`/${apiKey}/monitor/${groupKey}`);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`Failed to get monitors for group ${groupKey}:`, error.message);
    return [];
  }
}

// Start a monitor using the correct API endpoint
async function startMonitor(apiKey, groupKey, monitorId) {
  try {
    // First check current status
    const { data: monitors } = await client.get(`/${apiKey}/monitor/${groupKey}`);
    const monitor = Array.isArray(monitors) ? monitors.find(m => m.mid === monitorId) : null;

    if (!monitor) {
      throw new Error('Monitor not found');
    }

    // If already started, skip
    if (monitor.status === 'started' || monitor.status === 'running') {
      return { alreadyRunning: true, status: monitor.status };
    }

    // Trigger start
    const { data } = await client.get(`/${apiKey}/monitor/${groupKey}/${monitorId}/start`);

    // Wait a moment for FFmpeg to spawn
    await new Promise(resolve => setTimeout(resolve, 1000));

    return data;
  } catch (error) {
    throw new Error(`Start failed: ${error.message}`);
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting All Shinobi Monitors...\n');
  console.log(`📡 Shinobi URL: ${SHINOBI_URL}\n`);

  try {
    const groups = await getAllGroupKeys();
    console.log(`✅ Found ${groups.length} user group(s)\n`);

    let totalStarted = 0;
    let totalAlreadyRunning = 0;
    let totalFailed = 0;

    for (const { group_key, api_key } of groups) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Processing Group: ${group_key}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      const monitors = await getMonitors(api_key, group_key);
      console.log(`📹 Found ${monitors.length} monitors\n`);

      if (monitors.length === 0) continue;

      for (const monitor of monitors) {
        try {
          console.log(`▶️  Starting: ${monitor.name} (${monitor.mid})...`);

          const result = await startMonitor(api_key, group_key, monitor.mid);

          if (result.alreadyRunning) {
            console.log(`   ⏭️  Already running (${result.status})`);
            totalAlreadyRunning++;
          } else {
            console.log(`   ✅ Started successfully`);
            totalStarted++;
          }
        } catch (error) {
          console.error(`   ❌ Failed:`, error.message);
          totalFailed++;
        }

        // Delay between starts to avoid overwhelming Shinobi
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Newly started: ${totalStarted} monitors`);
    console.log(`⏭️  Already running: ${totalAlreadyRunning} monitors`);
    console.log(`❌ Failed: ${totalFailed} monitors`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (totalStarted > 0) {
      console.log('🎥 Monitors are now streaming!');
      console.log('   Wait 10-15 seconds for HLS playlists to generate');
      console.log('   Then refresh your Live View page\n');
    }

    // Check FFmpeg processes
    console.log('Checking FFmpeg processes...');
    const { exec } = require('child_process');
    exec('docker exec shinobi ps aux | grep ffmpeg | grep -v defunct | grep -v grep | wc -l', (error, stdout) => {
      if (!error) {
        const count = parseInt(stdout.trim());
        console.log(`📹 Active FFmpeg processes: ${count}`);
        if (count > 0) {
          console.log('✅ VIDEO STREAMING IS WORKING!\n');
        } else {
          console.log('⚠️  No FFmpeg processes found - monitors may not be connected to cameras\n');
        }
      }
    });

  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
