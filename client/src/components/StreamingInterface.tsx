import { useState } from 'react';
import Header from './Header';
import CategoryRow from './CategoryRow';
import StreamModal from './StreamModal';

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
  studios: [
    {
      id: 'studio-a',
      title: 'Studio A Control Room',
      thumbnail: studioImg,
      streamId: 'SA001',
      url: 'webrtc://localhost:1985/live/studio-a'
    },
    {
      id: 'studio-b',
      title: 'Studio B Production',
      thumbnail: studioImg,
      streamId: 'SB001',
      url: 'webrtc://localhost:1985/live/studio-b'
    },
    {
      id: 'studio-c',
      title: 'Studio C Backup',
      thumbnail: studioImg,
      streamId: 'SC001',
      url: 'webrtc://localhost:1985/live/studio-c'
    },
    {
      id: 'mobile-unit',
      title: 'Mobile Unit 1',
      thumbnail: featuredImg,
      streamId: 'MU001',
      url: 'webrtc://localhost:1985/live/mobile-1'
    },
    {
      id: 'rehearsal-room',
      title: 'Rehearsal Room',
      thumbnail: studioImg,
      streamId: 'RR001',
      url: 'webrtc://localhost:1985/live/rehearsal'
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

export default function StreamingInterface({ className }: StreamingInterfaceProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStream, setSelectedStream] = useState<{
    id: string;
    title: string;
    url: string;
  } | null>(null);

  const totalPages = 3; // todo: calculate based on actual stream count

  const handleStreamSelect = (streamId: string, url: string) => {
    const allStreams = [
      ...mockStreamData.featured,
      ...mockStreamData.studios,
      ...mockStreamData.overTheAir,
      ...mockStreamData.liveFeeds
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

  return (
    <div className={`min-h-screen bg-background ${className}`}>
      <Header
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        onLogoClick={handleLogoClick}
      />
      
      <main className="pb-8">
        {/* Featured Section */}
        <CategoryRow
          title="Featured"
          streams={mockStreamData.featured}
          featured={true}
          onStreamSelect={handleStreamSelect}
        />
        
        {/* Studios Section */}
        <CategoryRow
          title="Studios"
          streams={mockStreamData.studios}
          onStreamSelect={handleStreamSelect}
        />
        
        {/* Over The Air Section */}
        <CategoryRow
          title="Over The Air"
          streams={mockStreamData.overTheAir}
          onStreamSelect={handleStreamSelect}
        />
        
        {/* Live Feeds Section */}
        <CategoryRow
          title="Live Feeds"
          streams={mockStreamData.liveFeeds}
          onStreamSelect={handleStreamSelect}
        />
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