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
import { AuthProvider } from "@/hooks/use-auth";
import { AdminProtectedRoute } from "@/lib/protected-route";

// Admin page imports
import StreamsListPage from "@/pages/admin/streams-list";
import StreamFormPage from "@/pages/admin/stream-form";
import StudiosListPage from "@/pages/admin/studios-list";
import StudioFormPage from "@/pages/admin/studio-form";

// Wrapper component to make StreamingInterface compatible with wouter
const Home = ({ activeSection }: { activeSection: string }) => <StreamingInterface activeSection={activeSection} />;

// Protected admin route wrapper
const AdminRoute = ({ component: Component }: { component: React.ComponentType }) => {
  return <AdminProtectedRoute path="" component={Component} />;
};

function Router({ activeSection }: { activeSection: string }) {
  return (
    <Switch>
      {/* Auth Route */}
      <Route path="/auth" component={AuthPage} />
      
      {/* Protected Admin Routes */}
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
      
      {/* Main Routes */}
      <Route path="/">{() => <Home activeSection={activeSection} />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [activeSection, setActiveSection] = React.useState('featured');
  
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
                <header className="flex items-center justify-between p-2 border-b">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                </header>
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
