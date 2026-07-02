import { Link, useLocation } from "wouter";
import { useState } from "react";
import {
  Truck,
  ClipboardList,
  BarChart3,
  Settings,
  LogOut,
  Map,
  UserCog,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser, useClerk } from "@clerk/react";
import { useGetMe } from "@workspace/api-client-react";
import { canAccess } from "@/lib/access";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

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
    <div className="p-5 border-b border-sidebar-border flex items-center justify-center shrink-0">
      <div className="bg-white rounded-xl px-4 py-3 shadow-sm">
        <img
          src={`${import.meta.env.BASE_URL}yardflow-logo.png`}
          alt="YardFlow"
          className="h-14 w-auto object-contain"
        />
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
        <div className="bg-white rounded-lg px-2.5 py-1.5">
          <img
            src={`${import.meta.env.BASE_URL}yardflow-logo.png`}
            alt="YardFlow"
            className="h-8 w-auto object-contain"
          />
        </div>
        <div className="w-9" aria-hidden />
      </div>

      {/* Mobile: drawer with the same nav */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0 bg-sidebar border-sidebar-border flex flex-col gap-0">
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <Brand />
          <NavList navItems={navItems} location={location} onNavigate={() => setMobileOpen(false)} />
          <Profile user={user} onSignOut={() => signOut()} />
        </SheetContent>
      </Sheet>
    </>
  );
}
