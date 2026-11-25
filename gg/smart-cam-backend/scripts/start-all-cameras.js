/**
 * Start all cameras in Shinobi
 * Forces cameras to begin streaming
 */

const axios = require('axios');
const db = require('../src/models');

const SHINOBI_URL = process.env.SHINOBI_URL || 'http://localhost:8443';

async function startAllCameras() {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Database connected');

    const users = await db.User.findAll({
      include: [{ model: db.Camera, as: 'cameras' }],
    });

    console.log(`📹 Found ${users.length} users`);

    for (const user of users) {
      if (!user.apiKey || !user.groupKey || user.cameras.length === 0) {
        continue;
      }

      console.log(`\n👤 User: ${user.email}`);
      console.log(`   Cameras: ${user.cameras.length}`);

      for (const camera of user.cameras) {
        console.log(`\n   📹 Starting camera: ${camera.name} (${camera.monitorId})`);

        try {
          // Use Shinobi's control API to start the monitor
          const response = await axios.get(
            `${SHINOBI_URL}/${user.apiKey}/monitor/${user.groupKey}/${camera.monitorId}/start`,
            { timeout: 10000 }
          );

          if (response.data && response.data.ok !== false) {
            console.log(`   ✅ Camera started successfully`);
          } else {
            console.log(`   ⚠️  Start response:`, response.data);
          }
        } catch (error) {
          console.error(`   ❌ Failed to start camera:`, error.message);
          if (error.response) {
            console.error(`      Status: ${error.response.status}`);
            console.error(`      Data:`, error.response.data);
          }
        }

        // Wait between requests
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log('\n✅ All cameras started!');
    console.log('\n📝 Next steps:');
    console.log('   1. Wait 10 seconds for streams to initialize');
    console.log('   2. Check FFmpeg processes: docker exec shinobi ps aux | grep ffmpeg');
    console.log('   3. Refresh your dashboard at http://localhost:5173/live');

  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await db.sequelize.close();
  }
}

startAllCameras();
