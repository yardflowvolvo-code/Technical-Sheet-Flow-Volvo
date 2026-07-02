import { Link, useLocation } from "wouter";
import {
  Truck,
  ClipboardList,
  BarChart3,
  Settings,
  LogOut,
  Map,
  UserCog,
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

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { data: me } = useGetMe();
  const role = me?.companyUser?.role;

  const navItems = ALL_NAV_ITEMS.filter((item) => canAccess(role, item.href));

  const initials = user?.firstName
    ? user.firstName.charAt(0) + (user.lastName?.charAt(0) ?? "")
    : "OP";

  return (
    <div className="w-64 border-r border-sidebar-border bg-sidebar flex flex-col min-h-screen">
      <div className="p-4 border-b border-sidebar-border flex items-center justify-center">
        <div className="bg-white rounded-xl px-3 py-2">
          <img
            src={`${import.meta.env.BASE_URL}yardflow-logo.png`}
            alt="YardFlow"
            className="h-10 w-auto object-contain"
          />
        </div>
      </div>

      <div className="p-4 flex-1">
        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
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

      <div className="p-4 border-t border-sidebar-border bg-sidebar-accent/40">
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
            onClick={() => signOut()}
            className="shrink-0 p-1.5 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            title="Sair"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
