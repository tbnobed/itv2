import React from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import StreamingInterface from "@/components/StreamingInterface";
import NotFound from "@/pages/not-found";

// Wrapper component to make StreamingInterface compatible with wouter
const Home = ({ activeSection }: { activeSection: string }) => <StreamingInterface activeSection={activeSection} />;

function Router({ activeSection }: { activeSection: string }) {
  return (
    <Switch>
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
    </QueryClientProvider>
  );
}

export default App;
