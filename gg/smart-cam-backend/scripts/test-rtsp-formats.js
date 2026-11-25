/**
 * Test different RTSP URL formats for Hikvision NVR
 */

const axios = require('axios');

const RTSP_FORMATS = [
  { name: 'Standard Hikvision', path: '/Streaming/Channels/101' },
  { name: 'Simple format', path: '/' },
  { name: 'Channel format', path: '/ch01.264' },
  { name: 'H264 format', path: '/h264/ch1/main/av_stream' },
  { name: 'Alternative', path: '/cam/realmonitor?channel=1&subtype=0' }
];

async function testRTSPFormats() {
  const shinobiClient = axios.create({
    baseURL: 'http://localhost:8443',
    timeout: 10000
  });

  const apiKey = 'f07483f48995f5ada7e2033d6c7b34a4';
  const groupKey = '6b17427adfc70df0b5415ffd73a1e243';
  const testMonitorId = 'test-rtsp-format';

  console.log('🧪 Testing different RTSP URL formats...\n');
  console.log('This will create a test monitor and try different paths\n');

  for (const format of RTSP_FORMATS) {
    try {
      console.log(`📹 Testing: ${format.name}`);
      console.log(`   Path: ${format.path}`);

      const rtspUrl = `rtsp://admin:Synoweb@abc123cd@103.61.254.67:8000${format.path}`;
      console.log(`   Full URL: rtsp://admin:***@103.61.254.67:8000${format.path}`);

      const config = {
        mid: testMonitorId,
        ke: groupKey,
        name: `TEST - ${format.name}`,
        type: 'h264',
        ext: 'mp4',
        mode: 'start',
        protocol: 'rtsp',
        host: '103.61.254.67:8000',
        port: '8000',
        path: format.path,
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
          acodec: 'no'
        })
      };

      await shinobiClient.post(
        `/${apiKey}/configureMonitor/${groupKey}/${testMonitorId}`,
        { data: JSON.stringify(config) }
      );

      console.log(`   ⏳ Waiting 5 seconds for connection test...\n`);
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Check status
      const response = await shinobiClient.get(
        `/${apiKey}/monitor/${groupKey}/${testMonitorId}`
      );

      const status = response.data[0]?.status || 'Unknown';
      const code = response.data[0]?.code || '';

      console.log(`   Status: ${status} ${code ? `(code: ${code})` : ''}`);

      if (status !== 'Died') {
        console.log(`   ✅ SUCCESS! This format works!\n`);
        console.log(`🎉 Working RTSP format found: ${format.path}\n`);
        process.exit(0);
      } else {
        console.log(`   ❌ Failed\n`);
      }

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}\n`);
    }
  }

  console.log('❌ None of the RTSP formats worked.\n');
  console.log('💡 Possible issues:');
  console.log('   - RTSP authentication method different');
  console.log('   - Cameras not actually connected to NVR');
  console.log('   - NVR RTSP disabled');
  console.log('   - Try accessing cameras directly (not through NVR)\n');

  process.exit(1);
}

if (require.main === module) {
  testRTSPFormats();
}

module.exports = testRTSPFormats;
