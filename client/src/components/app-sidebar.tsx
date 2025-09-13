import { useState } from 'react';
import { Home, Video, Radio, Tv, Monitor } from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
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

interface AppSidebarProps {
  activeSection?: string;
  onSectionChange?: (sectionId: string) => void;
}

export function AppSidebar({ activeSection = "featured", onSectionChange }: AppSidebarProps) {
  const [selectedSection, setSelectedSection] = useState(activeSection);

  const handleSectionSelect = (sectionId: string) => {
    setSelectedSection(sectionId);
    onSectionChange?.(sectionId);
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
                    asChild
                    isActive={selectedSection === item.id}
                    data-testid={`nav-${item.id}`}
                  >
                    <button 
                      onClick={() => handleSectionSelect(item.id)}
                      className="flex items-center gap-3 w-full text-left"
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </button>
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