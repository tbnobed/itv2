import { type User, type InsertUser, type Stream, type InsertStream, type Studio, type InsertStudio, users, streams, studios } from "../shared/schema";
import { randomUUID } from "crypto";
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPgSimple from "connect-pg-simple";
import { db } from "./db";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // Session store
  sessionStore: any;
  
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserRole(id: string, role: string): Promise<boolean>;
  updateUserStatus(id: string, isActive: string): Promise<boolean>;
  
  // Stream operations
  getAllStreams(): Promise<Stream[]>;
  getStreamsByCategory(category: string): Promise<Stream[]>;
  getStreamsByStudio(studioId: string): Promise<Stream[]>;
  getStream(id: string): Promise<Stream | undefined>;
  createStream(stream: InsertStream): Promise<Stream>;
  updateStream(id: string, stream: Partial<InsertStream>): Promise<Stream | undefined>;
  deleteStream(id: string): Promise<boolean>;
  
  // Studio operations
  getAllStudios(): Promise<Studio[]>;
  getStudio(id: string): Promise<Studio | undefined>;
  createStudio(studio: InsertStudio): Promise<Studio>;
  updateStudio(id: string, studio: Partial<InsertStudio>): Promise<Studio | undefined>;
  deleteStudio(id: string): Promise<boolean>;
}

const MemoryStore = createMemoryStore(session);

