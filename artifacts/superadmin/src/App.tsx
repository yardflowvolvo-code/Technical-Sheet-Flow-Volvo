import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { SignIn, useAuth } from "@clerk/react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import NotFound from "@/pages/not-found";
import Companies from "@/pages/companies";
import CompanyDetail from "@/pages/company-detail";

const queryClient = new QueryClient();

function AuthTokenSync() {
  const { getToken } = useAuth();
  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [getToken]);
  return null;
}

function SignInPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background dark">
      <div className="flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <div className="bg-white rounded-2xl px-6 py-4 shadow-lg">
            <img
              src={`${import.meta.env.BASE_URL}yardflow-logo.png`}
              alt="YardFlow"
              className="h-20 w-auto object-contain"
            />
          </div>
          <span className="text-xs text-primary font-mono tracking-widest uppercase font-semibold">Superadmin</span>
        </div>
        <SignIn routing="hash" signUpUrl={undefined} />
      </div>
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { signOut } = useAuth();
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground dark">
      <aside className="w-60 border-r border-border bg-card flex flex-col min-h-screen">
        <div className="p-3 border-b border-border flex items-center justify-center">
          <div className="bg-white rounded-xl px-3 py-1.5">
            <img
              src={`${import.meta.env.BASE_URL}yardflow-logo.png`}
              alt="YardFlow"
              className="h-8 w-auto object-contain"
            />
          </div>
        </div>
        <nav className="p-3 flex-1 flex flex-col gap-1">
          <button
            onClick={() => setLocation("/")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-left w-full transition-colors ${location === "/" ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent"}`}
          >
            <span>🏢</span>
            Empresas
          </button>
        </nav>
        <div className="p-3 border-t border-border">
          <button
            onClick={() => signOut?.()}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors w-full"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sair
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-hidden flex flex-col">{children}</main>
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

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Companies} />
        <Route path="/companies/:id" component={CompanyDetail} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
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
