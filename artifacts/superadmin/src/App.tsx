import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { SignIn, useAuth } from "@clerk/react";
import { Truck } from "lucide-react";
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
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden p-6">
      <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-[#0051EC]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-[#0051EC]/10 blur-3xl" />

      <div className="flex flex-col items-center gap-6 relative w-full max-w-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-[#0051EC] shrink-0">
            <Truck size={22} className="text-white" />
          </div>
          <div className="leading-none notranslate" translate="no">
            <p className="font-bold text-2xl tracking-tight text-foreground">
              <span>Yard</span>
              <span className="text-[#0051EC]">Flow</span>
            </p>
            <span className="text-xs text-primary font-mono tracking-widest uppercase font-semibold">
              Superadmin
            </span>
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-lg font-semibold text-foreground">Bem-vindo(a) de volta</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Entre com sua conta para gerenciar as empresas.
          </p>
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
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="w-60 border-r border-sidebar-border bg-sidebar flex flex-col min-h-screen">
        <div className="p-4 border-b border-sidebar-border flex items-center gap-2.5">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-[#0051EC] shrink-0">
            <Truck size={18} className="text-white" />
          </div>
          <p className="font-bold text-lg tracking-tight leading-none notranslate" translate="no">
            <span className="text-white">Yard</span>
            <span className="text-[#5B9BFF]">Flow</span>
          </p>
        </div>
        <nav className="p-3 flex-1 flex flex-col gap-1">
          <button
            onClick={() => setLocation("/")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-left w-full transition-colors ${location === "/" ? "bg-sidebar-primary/20 text-sidebar-primary border border-sidebar-primary/30" : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent border border-transparent"}`}
          >
            <span>🏢</span>
            Empresas
          </button>
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={() => signOut?.()}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors w-full"
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
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
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
