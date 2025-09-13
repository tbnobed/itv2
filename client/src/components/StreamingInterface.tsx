import { useState, useEffect } from 'react';
import CategoryRow from './CategoryRow';
import StreamModal from './StreamModal';
import StudioCard, { Studio } from './StudioCard';

// todo: remove mock functionality - replace with real stream configuration
import studioImg from '@assets/generated_images/Studio_A_control_room_42819489.png';
import dallasImg from '@assets/generated_images/Dallas_Control_newsroom_45c1dfb2.png';
import towerImg from '@assets/generated_images/Over-the-air_broadcast_tower_04c20672.png';
import featuredImg from '@assets/generated_images/Featured_live_production_15b7d8b1.png';

interface StreamData {
  id: string;
  title: string;
  thumbnail: string;
  streamId: string;
  url: string;
}

interface StreamingInterfaceProps {
  className?: string;
  activeSection?: string;
}

// todo: remove mock functionality - load from configuration API
const mockStreamData: Record<string, StreamData[]> = {
  featured: [
    {
      id: 'featured-main',
      title: 'Featured Live Production',
      thumbnail: featuredImg,
      streamId: 'FP001',
      url: 'webrtc://localhost:1985/live/featured'
    },
    {
      id: 'featured-prime',
      title: 'Prime Time Broadcast',
      thumbnail: studioImg,
      streamId: 'PT001',
      url: 'webrtc://localhost:1985/live/primetime'
    },
    {
      id: 'featured-special',
      title: 'Special Event Coverage',
      thumbnail: dallasImg,
      streamId: 'SE001',
      url: 'webrtc://localhost:1985/live/special'
    }
  ],
  overTheAir: [
    {
      id: 'main-tower',
      title: 'Main Transmission Tower',
      thumbnail: towerImg,
      streamId: 'MT001',
      url: 'webrtc://localhost:1985/live/main-tower'
    },
    {
      id: 'backup-tower',
      title: 'Backup Tower Feed',
      thumbnail: towerImg,
      streamId: 'BT001',
      url: 'webrtc://localhost:1985/live/backup-tower'
    },
    {
      id: 'repeater-1',
      title: 'Repeater Station 1',
      thumbnail: towerImg,
      streamId: 'RS001',
      url: 'webrtc://localhost:1985/live/repeater-1'
    },
    {
      id: 'repeater-2',
      title: 'Repeater Station 2',
      thumbnail: towerImg,
      streamId: 'RS002',
      url: 'webrtc://localhost:1985/live/repeater-2'
    }
  ],
  liveFeeds: [
    {
      id: 'dallas-control',
      title: 'Dallas Control Center',
      thumbnail: dallasImg,
      streamId: 'DC001',
      url: 'webrtc://localhost:1985/live/dallas-control'
    },
    {
      id: 'houston-backup',
      title: 'Houston Backup Center',
      thumbnail: dallasImg,
      streamId: 'HB001',
      url: 'webrtc://localhost:1985/live/houston-backup'
    },
    {
      id: 'monitoring-feed',
      title: 'System Monitoring',
      thumbnail: dallasImg,
      streamId: 'SM001',
      url: 'webrtc://localhost:1985/live/monitoring'
    },
    {
      id: 'emergency-feed',
      title: 'Emergency Broadcast',
      thumbnail: dallasImg,
      streamId: 'EB001',
      url: 'webrtc://localhost:1985/live/emergency'
    },
    {
      id: 'weather-feed',
      title: 'Weather Station',
      thumbnail: towerImg,
      streamId: 'WS001',
      url: 'webrtc://localhost:1985/live/weather'
    },
    {
      id: 'traffic-feed',
      title: 'Traffic Camera Feed',
      thumbnail: dallasImg,
      streamId: 'TC001',
      url: 'webrtc://localhost:1985/live/traffic'
    }
  ]
};

