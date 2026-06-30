import { useParams, useLocation } from "wouter";
import {
  useGetCompany,
  useListCompanyUsers,
  useActivateCompany,
  useSuspendCompany,
  getGetCompanyQueryKey,
  getListCompanyUsersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";

const statusColors: Record<string, string> = {
  active: "bg-green-500/15 text-green-500 border-green-500/30",
  delinquent: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
  suspended: "bg-red-500/15 text-red-500 border-red-500/30",
  cancelled: "bg-gray-500/15 text-gray-400 border-gray-500/30",
};

const statusLabels: Record<string, string> = {
  active: "Ativa",
  delinquent: "Inadimplente",
  suspended: "Suspensa",
  cancelled: "Cancelada",
};

const roleLabels: Record<string, string> = {
  gestor: "Gestor",
  portaria: "Portaria",
  doca: "Doca",
};

export default function CompanyDetail() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: company, isLoading } = useGetCompany(id);
  const { data: users, isLoading: usersLoading } = useListCompanyUsers();
  const suspendCompany = useSuspendCompany();
  const activateCompany = useActivateCompany();

  function invalidate() {
    qc.invalidateQueries({ queryKey: getGetCompanyQueryKey(id) });
    qc.invalidateQueries({ queryKey: getListCompanyUsersQueryKey() });
  }

  function handleSuspend() {
    suspendCompany.mutate({ id }, {
      onSuccess: () => { toast({ title: "Empresa suspensa" }); invalidate(); },
      onError: () => toast({ variant: "destructive", title: "Erro" }),
    });
  }

  function handleActivate() {
    activateCompany.mutate({ id }, {
      onSuccess: () => { toast({ title: "Empresa ativada" }); invalidate(); },
      onError: () => toast({ variant: "destructive", title: "Erro" }),
    });
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <span className="h-8 w-8 rounded-full border-2 border-primary border-r-transparent animate-spin" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex justify-center py-24 text-muted-foreground">
        Empresa não encontrada.
      </div>
    );
  }

  return (
    <div className="flex-1 h-full p-6 md:p-8 overflow-y-auto bg-background">
      <div className="max-w-5xl mx-auto space-y-6">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} />
          Voltar para Empresas
        </button>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{company.name}</h1>
              <Badge className={`text-xs border ${statusColors[company.status] ?? ""}`}>
                {statusLabels[company.status] ?? company.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground font-mono mt-1">{company.slug}</p>
          </div>
          <div className="flex gap-2">
            {(company.status === "active" || company.status === "delinquent") && (
              <Button
                size="sm"
                variant="outline"
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                onClick={handleSuspend}
                disabled={suspendCompany.isPending}
              >
                Suspender
              </Button>
            )}
            {company.status === "suspended" && (
              <Button
                size="sm"
                variant="outline"
                className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                onClick={handleActivate}
                disabled={activateCompany.isPending}
              >
                Ativar
              </Button>
            )}
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Plano Mensal", value: `R$ ${company.planMonthlyPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
            { label: "Criada em", value: new Date(company.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) },
            { label: "ID Mercado Pago", value: company.mercadoPagoSubscriptionId ?? "—" },
            { label: "ID interno", value: `#${company.id}` },
          ].map((info) => (
            <div key={info.label} className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground uppercase font-mono tracking-wider">{info.label}</p>
              <p className="text-base font-semibold text-foreground mt-1 font-mono">{info.value}</p>
            </div>
          ))}
        </div>

        {/* Users table */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-3">Usuários da Empresa</h2>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            {usersLoading ? (
              <div className="flex justify-center py-10">
                <span className="h-6 w-6 rounded-full border-2 border-primary border-r-transparent animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground font-mono text-xs uppercase">Nome</TableHead>
                    <TableHead className="text-muted-foreground font-mono text-xs uppercase">Email</TableHead>
                    <TableHead className="text-muted-foreground font-mono text-xs uppercase">Função</TableHead>
                    <TableHead className="text-muted-foreground font-mono text-xs uppercase">Criado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((u) => (
                    <TableRow key={u.id} className="border-border">
                      <TableCell className="font-medium text-foreground">{u.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                          {roleLabels[u.role] ?? u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!users || users.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                        Nenhum usuário cadastrado nesta empresa.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
