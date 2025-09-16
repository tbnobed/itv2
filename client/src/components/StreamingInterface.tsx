import { useState, useEffect } from 'react';

// Import studio background images
import socalStudioImg from '@assets/SocalStudio_1758041495268.png';
import irvingStudiosImg from '@assets/Irving studios_1758041495269.png';
import nashvilleStudiosImg from '@assets/Nashvillestudios_1758041495269.png';
import plexStudiosImg from '@assets/PlexStudios_1758041495269.jpg';
import { useQuery } from '@tanstack/react-query';
import CategoryRow from './CategoryRow';
import StreamModal from './StreamModal';
import StudioCard from './StudioCard';
import TopNavigation from './TopNavigation';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import type { Stream, Studio } from '@shared/schema';

interface StreamData {
  id: string;
  title: string;
  thumbnail: string;
  streamId: string;
  url: string;
}

interface GroupedStreams {
  featured: Stream[];
  overTheAir: Stream[];
  liveFeeds: Stream[];
  studios: Stream[];
  uhd: Stream[];
}

interface StreamingInterfaceProps {
  className?: string;
}

// Helper function to convert Stream to StreamData format for CategoryRow
const convertStreamToStreamData = (stream: Stream): StreamData => ({
  id: stream.id,
  title: stream.title,
  thumbnail: stream.thumbnail,
  streamId: stream.streamId,
  url: stream.url,
});

