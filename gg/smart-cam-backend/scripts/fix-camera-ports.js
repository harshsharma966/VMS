/**
 * Update cameras to use port 8000 instead of 554
 */

const { Camera } = require('../src/models');
const shinobiService = require('../src/services/shinobi.service');
const axios = require('axios');

async function fixCameraPorts() {
  try {
    console.log('🔧 Updating camera ports to 8000...\n');

    // Get all cameras that use the NVR
    const cameras = await Camera.findAll({
      where: {
        host: '103.61.254.67'
      }
    });

    if (cameras.length === 0) {
      console.log('❌ No cameras found for NVR 103.61.254.67\n');
      return;
    }

    console.log(`✅ Found ${cameras.length} cameras to update\n`);

    const shinobiClient = axios.create({
      baseURL: 'http://localhost:8443',
      timeout: 10000
    });

    // Shinobi credentials (from .env)
    const apiKey = 'f07483f48995f5ada7e2033d6c7b34a4';
    const groupKey = '6b17427adfc70df0b5415ffd73a1e243';

    for (const camera of cameras) {
      try {
        console.log(`📹 Updating: ${camera.name}`);

        // Update port in database
        await camera.update({ port: 8000 });

        // Extract channel number from camera name
        const channelMatch = camera.name.match(/Camera (\d+)/);
        const channel = channelMatch ? parseInt(channelMatch[1]) : 1;
        const channelNumber = `${channel}01`;

        // Build new config with port 8000
        const updatedConfig = {
          mid: camera.monitorId,
          ke: groupKey,
          name: camera.name,
          type: 'h264',
          ext: 'mp4',
          mode: 'start',
          protocol: 'rtsp',
          host: `103.61.254.67:8000`,
          port: '8000',
          path: `/Streaming/Channels/${channelNumber}`,
          fps: '25',
          width: '1920',
          height: '1080',
          details: JSON.stringify({
            auto_host: `rtsp://admin:Synoweb@abc123cd@103.61.254.67:8000/Streaming/Channels/${channelNumber}`,
            auto_host_enable: '1',
            muser: 'admin',
            mpass: 'Synoweb@abc123cd',
            rtsp_transport: 'tcp',
            detail_streaming_type: 'h264',
            stream_type: 'hls',
            hls_time: '2',
            hls_list_size: '3',
            stream_vcodec: 'copy',
            stream_acodec: 'no',
            vcodec: 'copy',
            acodec: 'no',
            detail_resolution_w: '1920',
            detail_resolution_h: '1080',
            detail_fps: '25'
          })
        };

        // Update in Shinobi
        await shinobiClient.post(
          `/${apiKey}/configureMonitor/${groupKey}/${camera.monitorId}`,
          { data: JSON.stringify(updatedConfig) }
        );

        console.log(`   ✅ Updated to port 8000\n`);

      } catch (error) {
        console.error(`   ❌ Failed: ${error.message}\n`);
      }
    }

    console.log('🎉 Port update complete!\n');
    console.log('💡 Wait 10-15 seconds for Shinobi to reconnect to cameras');
    console.log('📱 Then refresh: http://localhost:5173/live\n');

  } catch (error) {
    console.error('❌ Failed:', error.message);
  } finally {
    process.exit(0);
  }
}

if (require.main === module) {
  fixCameraPorts();
}

module.exports = fixCameraPorts;
