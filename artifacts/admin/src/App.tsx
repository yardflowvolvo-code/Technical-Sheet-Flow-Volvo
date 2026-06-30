import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";
import Portaria from "@/pages/portaria";
import Doca from "@/pages/doca";
import Relatorios from "@/pages/relatorios";
import Configuracoes from "@/pages/configuracoes";
import Sidebar from "@/components/layout/sidebar";

const queryClient = new QueryClient();

function RedirectTo({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation(to);
  }, [setLocation, to]);
  return null;
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground dark">
      <Sidebar />
      <main className="flex-1 overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <RedirectTo to="/portaria" />} />
      <Route path="/portaria">
        <Layout><Portaria /></Layout>
      </Route>
      <Route path="/doca">
        <Layout><Doca /></Layout>
      </Route>
      <Route path="/relatorios">
        <Layout><Relatorios /></Layout>
      </Route>
      <Route path="/configuracoes">
        <Layout><Configuracoes /></Layout>
      </Route>
      <Route>
        <Layout><NotFound /></Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
