/**
 * Add username and password columns to cameras table
 * Then update all cameras with NVR credentials
 */

const db = require('../src/models');

async function addCredentialsFields() {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Database connected');

    // Add username and password columns
    console.log('\n📝 Adding username and password columns...');

    await db.sequelize.query(`
      ALTER TABLE cameras
      ADD COLUMN IF NOT EXISTS username VARCHAR(100),
      ADD COLUMN IF NOT EXISTS password VARCHAR(255);
    `);

    console.log('✅ Columns added successfully');

    // Update all cameras with NVR credentials
    console.log('\n🔐 Updating all cameras with credentials...');

    const [updateCount] = await db.sequelize.query(`
      UPDATE cameras
      SET
        username = 'admin',
        password = 'Synoweb@abc123cd'
      WHERE username IS NULL OR username = '';
    `);

    console.log(`✅ Updated credentials for cameras`);

    // Verify
    const cameras = await db.Camera.findAll({ limit: 3 });
    console.log('\n📹 Sample cameras:');
    cameras.forEach(c => {
      console.log(`   ${c.name}: ${c.username}:${c.password ? '***' : '(none)'}`);
    });

    console.log('\n✅ Migration complete!');
    console.log('\n📝 Next step: Run the enable-video-streaming script again');
    console.log('   node scripts/enable-video-streaming.js');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
  } finally {
    await db.sequelize.close();
  }
}

addCredentialsFields();
