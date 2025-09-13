import { type User, type InsertUser, type Stream, type InsertStream, type Studio, type InsertStudio } from "@shared/schema";
import { randomUUID } from "crypto";
import session from "express-session";
import createMemoryStore from "memorystore";

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

    streamDataEntries.forEach(streamEntry => {
      const id = randomUUID();
      const newStream: Stream = { ...streamEntry, id };
      this.streams.set(id, newStream);
    });
  }
}

export const storage = new MemStorage();
