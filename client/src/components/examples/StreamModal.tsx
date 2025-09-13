import { useState } from 'react';
import StreamModal from '../StreamModal';
import { Button } from '@/components/ui/button';

export default function StreamModalExample() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStream, setCurrentStream] = useState({
    id: 'demo-stream',
    title: 'Demo Studio Feed',
    url: 'webrtc://localhost:1985/live/demo'
  });

  const openModal = (streamData: typeof currentStream) => {
    setCurrentStream(streamData);
    setIsModalOpen(true);
    console.log('Opening stream modal for:', streamData.title);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    console.log('Closing stream modal');
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-6">Stream Modal Demo</h1>
        
        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={() => openModal({
              id: 'SA001',
              title: 'Studio A Control Room',
              url: 'webrtc://localhost:1985/live/studio-a'
            })}
            className="p-6 h-auto flex flex-col gap-2"
            data-testid="button-demo-studio-a"
          >
            <span className="font-medium">Studio A</span>
            <span className="text-sm opacity-80">#SA001</span>
          </Button>
          
          <Button
            onClick={() => openModal({
              id: 'DC001',
              title: 'Dallas Control Center',
              url: 'webrtc://localhost:1985/live/dallas-control'
            })}
            className="p-6 h-auto flex flex-col gap-2"
            data-testid="button-demo-dallas"
          >
            <span className="font-medium">Dallas Control</span>
            <span className="text-sm opacity-80">#DC001</span>
          </Button>
        </div>
        
        <div className="mt-6 text-sm text-muted-foreground">
          <p>Click a button above to open the stream modal.</p>
          <p className="mt-2">Modal controls:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Press ESC to close</li>
            <li>Press F for fullscreen</li>
            <li>Press M or Space to toggle mute</li>
            <li>Click outside modal to close</li>
          </ul>
        </div>
      </div>

      <StreamModal
        isOpen={isModalOpen}
        streamId={currentStream.id}
        streamUrl={currentStream.url}
        streamTitle={currentStream.title}
        onClose={closeModal}
      />
    </div>
  );
}