// Mock studio data for two-level navigation
const mockStudios: Studio[] = [
  {
    id: 'studio-a',
    name: 'Studio A Control Room',
    thumbnail: studioImg,
    description: 'Primary broadcast control room with full production capabilities',
    status: 'online',
    feedCount: 4
  },
  {
    id: 'studio-b', 
    name: 'Studio B Production',
    thumbnail: studioImg,
    description: 'Secondary production studio for live programming',
    status: 'online',
    feedCount: 3
  },
  {
    id: 'studio-c',
    name: 'Studio C Backup',
    thumbnail: studioImg,
    description: 'Backup studio for emergency broadcasts',
    status: 'maintenance',
    feedCount: 2
  },
  {
    id: 'mobile-unit',
    name: 'Mobile Unit 1',
    thumbnail: featuredImg,
    description: 'On-location broadcast unit for field reporting',
    status: 'online',
    feedCount: 2
  },
  {
    id: 'rehearsal-room',
    name: 'Rehearsal Room',
    thumbnail: studioImg,
    description: 'Practice and rehearsal space for productions',
    status: 'offline',
    feedCount: 1
  }
];

// Studio feeds mapping
const mockStudioFeeds: Record<string, StreamData[]> = {
  'studio-a': [
    {
      id: 'sa-main',
      title: 'Main Camera Feed',
      thumbnail: studioImg,
      streamId: 'SA001',
      url: 'webrtc://localhost:1985/live/studio-a-main'
    },
    {
      id: 'sa-wide',
      title: 'Wide Angle Shot',
      thumbnail: studioImg,
      streamId: 'SA002',
      url: 'webrtc://localhost:1985/live/studio-a-wide'
    },
    {
      id: 'sa-close',
      title: 'Close Up Camera',
      thumbnail: studioImg,
      streamId: 'SA003',
      url: 'webrtc://localhost:1985/live/studio-a-close'
    },
    {
      id: 'sa-overhead',
      title: 'Overhead View',
      thumbnail: studioImg,
      streamId: 'SA004',
      url: 'webrtc://localhost:1985/live/studio-a-overhead'
    }
  ],
  'studio-b': [
    {
      id: 'sb-main',
      title: 'Main Production Feed',
      thumbnail: studioImg,
      streamId: 'SB001',
      url: 'webrtc://localhost:1985/live/studio-b-main'
    },
    {
      id: 'sb-alt',
      title: 'Alternate Angle',
      thumbnail: studioImg,
      streamId: 'SB002',
      url: 'webrtc://localhost:1985/live/studio-b-alt'
    },
    {
      id: 'sb-guest',
      title: 'Guest Camera',
      thumbnail: studioImg,
      streamId: 'SB003',
      url: 'webrtc://localhost:1985/live/studio-b-guest'
    }
  ],
  'studio-c': [
    {
      id: 'sc-backup',
      title: 'Backup Feed',
      thumbnail: studioImg,
      streamId: 'SC001',
      url: 'webrtc://localhost:1985/live/studio-c-backup'
    },
    {
      id: 'sc-monitor',
      title: 'Monitoring Camera',
      thumbnail: studioImg,
      streamId: 'SC002',
      url: 'webrtc://localhost:1985/live/studio-c-monitor'
    }
  ],
  'mobile-unit': [
    {
      id: 'mu-field',
      title: 'Field Reporter Feed',
      thumbnail: featuredImg,
      streamId: 'MU001',
      url: 'webrtc://localhost:1985/live/mobile-field'
    },
    {
      id: 'mu-wide',
      title: 'Mobile Wide Shot',
      thumbnail: featuredImg,
      streamId: 'MU002',
      url: 'webrtc://localhost:1985/live/mobile-wide'
    }
  ],
  'rehearsal-room': [
    {
      id: 'rr-practice',
      title: 'Rehearsal Feed',
      thumbnail: studioImg,
      streamId: 'RR001',
      url: 'webrtc://localhost:1985/live/rehearsal'
    }
  ]
};

