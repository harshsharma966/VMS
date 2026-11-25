#!/usr/bin/env node
/**
 * Fix Camera Streaming Mode
 *
 * Problem: stream_channels broke Shinobi (expected array, got string)
 * Solution: Change mode from "record" to "start" for continuous HLS streaming
 *
 * Mode differences:
 * - "start" mode: Continuous HLS streaming (NO recording to disk)
 * - "record" mode: Only streams during motion detection + records to MP4
 *
 * For this VMS, we want: Continuous live streaming + Cloud recording via backend
 * So we use "start" mode and let the backend handle S3 uploads separately.
 *
 * Usage: node src/scripts/fix-streaming-mode.js
 */

const axios = require('axios');
const config = require('../config/env');

const SHINOBI_URL = config.shinobi.url;
const API_KEY = config.shinobi.apiKey;
const GROUP_KEY = '6b17427adfc70df0b5415ffd73a1e243';

async function fixStreamingMode() {
  try {
    console.log('🔍 Fetching all monitors...');

    const { data: monitors } = await axios.get(
      `${SHINOBI_URL}/${API_KEY}/monitor/${GROUP_KEY}`
    );

    if (!Array.isArray(monitors)) {
      console.error('❌ No monitors found');
      return;
    }

    console.log(`📊 Found ${monitors.length} monitors\n`);

    let updated = 0;
    let skipped = 0;

    for (const monitor of monitors) {
      const details = JSON.parse(monitor.details || '{}');

      console.log(`📹 ${monitor.name} (${monitor.mid})`);
      console.log(`   Current mode: ${monitor.mode}`);

      // Remove broken stream_channels field
      if (details.stream_channels) {
        delete details.stream_channels;
        console.log('   🧹 Removed broken stream_channels field');
      }

      // Skip if already in start mode
      if (monitor.mode === 'start') {
        console.log('   ✅ Already in start mode\n');
        skipped++;
        continue;
      }

      // Update to start mode for continuous streaming
      const updatedConfig = {
        ...monitor,
        mode: 'start', // Enable continuous HLS streaming
        details: JSON.stringify(details)
      };

      console.log('   🔧 Changing to start mode...');
      await axios.post(
        `${SHINOBI_URL}/${API_KEY}/configureMonitor/${GROUP_KEY}/${monitor.mid}`,
        { data: JSON.stringify(updatedConfig) }
      );

      // Restart monitor
      console.log('   🔄 Restarting...');
      await axios.get(`${SHINOBI_URL}/${API_KEY}/monitor/${GROUP_KEY}/${monitor.mid}/stop`);
      await new Promise(resolve => setTimeout(resolve, 500));
      await axios.get(`${SHINOBI_URL}/${API_KEY}/monitor/${GROUP_KEY}/${monitor.mid}/start`);

      console.log('   ✅ Updated successfully\n');
      updated++;

      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log('='.repeat(60));
    console.log(`✅ Streaming mode fix complete!`);
    console.log(`   Updated: ${updated} cameras`);
    console.log(`   Skipped: ${skipped} cameras (already in start mode)`);
    console.log('='.repeat(60));
    console.log('\n💡 All cameras now in "start" mode → Continuous HLS streaming enabled');
    console.log('📝 Note: Recording to MP4 disabled. Use backend S3 recording instead.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
    process.exit(1);
  }
}

fixStreamingMode();
