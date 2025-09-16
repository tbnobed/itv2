import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Search, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TopNavigationProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onLogout: () => void;
  username?: string;
}

const navigationItems = [
  { id: 'featured', label: 'Featured' },
  { id: 'overTheAir', label: 'Over The Air' },
  { id: 'liveFeeds', label: 'Live Feeds' },
  { id: 'studios', label: 'Studios' },
];

export default function TopNavigation({ 
  activeSection, 
  onSectionChange, 
  onLogout,
  username 
}: TopNavigationProps) {
  const [focusedIndex, setFocusedIndex] = useState(0);

  const handleKeyDown = (e: React.KeyboardEvent, index: number, action?: () => void) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        if (index > 0) {
          setFocusedIndex(index - 1);
          // Focus the previous element
          const prevElement = e.currentTarget.parentElement?.previousElementSibling?.firstChild as HTMLElement;
          prevElement?.focus();
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        const totalItems = navigationItems.length + 2; // +2 for search and profile buttons
        if (index < totalItems - 1) {
          setFocusedIndex(index + 1);
          // Focus the next element
          const nextElement = e.currentTarget.parentElement?.nextElementSibling?.firstChild as HTMLElement;
          nextElement?.focus();
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        action?.();
        break;
    }
  };

  return (
    <nav className="bg-black/90 backdrop-blur-sm px-8 py-4 flex items-center justify-between sticky top-0 z-40 border-b border-gray-800">
      {/* Left Section - Navigation Categories */}
      <div className="flex items-center gap-2">
        {navigationItems.map((item, index) => (
          <div key={item.id}>
            <Button
              variant={activeSection === item.id ? "default" : "ghost"}
              size="sm"
              className={cn(
                "px-6 py-2 rounded-full font-medium transition-all duration-200",
                "hover-elevate active-elevate-2 focus-visible:ring-2 focus-visible:ring-white",
                activeSection === item.id 
                  ? "bg-white text-black hover:bg-white/90" 
                  : "text-gray-300 hover:text-white hover:bg-white/10"
              )}
              onClick={() => onSectionChange(item.id)}
              onKeyDown={(e) => handleKeyDown(e, index, () => onSectionChange(item.id))}
              data-testid={`nav-${item.id}`}
            >
              {item.label}
            </Button>
          </div>
        ))}
      </div>

      {/* Right Section - Search and User */}
      <div className="flex items-center gap-4">
        {/* Search Button */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="px-4 py-2 rounded-full text-gray-300 hover:text-white hover:bg-white/10 hover-elevate active-elevate-2 focus-visible:ring-2 focus-visible:ring-white"
            onKeyDown={(e) => handleKeyDown(e, navigationItems.length)}
            data-testid="nav-search"
          >
            <Search className="w-5 h-5 mr-2" />
            Search
          </Button>
        </div>

        {/* User Profile/Logout */}
        <div className="flex items-center gap-3">
          {username && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10">
              <User className="w-5 h-5 text-gray-300" />
              <span className="text-gray-300 text-sm font-medium">{username}</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="px-3 py-2 rounded-full text-gray-300 hover:text-white hover:bg-red-500/20 hover-elevate active-elevate-2 focus-visible:ring-2 focus-visible:ring-white"
            onKeyDown={(e) => handleKeyDown(e, navigationItems.length + 1, onLogout)}
            data-testid="nav-logout"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </nav>
  );
}