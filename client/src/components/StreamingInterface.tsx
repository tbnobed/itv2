import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import CategoryRow from './CategoryRow';
import StreamModal from './StreamModal';
import StudioCard from './StudioCard';
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
}

interface StreamingInterfaceProps {
  className?: string;
  activeSection?: string;
}

// Helper function to convert Stream to StreamData format for CategoryRow
const convertStreamToStreamData = (stream: Stream): StreamData => ({
  id: stream.id,
  title: stream.title,
  thumbnail: stream.thumbnail,
  streamId: stream.streamId,
  url: stream.url,
});

export default function StreamingInterface({ className, activeSection = 'featured' }: StreamingInterfaceProps) {
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

  const closeModal = () => {
    setSelectedStream(null);
  };

  // Function to get current section data
  const getCurrentSectionData = () => {
    if (!streamData) return { title: 'Loading...', streams: [], featured: false };

    switch (activeSection) {
      case 'featured':
        return { 
          title: 'Featured', 
          streams: streamData.featured.map(convertStreamToStreamData), 
          featured: true 
        };
      case 'overTheAir':
        return { 
          title: 'Over The Air', 
          streams: streamData.overTheAir.map(convertStreamToStreamData), 
          featured: false 
        };
      case 'liveFeeds':
        return { 
          title: 'Live Feeds', 
          streams: streamData.liveFeeds.map(convertStreamToStreamData), 
          featured: false 
        };
      default:
        return { 
          title: 'Featured', 
          streams: streamData.featured.map(convertStreamToStreamData), 
          featured: true 
        };
    }
  };

  const currentSection = getCurrentSectionData();

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
            {studiosData?.map((studio) => (
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
            streams={(studioFeeds || []).map(convertStreamToStreamData)}
            featured={false}
            onStreamSelect={handleStreamSelect}
          />
        </div>
      );
    }
  };

  return (
    <div className={`min-h-full w-full bg-background ${className}`}>
      <main className="p-6 min-h-screen overflow-y-auto">
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