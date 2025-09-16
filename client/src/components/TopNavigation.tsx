import { useState } from 'react';
import { cn } from '@/lib/utils';
import { User, LogOut, Settings, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useLocation } from 'wouter';

interface TopNavigationProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onLogout: () => void;
  username?: string;
  userRole?: string;
}

const navigationItems = [
  { id: 'featured', label: 'Featured' },
  { id: 'overTheAir', label: 'Over The Air' },
  { id: 'liveFeeds', label: 'Live Feeds' },
  { id: 'uhd', label: 'UHD' },
  { id: 'studios', label: 'Studios' },
];

export default function TopNavigation({ 
  activeSection, 
  onSectionChange, 
  onLogout,
  username,
  userRole
}: TopNavigationProps) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [, navigate] = useLocation();
  
  const isAdmin = userRole === 'admin';

  const handleKeyDown = (e: React.KeyboardEvent, index: number, action?: () => void) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        if (index > 0) {
          setFocusedIndex(index - 1);
          // Find and focus the previous focusable element
          const allButtons = document.querySelectorAll('[data-nav-index]');
          const prevButton = Array.from(allButtons).find(btn => 
            btn.getAttribute('data-nav-index') === String(index - 1)
          ) as HTMLElement;
          prevButton?.focus();
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        const totalItems = navigationItems.length + (isAdmin ? 2 : 1); // nav items + admin (if admin) + logout
        if (index < totalItems - 1) {
          setFocusedIndex(index + 1);
          // Find and focus the next focusable element
          const allButtons = document.querySelectorAll('[data-nav-index]');
          const nextButton = Array.from(allButtons).find(btn => 
            btn.getAttribute('data-nav-index') === String(index + 1)
          ) as HTMLElement;
          nextButton?.focus();
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
              data-nav-index={index}
            >
              {item.label}
            </Button>
          </div>
        ))}
      </div>

      {/* Right Section - Search and User */}
      <div className="flex items-center gap-4">
        {/* Admin Menu - Only visible for admin users */}
        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="px-4 py-2 rounded-full text-gray-300 hover:text-white hover:bg-white/10 hover-elevate active-elevate-2 focus-visible:ring-2 focus-visible:ring-white"
                onKeyDown={(e) => handleKeyDown(e, navigationItems.length)}
                data-testid="nav-admin-menu"
                data-nav-index={navigationItems.length}
              >
                <Settings className="w-5 h-5 mr-2" />
                Admin
                <ChevronDown className="w-4 h-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate('/admin/users')} data-testid="admin-manage-users">
                Manage Users
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/admin/streams')} data-testid="admin-manage-streams">
                Manage Streams
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/admin/studios')} data-testid="admin-manage-studios">
                Manage Studios
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/admin/streams/new')} data-testid="admin-add-stream">
                Add Stream
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

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
            onKeyDown={(e) => handleKeyDown(e, isAdmin ? navigationItems.length + 1 : navigationItems.length, onLogout)}
            data-testid="nav-logout"
            data-nav-index={isAdmin ? navigationItems.length + 1 : navigationItems.length}
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </nav>
  );
}