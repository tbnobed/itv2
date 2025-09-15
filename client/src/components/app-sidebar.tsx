import { useState, useEffect } from 'react';
import { Home, Video, Radio, Tv, Settings, Plus, Edit3 } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from "@/components/ui/sidebar";

// Navigation sections
const navigationItems = [
  {
    title: "Featured",
    icon: Home,
    id: "featured",
  },
  {
    title: "Studios", 
    icon: Video,
    id: "studios",
  },
  {
    title: "Over The Air",
    icon: Radio,
    id: "overTheAir",
  },
  {
    title: "Live Feeds",
    icon: Tv,
    id: "liveFeeds", 
  },
];

// Admin navigation items
const adminItems = [
  {
    title: "Manage Users",
    icon: Settings,
    id: "admin-users",
    path: "/admin/users"
  },
  {
    title: "Manage Streams",
    icon: Edit3,
    id: "admin-streams",
    path: "/admin/streams"
  },
  {
    title: "Manage Studios",
    icon: Settings,
    id: "admin-studios", 
    path: "/admin/studios"
  },
  {
    title: "Add Stream",
    icon: Plus,
    id: "admin-add-stream",
    path: "/admin/streams/new"
  }
];

interface AppSidebarProps {
  activeSection?: string;
  onSectionChange?: (sectionId: string) => void;
}

export function AppSidebar({ activeSection = "featured", onSectionChange }: AppSidebarProps) {
  const [selectedSection, setSelectedSection] = useState(activeSection);
  const { setOpenMobile } = useSidebar();
  const [location, navigate] = useLocation();
  const { user, isLoading } = useAuth();
  
  // Check if user is admin - wait for loading to complete
  const isAdmin = !isLoading && user?.role === 'admin';

  // Sync with parent activeSection changes
  useEffect(() => {
    setSelectedSection(activeSection);
  }, [activeSection]);

  const handleSectionSelect = (sectionId: string) => {
    console.log('Sidebar section clicked:', sectionId);
    setSelectedSection(sectionId);
    onSectionChange?.(sectionId);
    
    // Navigate to root path to show streaming interface if currently on admin pages
    if (location.startsWith('/admin')) {
      navigate('/');
    }
    
    // Auto-hide sidebar on mobile/tablet after selection
    setOpenMobile(false);
  };

  const handleAdminNavigate = (path: string) => {
    navigate(path);
    
    // Auto-hide sidebar on mobile/tablet after selection
    setOpenMobile(false);
  };

  return (
    <Sidebar data-testid="app-sidebar">
      <SidebarContent className="bg-background/95 backdrop-blur-sm">
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-center py-4">
            <img 
              src="/assets/obtv-logo.png" 
              alt="OBTV" 
              className="h-16 w-auto"
              data-testid="obtv-logo"
            />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-1">
              {navigationItems.map((item) => {
                const isActive = selectedSection === item.id && !location.startsWith('/admin');
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      console.log('Direct button clicked:', item.id);
                      handleSectionSelect(item.id);
                    }}
                    data-testid={`nav-${item.id}`}
                    className={`
                      flex items-center gap-3 w-full text-left p-2 rounded-md transition-colors
                      hover:bg-accent hover:text-accent-foreground
                      ${isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}
                    `}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.title}</span>
                  </button>
                );
              })}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section - Only show for admin users */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-muted-foreground font-semibold text-sm">
              Administration
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="space-y-1">
                {adminItems.map((item) => {
                  const isActive = location === item.path;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        console.log('Direct admin button clicked:', item.id);
                        handleAdminNavigate(item.path);
                      }}
                      data-testid={`nav-${item.id}`}
                      className={`
                        flex items-center gap-3 w-full text-left p-2 rounded-md transition-colors
                        hover:bg-accent hover:text-accent-foreground
                        ${isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}
                      `}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </button>
                  );
                })}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}

// Also export as default for better module resolution
export default AppSidebar;