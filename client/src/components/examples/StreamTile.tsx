import StreamTile from '../StreamTile';
import logoUrl from '@assets/generated_images/Studio_A_control_room_42819489.png';

export default function StreamTileExample() {
  return (
    <div className="flex flex-wrap gap-6 p-6">
      <StreamTile
        id="studio-a"
        title="Studio A Control Room"
        thumbnail={logoUrl}
        streamId="SA001"
        size="regular"
        onSelect={(streamId) => console.log('Selected stream:', streamId)}
      />
      
      <StreamTile
        id="featured-main"
        title="Featured Live Production"
        thumbnail={logoUrl}
        streamId="FP001"
        size="featured"
        onSelect={(streamId) => console.log('Selected featured stream:', streamId)}
      />
    </div>
  );
}