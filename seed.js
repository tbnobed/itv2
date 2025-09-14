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
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || '1234';
const USER_PASSCODE = process.env.USER_PASSCODE || '1111';

async function seedDatabase() {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  try {
    console.log('🌱 Starting database seeding...');

    // Create admin account
    console.log('👑 Creating admin account...');
    const adminHashedPasscode = await bcrypt.hash(ADMIN_PASSCODE + PASSCODE_PEPPER, SALT_ROUNDS);
    
    const adminQuery = `
      INSERT INTO users (id, username, password, role, is_active, created_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
      ON CONFLICT (username) DO UPDATE SET
        password = EXCLUDED.password,
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active
      RETURNING id, username, role;
    `;
    
    const adminResult = await pool.query(adminQuery, [
      'obtv-admin',
      adminHashedPasscode,
      'admin',
      'true',
      new Date().toISOString()
    ]);
    
    console.log(`✅ Admin user: ${adminResult.rows[0].username} (ID: ${adminResult.rows[0].id})`);

    // Create regular user account
    console.log('👤 Creating regular user account...');
    const userHashedPasscode = await bcrypt.hash(USER_PASSCODE + PASSCODE_PEPPER, SALT_ROUNDS);
    
    const userQuery = `
      INSERT INTO users (id, username, password, role, is_active, created_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
      ON CONFLICT (username) DO UPDATE SET
        password = EXCLUDED.password,
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active
      RETURNING id, username, role;
    `;
    
    const userResult = await pool.query(userQuery, [
      'obtv-user',
      userHashedPasscode,
      'user',
      'true',
      new Date().toISOString()
    ]);
    
    console.log(`✅ Regular user: ${userResult.rows[0].username} (ID: ${userResult.rows[0].id})`);

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
          INSERT INTO studios (id, name, thumbnail, description, status, feed_count, created_at)
          VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
          RETURNING id;
        `;
        
        const studioResult = await pool.query(studioQuery, [
          studio.name,
          studio.thumbnail,
          studio.description,
          studio.status,
          studio.feedCount,
          new Date().toISOString()
        ]);
        
        studioIds.push(studioResult.rows[0].id);
        console.log(`✅ Created studio: ${studio.name}`);
      }

      // Create initial streams
      const streamData = [
        {
          title: 'Featured Live Production',
          thumbnail: '/generated_images/Featured_live_production_15b7d8b1.png',
          streamId: 'FP001',
          url: 'webrtc://localhost:1985/live/featured',
          category: 'featured',
          studioId: null
        },
        {
          title: 'Studio A Main Feed',
          thumbnail: '/generated_images/Studio_A_control_room_42819489.png',
          streamId: 'SA001',
          url: 'webrtc://localhost:1985/live/studio-a-main',
          category: 'studios',
          studioId: studioIds[0]
        },
        {
          title: 'Studio B Camera 1',
          thumbnail: '/generated_images/Studio_A_control_room_42819489.png',
          streamId: 'SB001',
          url: 'webrtc://localhost:1985/live/studio-b-cam1',
          category: 'studios',
          studioId: studioIds[1]
        }
      ];

      for (const stream of streamData) {
        const streamQuery = `
          INSERT INTO streams (id, title, thumbnail, stream_id, url, category, studio_id, created_at)
          VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7);
        `;
        
        await pool.query(streamQuery, [
          stream.title,
          stream.thumbnail,
          stream.streamId,
          stream.url,
          stream.category,
          stream.studioId,
          new Date().toISOString()
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