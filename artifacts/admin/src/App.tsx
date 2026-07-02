import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { SignIn, useAuth } from "@clerk/react";
import { Truck } from "lucide-react";
import { setAuthTokenGetter, useGetMe } from "@workspace/api-client-react";
import { canAccess, defaultRouteFor } from "@/lib/access";
import NotFound from "@/pages/not-found";
import Portaria from "@/pages/portaria";
import Doca from "@/pages/doca";
import Mapa from "@/pages/mapa";
import Relatorios from "@/pages/relatorios";
import Configuracoes from "@/pages/configuracoes";
import Usuarios from "@/pages/usuarios";
import Sidebar from "@/components/layout/sidebar";

const queryClient = new QueryClient();

function RedirectTo({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation(to);
  }, [setLocation, to]);
  return null;
}

function RedirectToHome() {
  const { data: me, isLoading } = useGetMe();
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <span className="h-8 w-8 rounded-full border-2 border-primary border-r-transparent animate-spin" />
      </div>
    );
  }
  return <RedirectTo to={defaultRouteFor(me?.companyUser?.role)} />;
}

// Wrap a page with this to only render it for roles allowed by
// lib/access.ts — anyone else is bounced to their own home page instead
// of seeing a page whose data will just 403 anyway.
function RoleGuard({
  path,
  children,
}: {
  path: string;
  children: React.ReactNode;
}) {
  const { data: me, isLoading } = useGetMe();
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <span className="h-8 w-8 rounded-full border-2 border-primary border-r-transparent animate-spin" />
      </div>
    );
  }
  const role = me?.companyUser?.role;
  if (!canAccess(role, path)) {
    return <RedirectTo to={defaultRouteFor(role)} />;
  }
  return <>{children}</>;
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
    <div className="flex flex-col md:flex-row min-h-screen w-full bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={RedirectToHome} />
      <Route path="/portaria">
        <RoleGuard path="/portaria">
          <Layout><Portaria /></Layout>
        </RoleGuard>
      </Route>
      <Route path="/doca">
        <RoleGuard path="/doca">
          <Layout><Doca /></Layout>
        </RoleGuard>
      </Route>
      <Route path="/mapa">
        <RoleGuard path="/mapa">
          <Layout><Mapa /></Layout>
        </RoleGuard>
      </Route>
      <Route path="/relatorios">
        <RoleGuard path="/relatorios">
          <Layout><Relatorios /></Layout>
        </RoleGuard>
      </Route>
      <Route path="/configuracoes">
        <RoleGuard path="/configuracoes">
          <Layout><Configuracoes /></Layout>
        </RoleGuard>
      </Route>
      <Route path="/usuarios">
        <RoleGuard path="/usuarios">
          <Layout><Usuarios /></Layout>
        </RoleGuard>
      </Route>
      <Route>
        <Layout><NotFound /></Layout>
      </Route>
    </Switch>
  );
}

function SignInPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden p-6">
      {/* Ambient brand accents */}
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
            <p className="text-muted-foreground text-[10px] uppercase tracking-widest mt-1">
              Yard Management
            </p>
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-lg font-semibold text-foreground">Bem-vindo(a) de volta</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Entre com sua conta para acessar o painel.
          </p>
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
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
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
