import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { registerServiceWorker } from "@/lib/pwa";
import LinkPage from "@/pages/link";
import StatusPage from "@/pages/status";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5000,
    },
  },
});

function AppContent() {
  const [arrivalId, setArrivalId] = useState<number | null>(() => {
    const stored = localStorage.getItem("yardflow_arrival_id");
    return stored ? Number(stored) : null;
  });

  useEffect(() => {
    registerServiceWorker();
  }, []);

  function handleLinked(id: number) {
    setArrivalId(id);
  }

  function handleUnlink() {
    setArrivalId(null);
  }

  return (
    <Switch>
      <Route path="/">
        {arrivalId ? (
          <StatusPage arrivalId={arrivalId} onUnlink={handleUnlink} />
        ) : (
          <LinkPage onLinked={handleLinked} />
        )}
      </Route>
      <Route path="/status">
        {arrivalId ? (
          <StatusPage arrivalId={arrivalId} onUnlink={handleUnlink} />
        ) : (
          <LinkPage onLinked={handleLinked} />
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppContent />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