export class MemStorage implements IStorage {
  public sessionStore: any;
  private users: Map<string, User>;
  private streams: Map<string, Stream>;
  private studios: Map<string, Studio>;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    this.users = new Map();
    this.streams = new Map();
    this.studios = new Map();
    this.seedData();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      username: insertUser.username,
      password: insertUser.password,
      role: insertUser.role || 'user',
      id,
      isActive: 'true',
      createdAt: new Date().toISOString()
    };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async updateUserRole(id: string, role: string): Promise<boolean> {
    const user = this.users.get(id);
    if (!user) return false;
    
    user.role = role as "admin" | "user";
    this.users.set(id, user);
    return true;
  }

  async updateUserStatus(id: string, isActive: string): Promise<boolean> {
    const user = this.users.get(id);
    if (!user) return false;
    
    user.isActive = isActive;
    this.users.set(id, user);
    return true;
  }

  // Stream operations
  async getAllStreams(): Promise<Stream[]> {
    return Array.from(this.streams.values());
  }

  async getStreamsByCategory(category: string): Promise<Stream[]> {
    return Array.from(this.streams.values()).filter(stream => stream.category === category);
  }

  async getStreamsByStudio(studioId: string): Promise<Stream[]> {
    return Array.from(this.streams.values()).filter(stream => stream.studioId === studioId);
  }

  async getStream(id: string): Promise<Stream | undefined> {
    return this.streams.get(id);
  }

  async createStream(insertStream: InsertStream): Promise<Stream> {
    const id = randomUUID();
    const stream: Stream = {
      ...insertStream,
      id,
      studioId: insertStream.studioId ?? null,
      streamType: insertStream.streamType ?? 'webrtc',
    };
    this.streams.set(id, stream);
    
    // Update feed count for associated studio
    if (stream.studioId) {
      const studio = this.studios.get(stream.studioId);
      if (studio) {
        studio.feedCount += 1;
        this.studios.set(stream.studioId, studio);
      }
    }
    
    return stream;
  }

  async updateStream(id: string, updateData: Partial<InsertStream>): Promise<Stream | undefined> {
    const existing = this.streams.get(id);
    if (!existing) return undefined;
    
    const updated: Stream = { ...existing, ...updateData };
    this.streams.set(id, updated);
    return updated;
  }

  async deleteStream(id: string): Promise<boolean> {
    const stream = this.streams.get(id);
    if (!stream) return false;
    
    // Update feed count for associated studio
    if (stream.studioId) {
      const studio = this.studios.get(stream.studioId);
      if (studio && studio.feedCount > 0) {
        studio.feedCount -= 1;
        this.studios.set(stream.studioId, studio);
      }
    }
    
    return this.streams.delete(id);
  }

  // Studio operations
  async getAllStudios(): Promise<Studio[]> {
    return Array.from(this.studios.values());
  }

  async getStudio(id: string): Promise<Studio | undefined> {
    return this.studios.get(id);
  }

  async createStudio(insertStudio: InsertStudio): Promise<Studio> {
    const id = randomUUID();
    const studio: Studio = {
      ...insertStudio,
      id,
      feedCount: insertStudio.feedCount ?? 0,
    };
    this.studios.set(id, studio);
    return studio;
  }

  async updateStudio(id: string, updateData: Partial<InsertStudio>): Promise<Studio | undefined> {
    const existing = this.studios.get(id);
    if (!existing) return undefined;
    
    const updated: Studio = { ...existing, ...updateData };
    this.studios.set(id, updated);
    return updated;
  }

  async deleteStudio(id: string): Promise<boolean> {
    // Also delete all streams associated with this studio
    const studioStreams = Array.from(this.streams.values()).filter(stream => stream.studioId === id);
    studioStreams.forEach(stream => this.streams.delete(stream.id));
    
    return this.studios.delete(id);
  }

  private seedData(): void {
    // Seed initial studio data
    const studioData: Omit<Studio, 'id'>[] = [
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
      },
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

    const studioIds: string[] = [];
    studioData.forEach(studioData => {
      const id = randomUUID();
      const newStudio: Studio = { ...studioData, id };
      this.studios.set(id, newStudio);
      studioIds.push(id);
    });

    // Seed initial stream data
    const streamDataEntries: Omit<Stream, 'id'>[] = [
      // Featured streams
      {
        title: 'Featured Live Production',
        thumbnail: '/generated_images/Featured_live_production_15b7d8b1.png',
        streamId: 'FP001',
        url: 'http://cdn1.obedtv.live:2024/rtc/v1/whep/?app=live&stream=FP001',
        category: 'featured',
        studioId: null,
        streamType: 'webrtc'
      },
      {
        title: 'Prime Time Broadcast',
        thumbnail: '/generated_images/Studio_A_control_room_42819489.png',
        streamId: 'PT001',
        url: 'http://cdn2.obedtv.live:1990/rtc/v1/whep/?app=live&stream=PT001',
        category: 'featured',
        studioId: null,
        streamType: 'webrtc'
      },
      {
        title: 'Special Event Coverage',
        thumbnail: '/generated_images/Dallas_Control_newsroom_45c1dfb2.png',
        streamId: 'SE001',
        url: 'http://cdn3.obedtv.live:2020/rtc/v1/whep/?app=live&stream=SE001',
        category: 'featured',
        studioId: null,
        streamType: 'webrtc'
      },
      // Over The Air streams
      {
        title: 'Main Transmission Tower',
        thumbnail: '/generated_images/Over-the-air_broadcast_tower_04c20672.png',
        streamId: 'MT001',
        url: 'http://cdn1.obedtv.live:2024/rtc/v1/whep/?app=live&stream=MT001',
        category: 'overTheAir',
        studioId: null,
        streamType: 'webrtc'
      },
      {
        title: 'Backup Tower Feed',
        thumbnail: '/generated_images/Over-the-air_broadcast_tower_04c20672.png',
        streamId: 'BT001',
        url: 'http://cdn2.obedtv.live:1990/rtc/v1/whep/?app=live&stream=BT001',
        category: 'overTheAir',
        studioId: null,
        streamType: 'webrtc'
      },
      {
        title: 'Repeater Station 1',
        thumbnail: '/generated_images/Over-the-air_broadcast_tower_04c20672.png',
        streamId: 'RS001',
        url: 'http://cdn3.obedtv.live:2020/rtc/v1/whep/?app=live&stream=RS001',
        category: 'overTheAir',
        studioId: null,
        streamType: 'webrtc'
      },
      {
        title: 'Repeater Station 2',
        thumbnail: '/generated_images/Over-the-air_broadcast_tower_04c20672.png',
        streamId: 'RS002',
        url: 'http://cdn4.obedtv.live:2023/rtc/v1/whep/?app=live&stream=RS002',
        category: 'overTheAir',
        studioId: null,
        streamType: 'webrtc'
      },
      // Live Feeds streams
      {
        title: 'Dallas Control Center',
        thumbnail: '/generated_images/Dallas_Control_newsroom_45c1dfb2.png',
        streamId: 'DC001',
        url: 'http://cdn1.obedtv.live:2024/rtc/v1/whep/?app=live&stream=DC001',
        category: 'liveFeeds',
        studioId: null,
        streamType: 'webrtc'
      },
      {
        title: 'Houston Backup Center',
        thumbnail: '/generated_images/Dallas_Control_newsroom_45c1dfb2.png',
        streamId: 'HB001',
        url: 'http://cdn2.obedtv.live:1990/rtc/v1/whep/?app=live&stream=HB001',
        category: 'liveFeeds',
        studioId: null,
        streamType: 'webrtc'
      },
      {
        title: 'System Monitoring',
        thumbnail: '/generated_images/Dallas_Control_newsroom_45c1dfb2.png',
        streamId: 'SM001',
        url: 'http://cdn3.obedtv.live:2020/rtc/v1/whep/?app=live&stream=SM001',
        category: 'liveFeeds',
        studioId: null,
        streamType: 'webrtc'
      },
      {
        title: 'Emergency Broadcast',
        thumbnail: '/generated_images/Dallas_Control_newsroom_45c1dfb2.png',
        streamId: 'EB001',
        url: 'http://cdn4.obedtv.live:2023/rtc/v1/whep/?app=live&stream=EB001',
        category: 'liveFeeds',
        studioId: null,
        streamType: 'webrtc'
      },
      {
        title: 'Weather Station',
        thumbnail: '/generated_images/Over-the-air_broadcast_tower_04c20672.png',
        streamId: 'WS001',
        url: 'http://cdn1.obedtv.live:2024/rtc/v1/whep/?app=live&stream=WS001',
        category: 'liveFeeds',
        studioId: null,
        streamType: 'webrtc'
      },
      {
        title: 'Traffic Camera Feed',
        thumbnail: '/generated_images/Dallas_Control_newsroom_45c1dfb2.png',
        streamId: 'TC001',
        url: 'http://cdn2.obedtv.live:1990/rtc/v1/whep/?app=live&stream=TC001',
        category: 'liveFeeds',
        studioId: null,
        streamType: 'webrtc'
      },
      // HLS Stream Examples
      {
        title: 'HLS Live News Feed',
        thumbnail: '/generated_images/Dallas_Control_newsroom_45c1dfb2.png',
        streamId: 'HLS001',
        url: 'http://sample-videos.com/zip/10/m3u8/mp4/SampleVideo_1280x720_1mb.m3u8',
        category: 'featured',
        studioId: null,
        streamType: 'hls'
      },
      {
        title: 'HLS Sports Channel',
        thumbnail: '/generated_images/Featured_live_production_15b7d8b1.png',
        streamId: 'HLS002',
        url: 'hls://example.com/streams/sports.m3u8',
        category: 'liveFeeds',
        studioId: null,
        streamType: 'hls'
      },
      {
        title: 'HLS Weather Stream',
        thumbnail: '/generated_images/Over-the-air_broadcast_tower_04c20672.png',
        streamId: 'HLS003',
        url: 'http://weather.example.com/live/weather.m3u8',
        category: 'liveFeeds',
        studioId: null,
        streamType: 'hls'
      },
      // Studio A feeds
      {
        title: 'Main Camera Feed',
        thumbnail: '/generated_images/Studio_A_control_room_42819489.png',
        streamId: 'SA001',
        url: 'http://cdn1.obedtv.live:2024/rtc/v1/whep/?app=live&stream=SA001',
        category: 'studios',
        studioId: studioIds[0],
        streamType: 'webrtc'
      },
      {
        title: 'Wide Angle Shot',
        thumbnail: '/generated_images/Studio_A_control_room_42819489.png',
        streamId: 'SA002',
        url: 'http://cdn2.obedtv.live:1990/rtc/v1/whep/?app=live&stream=SA002',
        category: 'studios',
        studioId: studioIds[0],
        streamType: 'webrtc'
      },
      {
        title: 'Close Up Camera',
        thumbnail: '/generated_images/Studio_A_control_room_42819489.png',
        streamId: 'SA003',
        url: 'http://cdn3.obedtv.live:2020/rtc/v1/whep/?app=live&stream=SA003',
        category: 'studios',
        studioId: studioIds[0],
        streamType: 'webrtc'
      },
      {
        title: 'Overhead View',
        thumbnail: '/generated_images/Studio_A_control_room_42819489.png',
        streamId: 'SA004',
        url: 'http://cdn4.obedtv.live:2023/rtc/v1/whep/?app=live&stream=SA004',
        category: 'studios',
        studioId: studioIds[0],
        streamType: 'webrtc'
      },
      // Studio B feeds
      {
        title: 'Main Production Feed',
        thumbnail: '/generated_images/Studio_A_control_room_42819489.png',
        streamId: 'SB001',
        url: 'http://cdn1.obedtv.live:2024/rtc/v1/whep/?app=live&stream=SB001',
        category: 'studios',
        studioId: studioIds[1],
        streamType: 'webrtc'
      },
      {
        title: 'Alternate Angle',
        thumbnail: '/generated_images/Studio_A_control_room_42819489.png',
        streamId: 'SB002',
        url: 'http://cdn2.obedtv.live:1990/rtc/v1/whep/?app=live&stream=SB002',
        category: 'studios',
        studioId: studioIds[1],
        streamType: 'webrtc'
      },
      {
        title: 'Guest Camera',
        thumbnail: '/generated_images/Studio_A_control_room_42819489.png',
        streamId: 'SB003',
        url: 'http://cdn3.obedtv.live:2020/rtc/v1/whep/?app=live&stream=SB003',
        category: 'studios',
        studioId: studioIds[1],
        streamType: 'webrtc'
      },
      // Studio C feeds
      {
        title: 'Backup Feed',
        thumbnail: '/generated_images/Studio_A_control_room_42819489.png',
        streamId: 'SC001',
        url: 'http://cdn4.obedtv.live:2023/rtc/v1/whep/?app=live&stream=SC001',
        category: 'studios',
        studioId: studioIds[2],
        streamType: 'webrtc'
      },
      {
        title: 'Monitoring Camera',
        thumbnail: '/generated_images/Studio_A_control_room_42819489.png',
        streamId: 'SC002',
        url: 'http://cdn1.obedtv.live:2024/rtc/v1/whep/?app=live&stream=SC002',
        category: 'studios',
        studioId: studioIds[2],
        streamType: 'webrtc'
      },
      // Mobile Unit feeds
      {
        title: 'Field Reporter Feed',
        thumbnail: '/generated_images/Featured_live_production_15b7d8b1.png',
        streamId: 'MU001',
        url: 'http://cdn2.obedtv.live:1990/rtc/v1/whep/?app=live&stream=MU001',
        category: 'studios',
        studioId: studioIds[3],
        streamType: 'webrtc'
      },
      {
        title: 'Mobile Wide Shot',
        thumbnail: '/generated_images/Featured_live_production_15b7d8b1.png',
        streamId: 'MU002',
        url: 'http://cdn3.obedtv.live:2020/rtc/v1/whep/?app=live&stream=MU002',
        category: 'studios',
        studioId: studioIds[3],
        streamType: 'webrtc'
      },
      // Rehearsal Room feed
      {
        title: 'Rehearsal Feed',
        thumbnail: '/generated_images/Studio_A_control_room_42819489.png',
        streamId: 'RR001',
        url: 'http://cdn4.obedtv.live:2023/rtc/v1/whep/?app=live&stream=RR001',
        category: 'studios',
        studioId: studioIds[4],
        streamType: 'webrtc'
      },
      // UHD Streams
      {
        title: 'UHD Main Production',
        thumbnail: '/generated_images/Featured_live_production_15b7d8b1.png',
        streamId: 'UHD001',
        url: 'http://cdn1.obedtv.live:2024/rtc/v1/whep/?app=live&stream=UHD001',
        category: 'uhd',
        studioId: null,
        streamType: 'webrtc'
      },
      {
        title: 'UHD Special Event',
        thumbnail: '/generated_images/Dallas_Control_newsroom_45c1dfb2.png',
        streamId: 'UHD002',
        url: 'http://cdn2.obedtv.live:1990/rtc/v1/whep/?app=live&stream=UHD002',
        category: 'uhd',
        studioId: null,
        streamType: 'webrtc'
      },
      {
        title: 'UHD Documentary Feed',
        thumbnail: '/generated_images/Studio_A_control_room_42819489.png',
        streamId: 'UHD003',
        url: 'http://cdn3.obedtv.live:2020/rtc/v1/whep/?app=live&stream=UHD003',
        category: 'uhd',
        studioId: null,
        streamType: 'webrtc'
      },
      {
        title: 'UHD Sports Broadcast',
        thumbnail: '/generated_images/Over-the-air_broadcast_tower_04c20672.png',
        streamId: 'UHD004',
        url: 'http://cdn4.obedtv.live:2023/rtc/v1/whep/?app=live&stream=UHD004',
        category: 'uhd',
        studioId: null,
        streamType: 'webrtc'
      },
      {
        title: 'UHD Nature Cam',
        thumbnail: '/generated_images/Featured_live_production_15b7d8b1.png',
        streamId: 'UHD005',
        url: 'http://cdn1.obedtv.live:2024/rtc/v1/whep/?app=live&stream=UHD005',
        category: 'uhd',
        studioId: null,
        streamType: 'webrtc'
      },
      {
        title: 'UHD City Skyline',
        thumbnail: '/generated_images/Dallas_Control_newsroom_45c1dfb2.png',
        streamId: 'UHD006',
        url: 'http://cdn2.obedtv.live:1990/rtc/v1/whep/?app=live&stream=UHD006',
        category: 'uhd',
        studioId: null,
        streamType: 'webrtc'
      }
    ];

    streamDataEntries.forEach(streamEntry => {
      const id = randomUUID();
      const newStream: Stream = { ...streamEntry, id };
      this.streams.set(id, newStream);
    });
  }
}

