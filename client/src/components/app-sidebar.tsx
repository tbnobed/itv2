import { useState, useEffect } from 'react';
import { Home, Video, Radio, Tv, Settings, Plus, Edit3 } from 'lucide-react';
import { useLocation } from 'wouter';

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

  // Sync with parent activeSection changes
  useEffect(() => {
    setSelectedSection(activeSection);
  }, [activeSection]);

  const handleSectionSelect = (sectionId: string) => {
    setSelectedSection(sectionId);
    onSectionChange?.(sectionId);
    
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
          <SidebarGroupLabel className="text-primary font-bold text-lg">
            OBTV Streams
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => handleSectionSelect(item.id)}
                    isActive={selectedSection === item.id && !location.startsWith('/admin')}
                    data-testid={`nav-${item.id}`}
                    className="flex items-center gap-3 w-full text-left"
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground font-semibold text-sm">
            Administration
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => handleAdminNavigate(item.path)}
                    isActive={location === item.path}
                    data-testid={`nav-${item.id}`}
                    className="flex items-center gap-3 w-full text-left"
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

// Also export as default for better module resolution
export default AppSidebar;