export default function StreamingInterface({ className, activeSection = 'featured' }: StreamingInterfaceProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStream, setSelectedStream] = useState<{
    id: string;
    title: string;
    url: string;
  } | null>(null);
  const [selectedStudio, setSelectedStudio] = useState<string | null>(null);

  // Reset selected studio when section changes away from studios
  useEffect(() => {
    if (activeSection !== 'studios') {
      setSelectedStudio(null);
    }
  }, [activeSection]);

  const totalPages = 3; // todo: calculate based on actual stream count

  const handleStreamSelect = (streamId: string, url: string) => {
    const allStreams = [
      ...mockStreamData.featured,
      ...mockStreamData.overTheAir,
      ...mockStreamData.liveFeeds,
      ...Object.values(mockStudioFeeds).flat()
    ];
    
    const stream = allStreams.find(s => s.streamId === streamId);
    if (stream) {
      setSelectedStream({
        id: stream.streamId,
        title: stream.title,
        url: stream.url
      });
      console.log(`Opening stream modal for: ${stream.title} (${streamId})`);
    }
  };

  const handleStudioSelect = (studioId: string) => {
    setSelectedStudio(studioId);
    console.log(`Selected studio: ${studioId}`);
  };

  const handleBackToStudios = () => {
    setSelectedStudio(null);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    console.log(`Navigated to page ${page}`);
    // todo: load different streams based on page
  };

  const handleLogoClick = () => {
    setCurrentPage(1);
    console.log('Logo clicked - returning to home page');
  };

  const closeModal = () => {
    setSelectedStream(null);
  };

  // Function to get current section data
  const getCurrentSectionData = () => {
    switch (activeSection) {
      case 'featured':
        return { title: 'Featured', streams: mockStreamData.featured, featured: true };
      case 'overTheAir':
        return { title: 'Over The Air', streams: mockStreamData.overTheAir, featured: false };
      case 'liveFeeds':
        return { title: 'Live Feeds', streams: mockStreamData.liveFeeds, featured: false };
      default:
        return { title: 'Featured', streams: mockStreamData.featured, featured: true };
    }
  };

  const currentSection = getCurrentSectionData();

  // Render studios section with two-level navigation
  const renderStudiosSection = () => {
    if (!selectedStudio) {
      // Show studio grid
      return (
        <div>
          <h2 className="text-white font-bold mb-8 px-6 text-center text-2xl" data-testid="section-studios">
            Studios
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-6">
            {mockStudios.map((studio) => (
              <StudioCard
                key={studio.id}
                studio={studio}
                onClick={handleStudioSelect}
                data-testid={`studio-card-${studio.id}`}
              />
            ))}
          </div>
        </div>
      );
    } else {
      // Show studio feeds
      const studioFeeds = mockStudioFeeds[selectedStudio] || [];
      const selectedStudioData = mockStudios.find(s => s.id === selectedStudio);
      
      return (
        <div>
          <div className="flex items-center gap-4 mb-6 px-6">
            <button
              onClick={handleBackToStudios}
              className="text-primary hover:text-primary/80 font-medium"
              data-testid="button-back-to-studios"
            >
              ← Back to Studios
            </button>
          </div>
          <CategoryRow
            title={`${selectedStudioData?.name} - Camera Feeds`}
            streams={studioFeeds}
            featured={false}
            onStreamSelect={handleStreamSelect}
          />
        </div>
      );
    }
  };

  return (
    <div className={`h-full bg-background ${className}`}>
      <main className="p-6">
        {/* Render based on active section */}
        {activeSection === 'studios' ? (
          renderStudiosSection()
        ) : (
          <CategoryRow
            title={currentSection.title}
            streams={currentSection.streams}
            featured={currentSection.featured}
            onStreamSelect={handleStreamSelect}
          />
        )}
      </main>

      {/* Stream Modal */}
      {selectedStream && (
        <StreamModal
          isOpen={!!selectedStream}
          streamId={selectedStream.id}
          streamUrl={selectedStream.url}
          streamTitle={selectedStream.title}
          onClose={closeModal}
        />
      )}
    </div>
  );
}