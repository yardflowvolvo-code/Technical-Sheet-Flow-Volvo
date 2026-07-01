import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { SignIn, useAuth } from "@clerk/react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import NotFound from "@/pages/not-found";
import Portaria from "@/pages/portaria";
import Doca from "@/pages/doca";
import Mapa from "@/pages/mapa";
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

function AuthTokenSync() {
  const { getToken } = useAuth();
  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [getToken]);
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
      <Route path="/mapa">
        <Layout><Mapa /></Layout>
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

function SignInPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background dark">
      <div className="flex flex-col items-center gap-6">
        <div className="bg-white rounded-2xl px-6 py-4 shadow-lg">
          <img
            src={`${import.meta.env.BASE_URL}yardflow-logo.png`}
            alt="YardFlow"
            className="h-20 w-auto object-contain"
          />
        </div>
        <SignIn routing="hash" signUpUrl={undefined} />
      </div>
    </div>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background dark">
        <span className="h-8 w-8 rounded-full border-2 border-primary border-r-transparent animate-spin" />
      </div>
    );
  }
  if (!isSignedIn) return <SignInPage />;
  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthGate>
            <AuthTokenSync />
            <Router />
          </AuthGate>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
