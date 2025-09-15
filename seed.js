#!/usr/bin/env node

/**
 * Database Seeding Script
 * Creates admin accounts and initial data for OBTV Streaming Platform
 * This runs during Docker deployment to ensure admin accounts are always created
 */

import { Pool } from 'pg';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;
const PASSCODE_PEPPER = process.env.PASSCODE_PEPPER || 'obtv-universal-pepper-change-in-production';

// Safe seeding configuration
const SAFE_SEED_USERS = process.env.SAFE_SEED_USERS === 'true';
const REMOVE_DEFAULT_DEMOS = process.env.REMOVE_DEFAULT_DEMOS === 'true';

// Configurable user accounts
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'obtv-admin';
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || '1234';
const USER_USERNAME = process.env.USER_USERNAME || 'obtv-user';
const USER_PASSCODE = process.env.USER_PASSCODE || '1111';

// Production safety checks
if (process.env.NODE_ENV === 'production' && !SAFE_SEED_USERS) {
  console.error('❌ CRITICAL: SAFE_SEED_USERS must be true in production to prevent data loss');
  process.exit(1);
}

async function seedDatabase() {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  try {
    console.log('🌱 Starting database seeding...');
    
    if (SAFE_SEED_USERS) {
      console.log('🔒 Safe seeding mode enabled - preserving existing users');
    }
    
    if (REMOVE_DEFAULT_DEMOS) {
      console.log('🗑️ Removing default demo accounts...');
      await pool.query(`DELETE FROM users WHERE username IN ('obtv-admin', 'obtv-user') AND role IN ('admin', 'user')`);
      console.log('✅ Default demo accounts removed');
    }

    // Create admin account
    console.log(`👑 Creating admin account: ${ADMIN_USERNAME}...`);
    const adminHashedPasscode = await bcrypt.hash(ADMIN_PASSCODE + PASSCODE_PEPPER, SALT_ROUNDS);
    
    const adminConflictAction = SAFE_SEED_USERS ? 'DO NOTHING' : `DO UPDATE SET
        password = EXCLUDED.password,
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active`;
    
    const adminQuery = `
      INSERT INTO users (id, username, password, role, is_active, created_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
      ON CONFLICT (username) ${adminConflictAction}
      RETURNING id, username, role;
    `;
    
    const adminResult = await pool.query(adminQuery, [
      ADMIN_USERNAME,
      adminHashedPasscode,
      'admin',
      'true',
      new Date().toISOString()
    ]);
    
    if (adminResult.rows.length > 0) {
      console.log(`✅ Admin user: ${adminResult.rows[0].username} (ID: ${adminResult.rows[0].id})`);
    } else {
      console.log(`⚠️ Admin user ${ADMIN_USERNAME} already exists - preserved`);
    }

    // Create regular user account
    console.log(`👤 Creating regular user account: ${USER_USERNAME}...`);
    const userHashedPasscode = await bcrypt.hash(USER_PASSCODE + PASSCODE_PEPPER, SALT_ROUNDS);
    
    const userConflictAction = SAFE_SEED_USERS ? 'DO NOTHING' : `DO UPDATE SET
        password = EXCLUDED.password,
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active`;
    
    const userQuery = `
      INSERT INTO users (id, username, password, role, is_active, created_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
      ON CONFLICT (username) ${userConflictAction}
      RETURNING id, username, role;
    `;
    
    const userResult = await pool.query(userQuery, [
      USER_USERNAME,
      userHashedPasscode,
      'user',
      'true',
      new Date().toISOString()
    ]);
    
    if (userResult.rows.length > 0) {
      console.log(`✅ Regular user: ${userResult.rows[0].username} (ID: ${userResult.rows[0].id})`);
    } else {
      console.log(`⚠️ Regular user ${USER_USERNAME} already exists - preserved`);
    }

    // Check if studios exist, if not, create initial data
    const studioCheck = await pool.query('SELECT COUNT(*) FROM studios');
    if (parseInt(studioCheck.rows[0].count) === 0) {
      console.log('🎬 Creating initial studios and streams...');
      
      // Create studios
      const studioData = [
        {
          name: 'Studio A Control Room',
          thumbnail: '/generated_images/Studio_A_control_room_42819489.png',
          description: 'Primary broadcast control room with full production capabilities',
          status: 'online',
          feedCount: 4
        },
        {
          name: 'Studio B Production',
          thumbnail: '/generated_images/Studio_A_control_room_42819489.png',
          description: 'Secondary production studio for live programming',
          status: 'online',
          feedCount: 3
        },
        {
          name: 'Studio C Backup',
          thumbnail: '/generated_images/Studio_A_control_room_42819489.png',
          description: 'Backup studio for emergency broadcasts',
          status: 'maintenance',
          feedCount: 2
        }
      ];

      const studioIds = [];
      for (const studio of studioData) {
        const studioQuery = `
          INSERT INTO studios (id, name, thumbnail, description, status, feed_count)
          VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
          RETURNING id;
        `;
        
        const studioResult = await pool.query(studioQuery, [
          studio.name,
          studio.thumbnail,
          studio.description,
          studio.status,
          studio.feedCount
        ]);
        
        studioIds.push(studioResult.rows[0].id);
        console.log(`✅ Created studio: ${studio.name}`);
      }

      // Create initial streams with more studios
      const mobileStudioId = studioIds[2]; // We'll need more studios
      const rehearsalStudioId = studioIds[2]; // Using backup studio for now

      // Add more studios first
      const additionalStudios = [
        {
          name: 'Mobile Unit 1',
          thumbnail: '/generated_images/Featured_live_production_15b7d8b1.png',
          description: 'On-location broadcast unit for field reporting',
          status: 'online',
          feedCount: 2
        },
        {
          name: 'Rehearsal Room',
          thumbnail: '/generated_images/Studio_A_control_room_42819489.png',
          description: 'Practice and rehearsal space for productions',
          status: 'offline',
          feedCount: 1
        }
      ];

      for (const studio of additionalStudios) {
        const studioQuery = `
          INSERT INTO studios (id, name, thumbnail, description, status, feed_count)
          VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
          RETURNING id;
        `;
        
        const studioResult = await pool.query(studioQuery, [
          studio.name,
          studio.thumbnail,
          studio.description,
          studio.status,
          studio.feedCount
        ]);
        
        studioIds.push(studioResult.rows[0].id);
        console.log(`✅ Created studio: ${studio.name}`);
      }

      // Create complete stream data (24 original streams)
      const streamData = [
        // Featured streams
        {
          title: 'Featured Live Production',
          thumbnail: '/generated_images/Featured_live_production_15b7d8b1.png',
          streamId: 'FP001',
          url: 'webrtc://localhost:1985/live/featured',
          category: 'featured',
          studioId: null
        },
        {
          title: 'Prime Time Broadcast',
          thumbnail: '/generated_images/Studio_A_control_room_42819489.png',
          streamId: 'PT001',
          url: 'webrtc://localhost:1985/live/primetime',
          category: 'featured',
          studioId: null
        },
        {
          title: 'Special Event Coverage',
          thumbnail: '/generated_images/Dallas_Control_newsroom_45c1dfb2.png',
          streamId: 'SE001',
          url: 'webrtc://localhost:1985/live/special',
          category: 'featured',
          studioId: null
        },
        // Over The Air streams
        {
          title: 'Main Transmission Tower',
          thumbnail: '/generated_images/Over-the-air_broadcast_tower_04c20672.png',
          streamId: 'MT001',
          url: 'webrtc://localhost:1985/live/main-tower',
          category: 'overTheAir',
          studioId: null
        },
        {
          title: 'Backup Tower Feed',
          thumbnail: '/generated_images/Over-the-air_broadcast_tower_04c20672.png',
          streamId: 'BT001',
          url: 'webrtc://localhost:1985/live/backup-tower',
          category: 'overTheAir',
          studioId: null
        },
        {
          title: 'Repeater Station 1',
          thumbnail: '/generated_images/Over-the-air_broadcast_tower_04c20672.png',
          streamId: 'RS001',
          url: 'webrtc://localhost:1985/live/repeater-1',
          category: 'overTheAir',
          studioId: null
        },
        {
          title: 'Repeater Station 2',
          thumbnail: '/generated_images/Over-the-air_broadcast_tower_04c20672.png',
          streamId: 'RS002',
          url: 'webrtc://localhost:1985/live/repeater-2',
          category: 'overTheAir',
          studioId: null
        },
        // Live Feeds streams
        {
          title: 'Dallas Control Center',
          thumbnail: '/generated_images/Dallas_Control_newsroom_45c1dfb2.png',
          streamId: 'DC001',
          url: 'webrtc://localhost:1985/live/dallas-control',
          category: 'liveFeeds',
          studioId: null
        },
        {
          title: 'Houston Backup Center',
          thumbnail: '/generated_images/Dallas_Control_newsroom_45c1dfb2.png',
          streamId: 'HB001',
          url: 'webrtc://localhost:1985/live/houston-backup',
          category: 'liveFeeds',
          studioId: null
        },
        {
          title: 'System Monitoring',
          thumbnail: '/generated_images/Dallas_Control_newsroom_45c1dfb2.png',
          streamId: 'SM001',
          url: 'webrtc://localhost:1985/live/monitoring',
          category: 'liveFeeds',
          studioId: null
        },
        {
          title: 'Emergency Broadcast',
          thumbnail: '/generated_images/Dallas_Control_newsroom_45c1dfb2.png',
          streamId: 'EB001',
          url: 'webrtc://localhost:1985/live/emergency',
          category: 'liveFeeds',
          studioId: null
        },
        {
          title: 'Weather Station',
          thumbnail: '/generated_images/Over-the-air_broadcast_tower_04c20672.png',
          streamId: 'WS001',
          url: 'webrtc://localhost:1985/live/weather',
          category: 'liveFeeds',
          studioId: null
        },
        {
          title: 'Traffic Camera Feed',
          thumbnail: '/generated_images/Dallas_Control_newsroom_45c1dfb2.png',
          streamId: 'TC001',
          url: 'webrtc://localhost:1985/live/traffic',
          category: 'liveFeeds',
          studioId: null
        },
        // Studio A feeds
        {
          title: 'Main Camera Feed',
          thumbnail: '/generated_images/Studio_A_control_room_42819489.png',
          streamId: 'SA001',
          url: 'webrtc://localhost:1985/live/studio-a-main',
          category: 'studios',
          studioId: studioIds[0]
        },
        {
          title: 'Wide Angle Shot',
          thumbnail: '/generated_images/Studio_A_control_room_42819489.png',
          streamId: 'SA002',
          url: 'webrtc://localhost:1985/live/studio-a-wide',
          category: 'studios',
          studioId: studioIds[0]
        },
        {
          title: 'Close Up Camera',
          thumbnail: '/generated_images/Studio_A_control_room_42819489.png',
          streamId: 'SA003',
          url: 'webrtc://localhost:1985/live/studio-a-close',
          category: 'studios',
          studioId: studioIds[0]
        },
        {
          title: 'Overhead View',
          thumbnail: '/generated_images/Studio_A_control_room_42819489.png',
          streamId: 'SA004',
          url: 'webrtc://localhost:1985/live/studio-a-overhead',
          category: 'studios',
          studioId: studioIds[0]
        },
        // Studio B feeds
        {
          title: 'Main Production Feed',
          thumbnail: '/generated_images/Studio_A_control_room_42819489.png',
          streamId: 'SB001',
          url: 'webrtc://localhost:1985/live/studio-b-main',
          category: 'studios',
          studioId: studioIds[1]
        },
        {
          title: 'Alternate Angle',
          thumbnail: '/generated_images/Studio_A_control_room_42819489.png',
          streamId: 'SB002',
          url: 'webrtc://localhost:1985/live/studio-b-alt',
          category: 'studios',
          studioId: studioIds[1]
        },
        {
          title: 'Guest Camera',
          thumbnail: '/generated_images/Studio_A_control_room_42819489.png',
          streamId: 'SB003',
          url: 'webrtc://localhost:1985/live/studio-b-guest',
          category: 'studios',
          studioId: studioIds[1]
        },
        // Studio C feeds
        {
          title: 'Backup Feed',
          thumbnail: '/generated_images/Studio_A_control_room_42819489.png',
          streamId: 'SC001',
          url: 'webrtc://localhost:1985/live/studio-c-backup',
          category: 'studios',
          studioId: studioIds[2]
        },
        {
          title: 'Monitoring Camera',
          thumbnail: '/generated_images/Studio_A_control_room_42819489.png',
          streamId: 'SC002',
          url: 'webrtc://localhost:1985/live/studio-c-monitor',
          category: 'studios',
          studioId: studioIds[2]
        },
        // Mobile Unit feeds
        {
          title: 'Field Reporter Feed',
          thumbnail: '/generated_images/Featured_live_production_15b7d8b1.png',
          streamId: 'MU001',
          url: 'webrtc://localhost:1985/live/mobile-field',
          category: 'studios',
          studioId: studioIds[3]
        },
        {
          title: 'Mobile Wide Shot',
          thumbnail: '/generated_images/Featured_live_production_15b7d8b1.png',
          streamId: 'MU002',
          url: 'webrtc://localhost:1985/live/mobile-wide',
          category: 'studios',
          studioId: studioIds[3]
        },
        // Rehearsal Room feed
        {
          title: 'Rehearsal Feed',
          thumbnail: '/generated_images/Studio_A_control_room_42819489.png',
          streamId: 'RR001',
          url: 'webrtc://localhost:1985/live/rehearsal',
          category: 'studios',
          studioId: studioIds[4]
        }
      ];

      for (const stream of streamData) {
        const streamQuery = `
          INSERT INTO streams (id, title, thumbnail, stream_id, url, category, studio_id)
          VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6);
        `;
        
        await pool.query(streamQuery, [
          stream.title,
          stream.thumbnail,
          stream.streamId,
          stream.url,
          stream.category,
          stream.studioId
        ]);
        
        console.log(`✅ Created stream: ${stream.title}`);
      }
    } else {
      console.log('✅ Studios and streams already exist, skipping...');
    }

    console.log('🎉 Database seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run seeding if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase().catch(console.error);
}

export { seedDatabase };