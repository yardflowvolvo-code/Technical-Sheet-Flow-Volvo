import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { registerServiceWorker } from "@/lib/pwa";
import { unlockAudio } from "@/lib/alarm";
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
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("yardflow_token")
  );

  useEffect(() => {
    registerServiceWorker();
  }, []);

  useEffect(() => {
    // Unlocks the alarm's AudioContext on the very first tap anywhere in
    // the app — covers drivers reopening the app with a status already
    // "called", who might not otherwise tap a button before the alarm
    // needs to play.
    function onFirstInteraction() {
      unlockAudio();
      window.removeEventListener("pointerdown", onFirstInteraction);
    }
    window.addEventListener("pointerdown", onFirstInteraction, { once: true });
    return () => window.removeEventListener("pointerdown", onFirstInteraction);
  }, []);

  function handleLinked(newToken: string) {
    setToken(newToken);
  }

  function handleUnlink() {
    setToken(null);
  }

  return (
    <Switch>
      <Route path="/">
        {token ? (
          <StatusPage token={token} onUnlink={handleUnlink} />
        ) : (
          <LinkPage onLinked={handleLinked} />
        )}
      </Route>
      <Route path="/status">
        {token ? (
          <StatusPage token={token} onUnlink={handleUnlink} />
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
