import { useState, useEffect, useRef } from 'react';

// Import studio background images
import socalStudioImg from '@assets/SocalStudio_1758041495268.png';
import irvingStudiosImg from '@assets/Irving studios_1758041495269.png';
import nashvilleStudiosImg from '@assets/Nashvillestudios_1758041495269.png';
import plexStudiosImg from '@assets/PlexStudios_1758041495269.jpg';
import { useQuery } from '@tanstack/react-query';
import CategoryRow from './CategoryRow';
import StreamGrid from './StreamGrid';
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
  const [focusedStudioIndex, setFocusedStudioIndex] = useState(0);
  const studioRefs = useRef<(HTMLDivElement | null)[]>([]);

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

  // Reset focused studio index when entering studios section
  useEffect(() => {
    if (activeSection === 'studios' && !selectedStudio) {
      setFocusedStudioIndex(0);
    }
  }, [activeSection, selectedStudio]);

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

  // Helper to sort streams alphabetically by title
  const sortStreamsByTitle = (streams: StreamData[]) => 
    streams.sort((a, b) => a.title.localeCompare(b.title));

  // Function to get current section data with alphabetical sorting
  const getCurrentSectionData = () => {
    if (!streamData) return { title: 'Loading...', streams: [], featured: false, useGrid: false };

    switch (activeSection) {
      case 'featured':
        return { 
          title: 'Featured', 
          streams: sortStreamsByTitle(streamData.featured.map(convertStreamToStreamData)), 
          featured: true,
          useGrid: false
        };
      case 'overTheAir':
        return { 
          title: 'Over The Air', 
          streams: sortStreamsByTitle(streamData.overTheAir.map(convertStreamToStreamData)), 
          featured: false,
          useGrid: true
        };
      case 'liveFeeds':
        return { 
          title: 'Live Feeds', 
          streams: sortStreamsByTitle(streamData.liveFeeds.map(convertStreamToStreamData)), 
          featured: false,
          useGrid: true
        };
      case 'uhd':
        return { 
          title: 'UHD Streams', 
          streams: sortStreamsByTitle(streamData.uhd.map(convertStreamToStreamData)), 
          featured: false,
          useGrid: true
        };
      default:
        return { 
          title: 'Featured', 
          streams: sortStreamsByTitle(streamData.featured.map(convertStreamToStreamData)), 
          featured: true,
          useGrid: false
        };
    }
  };

  const currentSection = getCurrentSectionData();

  // Optimized background rotator for TV devices - only keeps 2 images in memory
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const [nextBgIndex, setNextBgIndex] = useState(1);
  const [isFading, setIsFading] = useState(false);
  const [isFireTV] = useState(() => typeof navigator !== 'undefined' && navigator.userAgent.includes('AFT'));
  
  const studioImages = [
    socalStudioImg,
    irvingStudiosImg,
    nashvilleStudiosImg,
    plexStudiosImg
  ];

  // Preload and rotate background images every 12 seconds
  useEffect(() => {
    const rotateBackground = async () => {
      if (isFireTV) {
        // Simple instant swap for Fire TV to reduce memory pressure
        setCurrentBgIndex((prev) => (prev + 1) % studioImages.length);
        setNextBgIndex((prev) => (prev + 1) % studioImages.length);
        return;
      }

      try {
        // Preload next image
        const nextImage = new Image();
        nextImage.src = studioImages[nextBgIndex];
        await nextImage.decode();
        
        // Start fade transition
        setIsFading(true);
        
        // After transition, update indices
        setTimeout(() => {
          setCurrentBgIndex(nextBgIndex);
          setNextBgIndex((nextBgIndex + 1) % studioImages.length);
          setIsFading(false);
        }, 2000);
      } catch (error) {
        console.warn('Background preload failed, using instant swap:', error);
        setCurrentBgIndex((prev) => (prev + 1) % studioImages.length);
        setNextBgIndex((prev) => (prev + 1) % studioImages.length);
      }
    };

    const interval = setInterval(rotateBackground, 12000);
    return () => clearInterval(interval);
  }, [currentBgIndex, nextBgIndex, studioImages, isFireTV]);

  // Function to render the Featured section with multiple rows
  const renderFeaturedSection = () => {
    if (!streamData) return null;

    const sortStreamsByTitle = (streams: StreamData[]) => 
      streams.sort((a, b) => a.title.localeCompare(b.title));

    const featuredStreams = streamData.featured.map(convertStreamToStreamData);
    const uhdStreams = streamData.uhd?.map(convertStreamToStreamData) || [];

    return (
      <div className="relative min-h-screen">
        {/* Optimized Studio Background Images - Only 2 in memory */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Current background image */}
          <img
            src={studioImages[currentBgIndex]}
            alt="Studio background"
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-2000 ease-in-out will-change-[opacity] [transform:translateZ(0)] opacity-100"
            loading="eager"
            decoding="async"
          />
          
          {/* Next background image - only visible during fade */}
          {!isFireTV && (
            <img
              src={studioImages[nextBgIndex]}
              alt="Next studio background"
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-2000 ease-in-out will-change-[opacity] [transform:translateZ(0)] ${
                isFading ? 'opacity-100' : 'opacity-0'
              }`}
              loading="lazy"
              decoding="async"
            />
          )}
          
          {/* Darker overlay to dim images and ensure text readability */}
          <div className="absolute inset-0 bg-black/75" />
        </div>

        {/* Content positioned at the top */}
        <div className="relative z-10 pt-8 pb-20 space-y-12">
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
      // Show studio carousel
      const sortedStudios = studiosData?.sort((a, b) => a.name.localeCompare(b.name)) || [];
      
      const handleStudioKeyDown = (e: React.KeyboardEvent) => {
        switch (e.key) {
          case 'ArrowLeft':
            e.preventDefault();
            if (focusedStudioIndex > 0) {
              const newIndex = focusedStudioIndex - 1;
              setFocusedStudioIndex(newIndex);
              studioRefs.current[newIndex]?.focus();
              studioRefs.current[newIndex]?.scrollIntoView({ inline: 'center', block: 'nearest' });
            }
            break;
          case 'ArrowRight':
            e.preventDefault();
            if (focusedStudioIndex < sortedStudios.length - 1) {
              const newIndex = focusedStudioIndex + 1;
              setFocusedStudioIndex(newIndex);
              studioRefs.current[newIndex]?.focus();
              studioRefs.current[newIndex]?.scrollIntoView({ inline: 'center', block: 'nearest' });
            }
            break;
          case 'ArrowUp':
            e.preventDefault();
            // Exit to top navigation
            const activeNavButton = document.querySelector('[data-nav-index][data-testid*="nav-"][class*="bg-white"]') as HTMLElement;
            if (activeNavButton) {
              activeNavButton.focus();
            } else {
              // Fallback to first nav button if active one isn't found
              const firstNavButton = document.querySelector('[data-nav-index="0"]') as HTMLElement;
              firstNavButton?.focus();
            }
            break;
        }
      };
      
      return (
        <div className="relative mb-10 w-full">
          <h2 className="text-white font-bold mb-8 px-8 text-2xl" data-testid="section-studios">
            Studios
          </h2>
          
          {/* Studio Carousel */}
          <div className="w-full" data-testid="studio-scroll-container">
            <div 
              className="overflow-x-auto overflow-y-visible scrollbar-hide px-8 py-2"
              onKeyDown={handleStudioKeyDown}
              tabIndex={-1}
            >
              <div className="flex gap-6 pb-8 w-max">
                {sortedStudios.map((studio, index) => (
                  <div
                    key={studio.id}
                    ref={(el) => studioRefs.current[index] = el}
                    tabIndex={index === focusedStudioIndex ? 0 : -1}
                    onFocus={() => setFocusedStudioIndex(index)}
                    className="flex-shrink-0 outline-none"
                  >
                    <StudioCard
                      studio={studio}
                      onClick={handleStudioSelect}
                      className="flex-shrink-0"
                      data-testid={`studio-card-${studio.id}`}
                    />
                  </div>
                ))}
              </div>
            </div>
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
          ) : currentSection.useGrid ? (
            <StreamGrid
              title={currentSection.title}
              streams={currentSection.streams}
              onStreamSelect={handleStreamSelect}
            />
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