export default function StreamingInterface({ className }: StreamingInterfaceProps) {
  const [activeSection, setActiveSection] = useState('featured');
  const { user, logoutMutation } = useAuth();
  const [, navigate] = useLocation();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStream, setSelectedStream] = useState<{
    id: string;
    title: string;
    url: string;
  } | null>(null);
  const [selectedStudio, setSelectedStudio] = useState<string | null>(null);

  // Fetch streams data
  const { data: streamData, isLoading: streamsLoading, error: streamsError } = useQuery<GroupedStreams>({
    queryKey: ['/api/streams'],
    enabled: true,
  });

  // Fetch studios data
  const { data: studiosData, isLoading: studiosLoading, error: studiosError } = useQuery<Studio[]>({
    queryKey: ['/api/studios'],
    enabled: true,
  });

  // Fetch studio feeds when a studio is selected
  const { data: studioFeeds, isLoading: studioFeedsLoading } = useQuery<Stream[]>({
    queryKey: ['/api/streams/studio', selectedStudio],
    enabled: !!selectedStudio && activeSection === 'studios',
  });

  // Reset selected studio when section changes away from studios
  useEffect(() => {
    if (activeSection !== 'studios') {
      setSelectedStudio(null);
    }
  }, [activeSection]);

  const totalPages = 3; // todo: calculate based on actual stream count

  const handleStreamSelect = (streamId: string, url: string) => {
    // Find stream from all available streams
    if (streamData) {
      const allStreams = [
        ...streamData.featured,
        ...streamData.overTheAir,
        ...streamData.liveFeeds,
        ...streamData.studios,
        ...streamData.uhd,
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
    }

    // Also check studio feeds if applicable
    if (studioFeeds) {
      const stream = studioFeeds.find(s => s.streamId === streamId);
      if (stream) {
        setSelectedStream({
          id: stream.streamId,
          title: stream.title,
          url: stream.url
        });
        console.log(`Opening stream modal for: ${stream.title} (${streamId})`);
      }
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

  const handleLogout = () => {
    logoutMutation.mutate();
    navigate('/auth');
  };

  const closeModal = () => {
    setSelectedStream(null);
  };

  // Function to get current section data with alphabetical sorting
  const getCurrentSectionData = () => {
    if (!streamData) return { title: 'Loading...', streams: [], featured: false };

    // Helper to sort streams alphabetically by title
    const sortStreamsByTitle = (streams: StreamData[]) => 
      streams.sort((a, b) => a.title.localeCompare(b.title));

    switch (activeSection) {
      case 'featured':
        return { 
          title: 'Featured', 
          streams: sortStreamsByTitle(streamData.featured.map(convertStreamToStreamData)), 
          featured: true 
        };
      case 'overTheAir':
        return { 
          title: 'Over The Air', 
          streams: sortStreamsByTitle(streamData.overTheAir.map(convertStreamToStreamData)), 
          featured: false 
        };
      case 'liveFeeds':
        return { 
          title: 'Live Feeds', 
          streams: sortStreamsByTitle(streamData.liveFeeds.map(convertStreamToStreamData)), 
          featured: false 
        };
      default:
        return { 
          title: 'Featured', 
          streams: sortStreamsByTitle(streamData.featured.map(convertStreamToStreamData)), 
          featured: true 
        };
    }
  };

  const currentSection = getCurrentSectionData();

  // Rotating studio background images
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const studioImages = [
    socalStudioImg,
    irvingStudiosImg,
    nashvilleStudiosImg,
    plexStudiosImg
  ];

  // Rotate background images every 12 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % studioImages.length);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  // Function to render the Featured section with multiple rows
  const renderFeaturedSection = () => {
    if (!streamData) return null;

    const sortStreamsByTitle = (streams: StreamData[]) => 
      streams.sort((a, b) => a.title.localeCompare(b.title));

    const featuredStreams = streamData.featured.map(convertStreamToStreamData);
    const uhdStreams = streamData.uhd?.map(convertStreamToStreamData) || [];

    return (
      <div className="relative min-h-screen">
        {/* Rotating Studio Background Images */}
        <div className="absolute inset-0 overflow-hidden">
          {studioImages.map((image, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-2000 ease-in-out ${
                index === currentBgIndex ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                backgroundImage: `url(${image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            />
          ))}
          {/* Darker overlay to dim images and ensure text readability */}
          <div className="absolute inset-0 bg-black/75" />
        </div>

        {/* Content positioned much lower on the page */}
        <div className="relative z-10 pt-96 pb-20 space-y-12">
          {/* Regular Featured Section */}
          <CategoryRow
            title="Featured"
            streams={sortStreamsByTitle(featuredStreams)}
            featured={true}
            onStreamSelect={handleStreamSelect}
          />
          
          {/* UHD Streams Section */}
          {uhdStreams.length > 0 && (
            <CategoryRow
              title="UHD Streams"
              streams={sortStreamsByTitle(uhdStreams)}
              featured={false}
              variant="compact"
              onStreamSelect={handleStreamSelect}
            />
          )}
        </div>
      </div>
    );
  };

  // Show loading state
  if (streamsLoading || (activeSection === 'studios' && studiosLoading)) {
    return (
      <div className={`h-full w-full bg-background ${className}`}>
        <main className="p-6 h-full overflow-y-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-white text-lg">Loading streaming data...</div>
          </div>
        </main>
      </div>
    );
  }

  // Show error state
  if (streamsError || (activeSection === 'studios' && studiosError)) {
    const error = streamsError || studiosError;
    return (
      <div className={`h-full w-full bg-background ${className}`}>
        <main className="p-6 h-full overflow-y-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-red-400 text-lg">
              Failed to load streaming data: {error?.message || 'Unknown error'}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Render studios section with two-level navigation
  const renderStudiosSection = () => {
    if (!selectedStudio) {
      // Show studio grid
      return (
        <div>
          <h2 className="text-white font-bold mb-8 px-6 text-center text-2xl" data-testid="section-studios">
            Studios
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-6 w-full max-w-full">
            {studiosData?.sort((a, b) => a.name.localeCompare(b.name)).map((studio) => (
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
      // Show studio feeds with loading state
      const selectedStudioData = studiosData?.find(s => s.id === selectedStudio);
      
      if (studioFeedsLoading) {
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
            <div className="flex items-center justify-center h-32">
              <div className="text-white text-lg">Loading studio feeds...</div>
            </div>
          </div>
        );
      }
      
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
            streams={(studioFeeds || []).map(convertStreamToStreamData).sort((a, b) => a.title.localeCompare(b.title))}
            featured={false}
            onStreamSelect={handleStreamSelect}
          />
        </div>
      );
    }
  };

  return (
    <div className={`min-h-screen w-full bg-black ${className}`}>
      {/* Android TV Top Navigation */}
      <TopNavigation
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onLogout={handleLogout}
        username={user?.username}
        userRole={user?.role}
      />

      {/* Main Content with Android TV styling */}
      <main className="min-h-screen overflow-y-auto bg-gradient-to-b from-black via-gray-900 to-black">
        <div className="py-8">
          {/* Render based on active section */}
          {activeSection === 'studios' ? (
            renderStudiosSection()
          ) : activeSection === 'featured' ? (
            renderFeaturedSection()
          ) : (
            <CategoryRow
              title={currentSection.title}
              streams={currentSection.streams}
              featured={currentSection.featured}
              onStreamSelect={handleStreamSelect}
            />
          )}
        </div>
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