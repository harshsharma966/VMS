#!/usr/bin/env node
/**
 * Enable Continuous HLS Streaming for All Cameras
 *
 * Problem: Cameras in "record" mode don't continuously stream HLS (only during motion)
 * Solution: Enable both continuous HLS streaming + motion-triggered recording
 *
 * How it works:
 * - Set stream_type: 'hls' → Continuous HLS stream for live view
 * - Keep mode: 'record' → Still records to MP4 on motion
 * - The stream and recording run independently
 *
 * Usage: node src/scripts/enable-continuous-streaming.js
 */

const axios = require('axios');
const config = require('../config/env');
const logger = require('../config/logger');

const SHINOBI_URL = config.shinobi.url;
const API_KEY = config.shinobi.apiKey;
const GROUP_KEY = '6b17427adfc70df0b5415ffd73a1e243';

async function enableContinuousStreaming() {
  try {
    console.log('🔍 Fetching all monitors from Shinobi...');

    const { data: monitors } = await axios.get(
      `${SHINOBI_URL}/${API_KEY}/monitor/${GROUP_KEY}`
    );

    if (!Array.isArray(monitors)) {
      console.error('❌ No monitors found or invalid response');
      return;
    }

    console.log(`📊 Found ${monitors.length} monitors`);

    let updated = 0;
    let skipped = 0;
    let restarted = 0;

    for (const monitor of monitors) {
      const details = JSON.parse(monitor.details || '{}');

      console.log(`\n📹 Monitor: ${monitor.name} (${monitor.mid})`);
      console.log(`   Current mode: ${monitor.mode}`);
      console.log(`   Stream type: ${details.stream_type || 'not set'}`);

      // Check if already configured for continuous streaming
      if (details.stream_type === 'hls' && details.stream_channels && details.stream_channels !== '0') {
        console.log('   ✅ Already configured for continuous streaming');
        skipped++;
        continue;
      }

      // Update details to enable continuous HLS streaming
      details.stream_type = 'hls';
      details.stream_channels = '1'; // Enable streaming channel (independent of recording)
      details.hls_time = '2';
      details.hls_list_size = '5';
      details.hls_flags = 'delete_segments+omit_endlist';

      // Rebuild monitor config
      const updatedConfig = {
        ...monitor,
        mode: 'record', // Keep record mode for MP4 recording on motion
        details: JSON.stringify(details)
      };

      // Update monitor
      console.log('   🔧 Enabling continuous HLS streaming...');
      await axios.post(
        `${SHINOBI_URL}/${API_KEY}/configureMonitor/${GROUP_KEY}/${monitor.mid}`,
        { data: JSON.stringify(updatedConfig) }
      );

      // Restart monitor to apply changes (stop then start)
      console.log('   🔄 Restarting monitor...');
      await axios.get(`${SHINOBI_URL}/${API_KEY}/monitor/${GROUP_KEY}/${monitor.mid}/stop`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s
      await axios.get(`${SHINOBI_URL}/${API_KEY}/monitor/${GROUP_KEY}/${monitor.mid}/start`);

      console.log('   ✅ Updated and restarted successfully');
      updated++;
      restarted++;

      // Small delay to avoid overwhelming Shinobi
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Continuous streaming configuration complete!`);
    console.log(`   Updated:  ${updated} cameras`);
    console.log(`   Skipped:  ${skipped} cameras`);
    console.log(`   Restarted: ${restarted} cameras`);
    console.log('='.repeat(60));

    console.log('\n💡 Tip: Test live streaming in the frontend now!');
    console.log('   HLS URLs should now work even when no motion is detected.');

  } catch (error) {
    console.error('❌ Error enabling continuous streaming:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the script
enableContinuousStreaming();
