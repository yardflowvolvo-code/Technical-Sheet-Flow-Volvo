import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import {
  Truck,
  ClipboardList,
  BarChart3,
  Settings,
  LogOut,
  Map,
  UserCog,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser, useClerk } from "@clerk/react";
import { useGetMe } from "@workspace/api-client-react";
import { canAccess } from "@/lib/access";

const ALL_NAV_ITEMS = [
  { href: "/portaria", label: "Portaria", icon: ClipboardList },
  { href: "/doca", label: "Gestão de Pátio", icon: Truck },
  { href: "/mapa", label: "Mapa do Pátio", icon: Map },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/usuarios", label: "Usuários", icon: UserCog },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

function Brand() {
  return (
    <div className="px-5 py-6 border-b border-sidebar-border flex items-center gap-3 shrink-0">
      <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-[#2F5FCE] shrink-0">
        <Truck size={22} className="text-white" />
      </div>
      <div className="leading-none notranslate" translate="no">
        <p className="font-bold text-2xl tracking-tight">
          <span className="text-[#5B82D6]">Yard</span>
          <span className="text-[#8FB0F5]">Flow</span>
        </p>
        <p className="text-sidebar-foreground/50 text-[10px] uppercase tracking-widest mt-1">
          Sistema de Pátio
        </p>
      </div>
    </div>
  );
}

function NavList({
  navItems,
  location,
  onNavigate,
}: {
  navItems: typeof ALL_NAV_ITEMS;
  location: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="p-4 flex-1 overflow-y-auto">
      <nav className="flex flex-col gap-1.5">
        {navItems.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-primary/20 text-sidebar-primary border border-sidebar-primary/30"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent border border-transparent"
              )}
            >
              <Icon size={18} className={cn(isActive ? "text-sidebar-primary" : "text-sidebar-foreground/60")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function Profile({
  user,
  onSignOut,
}: {
  user: ReturnType<typeof useUser>["user"];
  onSignOut: () => void;
}) {
  const initials = user?.firstName
    ? user.firstName.charAt(0) + (user.lastName?.charAt(0) ?? "")
    : "OP";

  return (
    <div className="p-4 border-t border-sidebar-border bg-sidebar-accent/40 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-sidebar-accent border border-sidebar-border flex items-center justify-center overflow-hidden shrink-0">
          {user?.imageUrl ? (
            <img src={user.imageUrl} alt={initials} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-sidebar-foreground/80 uppercase">{initials}</span>
          )}
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="text-sm font-medium text-sidebar-foreground truncate">
            {user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "Operador"}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
            <p className="text-xs text-sidebar-foreground/60">Online</p>
          </div>
        </div>
        <button
          onClick={onSignOut}
          className="shrink-0 p-1.5 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          title="Sair"
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { data: me } = useGetMe();
  const role = me?.companyUser?.role;
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = ALL_NAV_ITEMS.filter((item) => canAccess(role, item.href));

  // Locks background scroll while the mobile drawer is open. Using a plain
  // effect (rather than a Radix/third-party scroll-lock) guarantees the
  // cleanup always runs — even if the drawer closes via navigation instead
  // of its own close button — so the page can never get stuck unscrollable.
  useEffect(() => {
    if (!mobileOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [mobileOpen]);

  // Also close the drawer whenever the route changes (covers the case
  // where a nav link is clicked without going through onNavigate).
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  return (
    <>
      {/* Desktop: permanent sidebar */}
      <div className="hidden md:flex w-64 border-r border-sidebar-border bg-sidebar flex-col min-h-screen shrink-0">
        <Brand />
        <NavList navItems={navItems} location={location} />
        <Profile user={user} onSignOut={() => signOut()} />
      </div>

      {/* Mobile: top bar with menu button */}
      <div className="md:hidden flex items-center justify-between gap-3 px-3 py-2.5 border-b border-sidebar-border bg-sidebar sticky top-0 z-40 shrink-0">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 -ml-1 rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          aria-label="Abrir menu"
        >
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-[#2F5FCE] shrink-0">
            <Truck size={16} className="text-white" />
          </div>
          <p className="font-bold text-lg tracking-tight leading-none notranslate" translate="no">
            <span className="text-[#5B82D6]">Yard</span>
            <span className="text-[#8FB0F5]">Flow</span>
          </p>
        </div>
        <div className="w-9" aria-hidden />
      </div>

      {/* Mobile: custom drawer (no third-party scroll-lock involved) */}
      <div
        className={cn(
          "md:hidden fixed inset-0 z-50 bg-black/60 transition-opacity duration-200",
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setMobileOpen(false)}
        aria-hidden={!mobileOpen}
      />
      <div
        className={cn(
          "md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-sidebar flex flex-col transition-transform duration-200 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navegação"
      >
        <div className="flex justify-end p-2 shrink-0">
          <button
            onClick={() => setMobileOpen(false)}
            className="p-2 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>
        <Brand />
        <NavList navItems={navItems} location={location} onNavigate={() => setMobileOpen(false)} />
        <Profile user={user} onSignOut={() => signOut()} />
      </div>
    </>
  );
}
