/**
 * Update cameras to use local IP 192.168.1.150 and port 554
 */

const { Camera } = require('../src/models');
const axios = require('axios');

async function fixToLocalIP() {
  try {
    console.log('🔧 Updating cameras to use local IP and correct port...\n');

    // Get all cameras with the external IP
    const cameras = await Camera.findAll({
      where: {
        host: '103.61.254.67'
      }
    });

    if (cameras.length === 0) {
      console.log('❌ No cameras found with external IP\n');
      return;
    }

    console.log(`✅ Found ${cameras.length} cameras to update\n`);

    const shinobiClient = axios.create({
      baseURL: 'http://localhost:8443',
      timeout: 10000
    });

    const apiKey = 'f07483f48995f5ada7e2033d6c7b34a4';
    const groupKey = '6b17427adfc70df0b5415ffd73a1e243';

    for (const camera of cameras) {
      try {
        console.log(`📹 Updating: ${camera.name}`);

        // Update to local IP and port 554
        await camera.update({
          host: '192.168.1.150',
          port: 554
        });

        // Extract channel number
        const channelMatch = camera.name.match(/Camera (\d+)/);
        const channel = channelMatch ? parseInt(channelMatch[1]) : 1;
        const channelNumber = `${channel}01`;

        // Build new config with local IP
        const rtspUrl = `rtsp://admin:Synoweb@abc123cd@192.168.1.150:554/Streaming/Channels/${channelNumber}`;

        const updatedConfig = {
          mid: camera.monitorId,
          ke: groupKey,
          name: camera.name,
          type: 'h264',
          ext: 'mp4',
          mode: 'start',
          protocol: 'rtsp',
          host: '192.168.1.150',
          port: '554',
          path: `/Streaming/Channels/${channelNumber}`,
          fps: '25',
          width: '1920',
          height: '1080',
          details: JSON.stringify({
            auto_host: rtspUrl,
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

        console.log(`   ✅ Updated to 192.168.1.150:554\n`);

      } catch (error) {
        console.error(`   ❌ Failed: ${error.message}\n`);
      }
    }

    console.log('🎉 IP update complete!\n');
    console.log('💡 Wait 10-15 seconds for Shinobi to connect');
    console.log('📱 Then refresh: http://localhost:5173/live\n');

  } catch (error) {
    console.error('❌ Failed:', error.message);
  } finally {
    process.exit(0);
  }
}

if (require.main === module) {
  fixToLocalIP();
}

module.exports = fixToLocalIP;
