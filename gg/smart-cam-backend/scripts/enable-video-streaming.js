/**
 * Enable video streaming (HLS) for all existing cameras in Shinobi
 * This updates camera configurations to enable actual video streams instead of just snapshots
 */

const axios = require('axios');
const db = require('../src/models');

const SHINOBI_URL = process.env.SHINOBI_URL || 'http://localhost:8443';

async function enableVideoStreaming() {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Database connected');

    // Get all users with cameras
    const users = await db.User.findAll({
      include: [{
        model: db.Camera,
        as: 'cameras',
      }],
    });

    console.log(`📹 Found ${users.length} users`);

    for (const user of users) {
      if (!user.apiKey || !user.groupKey) {
        console.log(`⚠️  User ${user.email} has no Shinobi credentials, skipping...`);
        continue;
      }

      console.log(`\n👤 Processing user: ${user.email}`);
      console.log(`   API Key: ${user.apiKey}`);
      console.log(`   Group Key: ${user.groupKey}`);
      console.log(`   Cameras: ${user.cameras.length}`);

      for (const camera of user.cameras) {
        console.log(`\n   📹 Updating camera: ${camera.name} (${camera.monitorId})`);

        const auth = camera.username ? `${camera.username}:${camera.password || ''}@` : '';
        const streamPath = camera.path && !camera.path.startsWith('/') ? `/${camera.path}` : (camera.path || '/');
        const fullUrl = `rtsp://${auth}${camera.host}:${camera.port}${streamPath}`;

        // Build Shinobi configuration with HLS streaming enabled
        const shinobiConfig = {
          mid: camera.monitorId,
          ke: user.groupKey,
          name: camera.name,
          type: camera.type || 'h264',
          ext: 'mp4',
          mode: 'start',  // Start the camera
          protocol: 'rtsp',
          host: `${auth}${camera.host}:${camera.port}`,
          port: String(camera.port),
          path: streamPath,
          fps: String(camera.fps || 30),
          width: String(camera.width || 1920),
          height: String(camera.height || 1080),
          details: JSON.stringify({
            auto_host: fullUrl,
            auto_host_enable: '1',
            muser: camera.username || '',
            mpass: camera.password || '',
            rtsp_transport: 'tcp',
            detail_streaming_type: camera.type || 'h264',

            // ===== ENABLE HLS STREAMING =====
            stream_type: 'hls',           // Enable HLS output
            hls_time: '2',                // 2-second segments
            hls_list_size: '3',           // Keep last 3 segments
            stream_vcodec: 'copy',        // Copy video codec (no re-encoding)
            stream_acodec: 'no',          // No audio

            // ===== VIDEO RECORDING =====
            vcodec: 'copy',               // Copy video for recording
            acodec: 'no',                 // No audio recording

            // ===== RESOLUTION & FPS =====
            detail_resolution_w: String(camera.width || 1920),
            detail_resolution_h: String(camera.height || 1080),
            detail_fps: String(camera.fps || 30),

            // ===== ADDITIONAL STREAM SETTINGS =====
            stream_fps: String(camera.fps || 30),
            stream_quality: '50',         // Stream quality (lower = better quality, higher CPU)
            snap: '1',                    // Enable snapshots
            snap_fps: '1',                // 1 snapshot per second
          }),
        };

        try {
          // Update camera configuration in Shinobi
          const response = await axios.post(
            `${SHINOBI_URL}/${user.apiKey}/configureMonitor/${user.groupKey}/${camera.monitorId}`,
            { data: JSON.stringify(shinobiConfig) },
            { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
          );

          if (response.data && response.data.ok) {
            console.log(`   ✅ Camera updated successfully`);
            console.log(`      HLS streaming enabled`);
            console.log(`      Mode: start`);
            console.log(`      Stream type: HLS`);
          } else {
            console.log(`   ⚠️  Update response:`, response.data);
          }
        } catch (error) {
          console.error(`   ❌ Failed to update camera:`, error.message);
          if (error.response) {
            console.error(`      Status: ${error.response.status}`);
            console.error(`      Data:`, error.response.data);
          }
        }

        // Wait a bit between cameras to avoid overwhelming Shinobi
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('\n✅ All cameras updated!');
    console.log('\n📝 Next steps:');
    console.log('   1. Restart Shinobi: docker restart shinobi');
    console.log('   2. Wait 30 seconds for cameras to reconnect');
    console.log('   3. Check FFmpeg processes: docker exec shinobi ps aux | grep ffmpeg');
    console.log('   4. Refresh your dashboard and check for HLS streams');

  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await db.sequelize.close();
  }
}

enableVideoStreaming();