// Database Storage Implementation
export class DatabaseStorage implements IStorage {
  public sessionStore: any;

  constructor() {
    try {
      // Use PostgreSQL session store for persistent sessions
      console.log('Setting up PostgreSQL session store');
      const pgSession = connectPgSimple(session);
      this.sessionStore = new pgSession({
        conString: process.env.DATABASE_URL,
        tableName: 'session', // Table will be created automatically
        createTableIfMissing: true,
        ttl: 24 * 60 * 60 * 1000, // 24 hours
        disableTouch: false
      });
      console.log('PostgreSQL session store configured successfully');
    } catch (error) {
      console.warn('Failed to setup PostgreSQL session store:', error);
      console.log('Falling back to memory store for sessions');
      const MemoryStore = createMemoryStore(session);
      this.sessionStore = new MemoryStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      });
    }
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUserRole(id: string, role: string): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ role: role as "admin" | "user" })
      .where(eq(users.id, id))
      .returning();
    return result.length > 0;
  }

  async updateUserStatus(id: string, isActive: string): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ isActive })
      .where(eq(users.id, id))
      .returning();
    return result.length > 0;
  }

  // Stream operations
  async getAllStreams(): Promise<Stream[]> {
    return await db.select().from(streams);
  }

  async getStreamsByCategory(category: string): Promise<Stream[]> {
    return await db.select().from(streams).where(eq(streams.category, category));
  }

  async getStreamsByStudio(studioId: string): Promise<Stream[]> {
    return await db.select().from(streams).where(eq(streams.studioId, studioId));
  }

  async getStream(id: string): Promise<Stream | undefined> {
    const [stream] = await db.select().from(streams).where(eq(streams.id, id));
    return stream || undefined;
  }

  async createStream(insertStream: InsertStream): Promise<Stream> {
    const [stream] = await db
      .insert(streams)
      .values(insertStream)
      .returning();
    
    // Update feed count for associated studio
    if (stream.studioId) {
      const [studio] = await db.select().from(studios).where(eq(studios.id, stream.studioId));
      if (studio) {
        await db
          .update(studios)
          .set({ feedCount: studio.feedCount + 1 })
          .where(eq(studios.id, stream.studioId));
      }
    }
    
    return stream;
  }

  async updateStream(id: string, updateData: Partial<InsertStream>): Promise<Stream | undefined> {
    const [updated] = await db
      .update(streams)
      .set(updateData)
      .where(eq(streams.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteStream(id: string): Promise<boolean> {
    const [stream] = await db.select().from(streams).where(eq(streams.id, id));
    if (!stream) return false;
    
    // Update feed count for associated studio
    if (stream.studioId) {
      const [studio] = await db.select().from(studios).where(eq(studios.id, stream.studioId));
      if (studio && studio.feedCount > 0) {
        await db
          .update(studios)
          .set({ feedCount: studio.feedCount - 1 })
          .where(eq(studios.id, stream.studioId));
      }
    }
    
    const result = await db.delete(streams).where(eq(streams.id, id)).returning();
    return result.length > 0;
  }

  // Studio operations
  async getAllStudios(): Promise<Studio[]> {
    return await db.select().from(studios);
  }

  async getStudio(id: string): Promise<Studio | undefined> {
    const [studio] = await db.select().from(studios).where(eq(studios.id, id));
    return studio || undefined;
  }

  async createStudio(insertStudio: InsertStudio): Promise<Studio> {
    const [studio] = await db
      .insert(studios)
      .values(insertStudio)
      .returning();
    return studio;
  }

  async updateStudio(id: string, updateData: Partial<InsertStudio>): Promise<Studio | undefined> {
    const [updated] = await db
      .update(studios)
      .set(updateData)
      .where(eq(studios.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteStudio(id: string): Promise<boolean> {
    // Delete all streams associated with this studio first
    await db.delete(streams).where(eq(streams.studioId, id));
    
    const result = await db.delete(studios).where(eq(studios.id, id)).returning();
    return result.length > 0;
  }
}

// Switch to database storage
export const storage = new DatabaseStorage();

// Database seeding constants
const SALT_ROUNDS = 12;
const PASSCODE_PEPPER = process.env.PASSCODE_PEPPER || 'obtv-universal-pepper-change-in-production';
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || '1234';
const USER_PASSCODE = process.env.USER_PASSCODE || '1111';

// Database seeding function - now lighter weight for runtime, main seeding happens at build time
export async function seedDatabase() {
  try {
    // Quick check if database is populated - if so, skip runtime seeding
    const existingStudios = await storage.getAllStudios();
    if (existingStudios.length > 0) {
      console.log('Database already seeded (studios found)');
      return;
    }
    
    // Check if admin users exist - if so, data was seeded at build time
    const existingUsers = await storage.getAllUsers();
    if (existingUsers.length > 0) {
      console.log('Database already seeded (users found)');
      return;
    }
    
    console.log('No existing data found - database may not have been seeded at build time');
    console.log('Note: Admin accounts should be created during Docker deployment via seed.js');
    
  } catch (error: any) {
    console.log('Database connection failed during runtime seeding check:', error.message);
    console.log('This is expected if using fallback authentication');
    return; // Gracefully exit without seeding
  }
}
