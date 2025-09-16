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

// Protected wrapper for streaming interface (Android TV style)
const ProtectedStreamingInterface = () => {
  return <ProtectedRoute path="" component={() => <StreamingInterface />} />;
};

// Protected route wrapper for admin components
const AdminRoute = ({ component: Component }: { component: React.ComponentType }) => {
  return <ProtectedRoute path="" component={() => <Component />} />;
};

function Router() {
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
      
      {/* Protected Main Routes - Android TV Style */}
      <Route path="/">{() => <ProtectedStreamingInterface />}</Route>
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
  const [location] = useLocation();
  
  // Check if current route is auth page or admin page
  const isAuthRoute = location.startsWith('/auth');
  const isAdminRoute = location.startsWith('/admin');
  
  // TV Device Detection and Scaling
  React.useEffect(() => {
    const detectTVDevice = () => {
      const userAgent = navigator.userAgent;
      const screenWidth = screen.width;
      const screenHeight = screen.height;
      const devicePixelRatio = window.devicePixelRatio || 1;
      const actualWidth = screenWidth * devicePixelRatio;
      const actualHeight = screenHeight * devicePixelRatio;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // TV/OTT device detection - apply to actual TV devices including Firestick
      const isTVBrowser = /Silk|AFT|BRAVIA|Tizen|webOS|SmartTV|NetCast/i.test(userAgent) ||
                          /CrKey|GoogleTV|AndroidTV/i.test(userAgent);
      
      // Large screen detection (75"+ TVs typically have these dimensions)
      const isLargeTV = viewportWidth >= 1920 && viewportHeight >= 1080;
      
      // Apply aggressive scaling for large displays (including web wrappers)
      if (isTVBrowser || isLargeTV || viewportWidth >= 1920) {
        const rootElement = document.getElementById('root');
        if (rootElement) {
          // Much more aggressive scaling for large displays
          let scale = 1;
          
          // Very large displays (75"+ 4K TVs) - aggressive scaling
          if (viewportWidth >= 2400 || screenWidth >= 4000) {
            scale = 0.45; // Very large displays - much smaller UI
          } else if (viewportWidth >= 1920 || screenWidth >= 3000) {
            scale = 0.5; // Large displays - smaller UI to fit more content
          } else if (viewportWidth >= 1600) {
            scale = 0.65; // Medium large displays
          } else if (viewportWidth >= 1280) {
            scale = 0.75; // Smaller large displays
          }
          
          // Only apply scaling to non-auth pages
          if (!location.startsWith('/auth')) {
            document.documentElement.style.setProperty('--tv-scale', scale.toString());
            rootElement.classList.add('tv-scale');
            // Force style recalculation
            rootElement.style.transform = `scale(${scale})`;
            rootElement.style.transformOrigin = '0 0';
            rootElement.style.width = `${100 / scale}%`;
            rootElement.style.minHeight = `${100 / scale}vh`;
          } else {
            rootElement.classList.remove('tv-scale');
            rootElement.style.removeProperty('transform');
            rootElement.style.removeProperty('transform-origin');
            rootElement.style.removeProperty('width');
            rootElement.style.removeProperty('min-height');
          }
          
          console.log(`Large display detected: ${userAgent}, Viewport: ${viewportWidth}x${viewportHeight}, Screen: ${screenWidth}x${screenHeight}, DPR: ${devicePixelRatio}, Scale: ${scale}`);
        }
      } else {
        // Remove scaling for non-large devices
        const rootElement = document.getElementById('root');
        if (rootElement) {
          rootElement.classList.remove('tv-scale');
          rootElement.style.removeProperty('transform');
          rootElement.style.removeProperty('transform-origin');
          rootElement.style.removeProperty('width');
          rootElement.style.removeProperty('min-height');
          document.documentElement.style.removeProperty('--tv-scale');
        }
      }
    };
    
    detectTVDevice();
    
    // Re-detect on window resize
    window.addEventListener('resize', detectTVDevice);
    return () => window.removeEventListener('resize', detectTVDevice);
  }, [location]);
  
  // Custom sidebar width for streaming application
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          {isAuthRoute ? (
            // Auth page renders without sidebar/header layout constraints
            <div className="h-screen w-full overflow-auto">
              <Router />
              <Toaster />
            </div>
          ) : isAdminRoute ? (
            // Admin routes use traditional sidebar layout
            <SidebarProvider style={style as React.CSSProperties}>
              <div className="flex min-h-screen w-full">
                <AppSidebar 
                  activeSection="admin" 
                  onSectionChange={() => {}}
                />
                <div className="flex flex-col flex-1 min-w-0">
                  <AppHeader />
                  <main className="flex-1 min-w-0">
                    <Router />
                  </main>
                </div>
              </div>
              <Toaster />
            </SidebarProvider>
          ) : (
            // Main streaming interface uses Android TV full-screen layout
            <div className="h-screen w-full overflow-auto">
              <Router />
              <Toaster />
            </div>
          )}
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
