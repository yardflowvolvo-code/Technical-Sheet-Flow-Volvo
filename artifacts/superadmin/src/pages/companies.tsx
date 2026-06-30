import { useState } from "react";
import { useLocation } from "wouter";
import { useListCompanies, useCreateCompany, useSuspendCompany, useActivateCompany, getListCompaniesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

export default function Companies() {
  const [, setLocation] = useLocation();
  const { data: companies, isLoading } = useListCompanies();
  const createCompany = useCreateCompany();
  const suspendCompany = useSuspendCompany();
  const activateCompany = useActivateCompany();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", planMonthlyPrice: "299" });

  function invalidate() {
    qc.invalidateQueries({ queryKey: getListCompaniesQueryKey() });
  }

  function handleCreate() {
    createCompany.mutate(
      { data: { name: form.name, slug: form.slug, planMonthlyPrice: Number(form.planMonthlyPrice) } },
      {
        onSuccess: () => {
          toast({ title: "Empresa criada com sucesso" });
          setShowCreate(false);
          setForm({ name: "", slug: "", planMonthlyPrice: "299" });
          invalidate();
        },
        onError: () => toast({ variant: "destructive", title: "Erro ao criar empresa" }),
      }
    );
  }

  function handleSuspend(id: number) {
    suspendCompany.mutate(
      { id },
      {
        onSuccess: () => { toast({ title: "Empresa suspensa" }); invalidate(); },
        onError: () => toast({ variant: "destructive", title: "Erro ao suspender" }),
      }
    );
  }

  function handleActivate(id: number) {
    activateCompany.mutate(
      { id },
      {
        onSuccess: () => { toast({ title: "Empresa ativada" }); invalidate(); },
        onError: () => toast({ variant: "destructive", title: "Erro ao ativar" }),
      }
    );
  }

  const total = companies?.length ?? 0;
  const active = companies?.filter((c) => c.status === "active").length ?? 0;
  const mrr = companies?.filter((c) => c.status === "active").reduce((s, c) => s + c.planMonthlyPrice, 0) ?? 0;

  return (
    <div className="flex-1 h-full p-6 md:p-8 overflow-y-auto bg-background">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Empresas</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Gerenciamento de clientes SaaS</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
            + Nova Empresa
          </Button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total de Empresas", value: total },
            { label: "Empresas Ativas", value: active },
            { label: "MRR Estimado", value: `R$ ${mrr.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground uppercase font-mono tracking-wider">{kpi.label}</p>
              <p className="text-2xl font-bold text-foreground mt-1">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <span className="h-7 w-7 rounded-full border-2 border-primary border-r-transparent animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-mono text-xs uppercase">Empresa</TableHead>
                  <TableHead className="text-muted-foreground font-mono text-xs uppercase">Slug</TableHead>
                  <TableHead className="text-muted-foreground font-mono text-xs uppercase">Status</TableHead>
                  <TableHead className="text-muted-foreground font-mono text-xs uppercase">Plano/mês</TableHead>
                  <TableHead className="text-muted-foreground font-mono text-xs uppercase">Criada em</TableHead>
                  <TableHead className="text-muted-foreground font-mono text-xs uppercase text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies?.map((c) => (
                  <TableRow key={c.id} className="border-border hover:bg-secondary/30 cursor-pointer" onClick={() => setLocation(`/companies/${c.id}`)}>
                    <TableCell className="font-medium text-foreground">{c.name}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{c.slug}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Badge className={`text-xs border ${statusColors[c.status] ?? ""}`}>
                        {statusLabels[c.status] ?? c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-foreground">
                      R$ {c.planMonthlyPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(c.createdAt).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      {c.status === "active" || c.status === "delinquent" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 border-red-500/30 text-red-400 hover:bg-red-500/10"
                          onClick={() => handleSuspend(c.id)}
                        >
                          Suspender
                        </Button>
                      ) : c.status === "suspended" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 border-green-500/30 text-green-400 hover:bg-green-500/10"
                          onClick={() => handleActivate(c.id)}
                        >
                          Ativar
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
                {companies?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                      Nenhuma empresa cadastrada ainda.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Nova Empresa</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Cadastre um novo cliente no Yardflow.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-sm text-muted-foreground">Nome da empresa</Label>
              <Input
                className="mt-1 bg-background border-border text-foreground"
                placeholder="Ex: Transportes XYZ"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Slug (URL único)</Label>
              <Input
                className="mt-1 bg-background border-border text-foreground font-mono"
                placeholder="Ex: transportes-xyz"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))}
              />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Preço mensal (R$)</Label>
              <Input
                type="number"
                className="mt-1 bg-background border-border text-foreground"
                value={form.planMonthlyPrice}
                onChange={(e) => setForm((f) => ({ ...f, planMonthlyPrice: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" className="border-border" onClick={() => setShowCreate(false)}>
                Cancelar
              </Button>
              <Button
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={!form.name || !form.slug || createCompany.isPending}
                onClick={handleCreate}
              >
                {createCompany.isPending ? "Criando..." : "Criar Empresa"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
