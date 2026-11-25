#!/usr/bin/env node
/**
 * Start All Cameras in Shinobi
 *
 * Problem: Cameras have mode="start" but started=null (not actually running)
 * Solution: Call /monitor/{groupKey}/{monitorId}/start for each camera
 *
 * Usage: node src/scripts/start-all-cameras.js
 */

const axios = require('axios');
const config = require('../config/env');

const SHINOBI_URL = config.shinobi.url;
const API_KEY = config.shinobi.apiKey;
const GROUP_KEY = '6b17427adfc70df0b5415ffd73a1e243';

async function startAllCameras() {
  try {
    console.log('🔍 Fetching all monitors...\n');

    const { data: monitors } = await axios.get(
      `${SHINOBI_URL}/${API_KEY}/monitor/${GROUP_KEY}`
    );

    if (!Array.isArray(monitors)) {
      console.error('❌ No monitors found');
      return;
    }

    console.log(`📊 Found ${monitors.length} monitors\n`);

    let started = 0;
    let skipped = 0;
    let errors = 0;

    for (const monitor of monitors) {
      console.log(`📹 ${monitor.name} (${monitor.mid})`);
      console.log(`   Mode: ${monitor.mode}, Started: ${monitor.started || 'null'}`);

      // Skip if already started
      if (monitor.started === 'yes' || monitor.started === '1') {
        console.log('   ✅ Already running\n');
        skipped++;
        continue;
      }

      try {
        // Start the monitor
        console.log('   ▶️  Starting...');
        const { data } = await axios.get(
          `${SHINOBI_URL}/${API_KEY}/monitor/${GROUP_KEY}/${monitor.mid}/start`
        );

        if (data && data.ok !== false) {
          console.log('   ✅ Started successfully\n');
          started++;
        } else {
          console.log(`   ⚠️  Start response: ${JSON.stringify(data)}\n`);
        }
      } catch (err) {
        console.log(`   ❌ Error: ${err.message}\n`);
        errors++;
      }

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('='.repeat(60));
    console.log(`✅ Camera startup complete!`);
    console.log(`   Started: ${started} cameras`);
    console.log(`   Already running: ${skipped} cameras`);
    console.log(`   Errors: ${errors} cameras`);
    console.log('='.repeat(60));

    console.log('\n💡 Wait ~10 seconds for HLS streams to initialize');
    console.log('   Then test: curl http://localhost:8443/.../hls/.../s.m3u8');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
    process.exit(1);
  }
}

startAllCameras();
