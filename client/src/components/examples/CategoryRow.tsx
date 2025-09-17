import CategoryRow from '../CategoryRow';
import studioImg from '/generated_images/Studio_A_control_room_42819489.png';
import dallasImg from '/generated_images/Dallas_Control_newsroom_45c1dfb2.png';
import towerImg from '/generated_images/Over-the-air_broadcast_tower_04c20672.png';
import featuredImg from '/generated_images/Featured_live_production_15b7d8b1.png';

// todo: remove mock functionality - replace with real stream data
const mockStreams = [
  {
    id: 'studio-a',
    title: 'Studio A Control Room',
    thumbnail: studioImg,
    streamId: 'SA001',
    url: 'webrtc://localhost:1985/live/studio-a'
  },
  {
    id: 'dallas-control',
    title: 'Dallas Control Center',
    thumbnail: dallasImg,
    streamId: 'DC001',
    url: 'webrtc://localhost:1985/live/dallas-control'
  },
  {
    id: 'tower-feed',
    title: 'Tower Feed 1',
    thumbnail: towerImg,
    streamId: 'TF001',
    url: 'webrtc://localhost:1985/live/tower-1'
  },
  {
    id: 'studio-b',
    title: 'Studio B Production',
    thumbnail: studioImg,
    streamId: 'SB001',
    url: 'webrtc://localhost:1985/live/studio-b'
  },
  {
    id: 'backup-feed',
    title: 'Backup Control',
    thumbnail: dallasImg,
    streamId: 'BC001',
    url: 'webrtc://localhost:1985/live/backup'
  }
];

const featuredStreams = [
  {
    id: 'featured-main',
    title: 'Featured Live Production',
    thumbnail: featuredImg,
    streamId: 'FP001',
    url: 'webrtc://localhost:1985/live/featured'
  },
  {
    id: 'featured-secondary',
    title: 'Prime Time Broadcast',
    thumbnail: studioImg,
    streamId: 'PT001',
    url: 'webrtc://localhost:1985/live/primetime'
  }
];

export default function CategoryRowExample() {
  const handleStreamSelect = (streamId: string, url: string) => {
    console.log(`Stream selected - ID: ${streamId}, URL: ${url}`);
  };

  return (
    <div className="bg-background min-h-screen">
      <CategoryRow
        title="Featured"
        streams={featuredStreams}
        featured={true}
        onStreamSelect={handleStreamSelect}
        sectionId="featured"
      />
      
      <CategoryRow
        title="Studios"
        streams={mockStreams}
        onStreamSelect={handleStreamSelect}
        sectionId="studios"
      />
    </div>
  );
}