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
      <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-[#2F5FCE]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-[#2F5FCE]/10 blur-3xl" />

      <div className="w-full max-w-sm relative">
        {/* Brand panel */}
        <div className="w-full bg-[#0B1220] rounded-t-2xl px-6 pt-8 pb-7 shadow-xl flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top,white,transparent_65%)]" />
          <div className="relative flex items-center justify-center h-14 w-14 rounded-2xl bg-[#2F5FCE]/25 border border-[#2F5FCE]/40 mb-3">
            <Truck size={26} className="text-[#8FB0F5]" />
          </div>
          <p className="relative notranslate font-bold text-2xl tracking-tight" translate="no">
            <span className="text-[#5B82D6]">Yard</span>
            <span className="text-[#8FB0F5]">Flow</span>
          </p>
          <p className="relative text-white/40 text-[10px] uppercase tracking-widest mt-1">
            Yard Management
          </p>
          <div className="relative w-10 h-px bg-white/15 my-4" />
          <h1 className="relative text-white font-semibold text-lg">Bem-vindo(a) de volta</h1>
          <p className="relative text-white/60 text-sm mt-1">
            Entre com sua conta para acessar o painel.
          </p>
        </div>

        {/* Sign-in card, flush with the panel above */}
        <div className="w-full bg-white rounded-b-2xl shadow-xl overflow-hidden">
          <SignIn
            routing="hash"
            signUpUrl={undefined}
            appearance={{
              elements: {
                rootBox: "w-full flex justify-center",
                cardBox: "w-full shadow-none",
                card: "w-full shadow-none border-0 rounded-none py-6",
              },
            }}
          />
        </div>
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
