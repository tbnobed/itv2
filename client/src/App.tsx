import React from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import StreamingInterface from "@/components/StreamingInterface";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

// Admin page imports
import UserManagement from "@/pages/admin/user-management";
import StreamsListPage from "@/pages/admin/streams-list";
import StreamFormPage from "@/pages/admin/stream-form";
import StudiosListPage from "@/pages/admin/studios-list";
import StudioFormPage from "@/pages/admin/studio-form";

// Protected wrapper for streaming interface
const ProtectedStreamingInterface = ({ activeSection }: { activeSection: string }) => {
  return <ProtectedRoute path="" component={() => <StreamingInterface activeSection={activeSection} />} />;
};

// Protected route wrapper for admin components
const AdminRoute = ({ component: Component }: { component: React.ComponentType }) => {
  return <ProtectedRoute path="" component={() => <Component />} />;
};

function Router({ activeSection }: { activeSection: string }) {
  return (
    <Switch>
      {/* Auth Route */}
      <Route path="/auth" component={AuthPage} />
      
      {/* Protected Admin Routes */}
      <Route path="/admin/users">
        {() => <AdminRoute component={UserManagement} />}
      </Route>
      <Route path="/admin/streams">
        {() => <AdminRoute component={StreamsListPage} />}
      </Route>
      <Route path="/admin/streams/new">
        {() => <AdminRoute component={StreamFormPage} />}
      </Route>
      <Route path="/admin/streams/edit/:id">
        {() => <AdminRoute component={StreamFormPage} />}
      </Route>
      <Route path="/admin/studios">
        {() => <AdminRoute component={StudiosListPage} />}
      </Route>
      <Route path="/admin/studios/new">
        {() => <AdminRoute component={StudioFormPage} />}
      </Route>
      <Route path="/admin/studios/edit/:id">
        {() => <AdminRoute component={StudioFormPage} />}
      </Route>
      
      {/* Protected Main Routes - Require authentication for all users */}
      <Route path="/">{() => <ProtectedStreamingInterface activeSection={activeSection} />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

// Header component with logout functionality
function AppHeader() {
  const { user, logoutMutation } = useAuth();
  const [location, navigate] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate();
    // Navigate to auth page after logout
    navigate('/auth');
  };

  // Only show logout button if user is logged in and not on auth page
  const showLogoutButton = user && !location.startsWith('/auth');

  return (
    <header className="flex items-center justify-between p-2 border-b">
      <SidebarTrigger data-testid="button-sidebar-toggle" />
      {showLogoutButton && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          data-testid="button-logout"
          className="flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
        </Button>
      )}
    </header>
  );
}

function App() {
  const [activeSection, setActiveSection] = React.useState('featured');
  
  // TV Device Detection and Scaling
  React.useEffect(() => {
    const detectTVDevice = () => {
      const userAgent = navigator.userAgent;
      const screenWidth = screen.width;
      const screenHeight = screen.height;
      const devicePixelRatio = window.devicePixelRatio || 1;
      const actualWidth = screenWidth * devicePixelRatio;
      const actualHeight = screenHeight * devicePixelRatio;
      
      // TV/OTT device detection
      const isTVBrowser = /Silk|AFT|BRAVIA|Tizen|webOS|SmartTV|NetCast/i.test(userAgent) ||
                          /CrKey|GoogleTV|AndroidTV/i.test(userAgent);
      
      // Heuristic: Large screens with coarse pointer (typical of TV devices)
      const isLargeScreen = actualWidth >= 1280 && actualHeight >= 720;
      const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
      
      if (isTVBrowser || (isLargeScreen && hasCoarsePointer)) {
        const rootElement = document.getElementById('root');
        if (rootElement) {
          // Apply scaling based on resolution
          let scale = 1;
          if (actualWidth >= 3840 && actualHeight >= 2160) {
            scale = 0.5; // 4K TVs
          } else if (actualWidth >= 1920 && actualHeight >= 1080) {
            scale = 0.6; // 1080p TVs
          } else if (actualWidth >= 1280 && actualHeight >= 720) {
            scale = 0.75; // 720p TVs
          }
          
          // Set CSS variable and apply class
          document.documentElement.style.setProperty('--tv-scale', scale.toString());
          
          // Check current route to avoid scaling on auth page
          const currentPath = window.location.pathname;
          if (!currentPath.includes('/auth')) {
            rootElement.classList.add('tv-scale');
          }
          
          // Listen for route changes to toggle scaling
          const toggleScalingForRoute = () => {
            const path = window.location.pathname;
            if (path.includes('/auth')) {
              rootElement.classList.remove('tv-scale');
            } else {
              rootElement.classList.add('tv-scale');
            }
          };
          
          // Listen for navigation events
          window.addEventListener('popstate', toggleScalingForRoute);
          
          console.log(`TV device detected: ${userAgent}, Resolution: ${actualWidth}x${actualHeight}, Scale: ${scale}`);
        }
      }
    };
    
    detectTVDevice();
  }, []);
  
  // Custom sidebar width for streaming application
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar 
                activeSection={activeSection} 
                onSectionChange={setActiveSection}
              />
              <div className="flex flex-col flex-1">
                <AppHeader />
                <main className="flex-1 overflow-hidden">
                  <Router activeSection={activeSection} />
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
