import { Link, useLocation } from "wouter";
import {
  Truck,
  ClipboardList,
  BarChart3,
  Settings,
  TerminalSquare,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser, useClerk } from "@clerk/react";

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();

  const navItems = [
    { href: "/portaria", label: "Portaria", icon: ClipboardList },
    { href: "/doca", label: "Gestão de Pátio", icon: Truck },
    { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
    { href: "/configuracoes", label: "Configurações", icon: Settings },
  ];

  const initials = user?.firstName
    ? user.firstName.charAt(0) + (user.lastName?.charAt(0) ?? "")
    : "OP";

  return (
    <div className="w-64 border-r border-border bg-card flex flex-col min-h-screen">
      <div className="p-6 flex items-center gap-3 border-b border-border">
        <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
          <TerminalSquare size={20} className="stroke-[2.5px]" />
        </div>
        <div>
          <h1 className="font-bold text-lg tracking-tight leading-none text-foreground">
            YARDFLOW
          </h1>
          <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-widest mt-1">
            Control Center
          </p>
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
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent"
                )}
              >
                <Icon size={18} className={cn(isActive ? "text-primary" : "text-muted-foreground")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-border bg-sidebar-accent/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center overflow-hidden shrink-0">
            {user?.imageUrl ? (
              <img src={user.imageUrl} alt={initials} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-muted-foreground uppercase">{initials}</span>
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "Operador"}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              <p className="text-xs text-muted-foreground">Online</p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="Sair"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
