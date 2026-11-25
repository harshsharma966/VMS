/**
 * Update cameras to use external IP 103.61.254.67 with port 554
 */

const { Camera } = require('../src/models');
const axios = require('axios');

async function useExternalIP() {
  try {
    console.log('🌐 Updating cameras to use external IP with port 554...\n');

    // Get all cameras
    const cameras = await Camera.findAll({
      where: {
        name: {
          [require('sequelize').Op.like]: 'Camera %'
        }
      }
    });

    if (cameras.length === 0) {
      console.log('❌ No cameras found\n');
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

        // Update to external IP and port 554
        await camera.update({
          host: '103.61.254.67',
          port: 554
        });

        // Extract channel number
        const channelMatch = camera.name.match(/Camera (\d+)/);
        const channel = channelMatch ? parseInt(channelMatch[1]) : 1;
        const channelNumber = `${channel}01`;

        // Build config with external IP and port 554
        const rtspUrl = `rtsp://admin:Synoweb@abc123cd@103.61.254.67:554/Streaming/Channels/${channelNumber}`;

        const updatedConfig = {
          mid: camera.monitorId,
          ke: groupKey,
          name: camera.name,
          type: 'h264',
          ext: 'mp4',
          mode: 'start',
          protocol: 'rtsp',
          host: '103.61.254.67',
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

        console.log(`   ✅ Updated to 103.61.254.67:554`);
        console.log(`   RTSP: rtsp://103.61.254.67:554/Streaming/Channels/${channelNumber}\n`);

      } catch (error) {
        console.error(`   ❌ Failed: ${error.message}\n`);
      }
    }

    console.log('─'.repeat(60));
    console.log('🎉 Update complete!\n');
    console.log('💡 Next steps:');
    console.log('   1. Wait 15-20 seconds for Shinobi to connect');
    console.log('   2. Refresh: http://localhost:5173/live');
    console.log('   3. Select a camera and click HLS or MJPEG');
    console.log('   4. If still failing, port 554 might need forwarding\n');

  } catch (error) {
    console.error('❌ Failed:', error.message);
  } finally {
    process.exit(0);
  }
}

if (require.main === module) {
  useExternalIP();
}

module.exports = useExternalIP;
