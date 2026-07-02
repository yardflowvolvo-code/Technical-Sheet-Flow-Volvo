import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNowStrict, isToday, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Truck, 
  MapPin, 
  AlertTriangle, 
  LogOut, 
  PhoneCall, 
  Clock, 
  CheckCircle2, 
  Radio
} from "lucide-react";

import { 
  useListArrivals, 
  useGetStats, 
  useCallDock, 
  useCheckoutArrival, 
  useUpdateArrival,
  getListArrivalsQueryKey,
  getGetStatsQueryKey
} from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Arrival } from "@workspace/api-client-react";

export default function Doca() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats, isLoading: loadingStats } = useGetStats({
    query: { refetchInterval: 10000, queryKey: getGetStatsQueryKey() }
  });

  const { data: arrivals = [], isLoading: loadingArrivals } = useListArrivals(
    { active: true },
    { query: { refetchInterval: 10000, queryKey: getListArrivalsQueryKey({ active: true }) } }
  );

  const { data: finishedArrivals = [], isLoading: loadingFinished } = useListArrivals(
    { active: false },
    { query: { refetchInterval: 30000, queryKey: getListArrivalsQueryKey({ active: false }) } }
  );

  const finishedToday = finishedArrivals
    .filter((a) => a.finishedAt && isToday(new Date(a.finishedAt)))
    .sort((a, b) => new Date(b.finishedAt!).getTime() - new Date(a.finishedAt!).getTime());

  const callDock = useCallDock();
  const checkoutArrival = useCheckoutArrival();
  const updateArrival = useUpdateArrival();

  const [selectedDock, setSelectedDock] = useState<string>("");
  const [callingId, setCallingId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleCallDock = (id: number) => {
    if (!selectedDock || isNaN(Number(selectedDock))) {
      toast({ variant: "destructive", title: "Erro", description: "Informe um número de doca válido." });
      return;
    }

    callDock.mutate(
      { id, data: { dockNumber: Number(selectedDock) } },
      {
        onSuccess: () => {
          toast({ title: "Motorista chamado", description: `Veículo chamado para a doca ${selectedDock}.` });
          setIsDialogOpen(false);
          setSelectedDock("");
          setCallingId(null);
          queryClient.invalidateQueries({ queryKey: getListArrivalsQueryKey({ active: true }) });
          queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Erro", description: "Falha ao chamar motorista." });
        }
      }
    );
  };

  const handleCheckout = (id: number, plate: string) => {
    checkoutArrival.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Saída confirmada", description: `Veículo ${plate} liberado.` });
          queryClient.invalidateQueries({ queryKey: getListArrivalsQueryKey({ active: true }) });
          queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
        }
      }
    );
  };

  const handleDismissExit = (id: number, plate: string) => {
    updateArrival.mutate(
      { id, data: { status: "in_yard" } },
      {
        onSuccess: () => {
          toast({ title: "Alerta ignorado", description: `Veículo ${plate} retornado ao pátio.` });
          queryClient.invalidateQueries({ queryKey: getListArrivalsQueryKey({ active: true }) });
        }
      }
    );
  };

  const getStatusBadge = (status: Arrival["status"]) => {
    switch (status) {
      case "waiting":
        return <Badge className="status-waiting pointer-events-none">Aguardando</Badge>;
      case "in_yard":
        return <Badge className="status-in_yard pointer-events-none">No Pátio</Badge>;
      case "called":
        return <Badge className="status-called pointer-events-none">Chamado</Badge>;
      case "possible_exit":
        return <Badge className="status-possible_exit pointer-events-none flex gap-1"><AlertTriangle size={12}/> Saída Irregular</Badge>;
      default:
        return <Badge className="status-finished pointer-events-none">Finalizado</Badge>;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      {/* Stats Bar */}
      <div className="border-b border-border bg-card p-4 sm:p-6 shrink-0">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestão de Pátio</h1>
            <p className="text-sm text-muted-foreground">Monitoramento em tempo real da operação.</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-primary">
            <Radio className="w-4 h-4 animate-pulse" />
            AO VIVO
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-secondary/50 border-border">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <p className="text-sm text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Total no Pátio</p>
              <p className="text-3xl font-mono text-foreground">{loadingStats ? "-" : stats?.totalInYard ?? 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-secondary/50 border-border">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <p className="text-sm text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Aguardando</p>
              <p className="text-3xl font-mono text-amber-500">{loadingStats ? "-" : stats?.totalWaiting ?? 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-secondary/50 border-border">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <p className="text-sm text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Em Operação</p>
              <p className="text-3xl font-mono text-primary">{loadingStats ? "-" : stats?.totalCalled ?? 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-secondary/50 border-border">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <p className="text-sm text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Tempo Médio</p>
              <p className="text-3xl font-mono text-foreground">
                {loadingStats ? "-" : stats?.avgWaitMinutes ? `${Math.round(stats.avgWaitMinutes)}m` : "0m"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Active Arrivals List + Finished Today */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="p-4 sm:p-6 flex flex-col gap-4">
            <h2 className="text-lg font-bold flex items-center gap-2 uppercase tracking-wide text-muted-foreground">
              <Truck size={18} />
              Veículos Ativos ({arrivals.length})
            </h2>

            {loadingArrivals ? (
            <div className="flex justify-center py-12">
              <span className="h-8 w-8 rounded-full border-2 border-primary border-r-transparent animate-spin" />
            </div>
          ) : arrivals.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-lg">
              Nenhum veículo ativo no momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pb-8">
              {arrivals.map((arrival) => (
                <Card 
                  key={arrival.id} 
                  className={`border-border bg-card overflow-hidden transition-all duration-300 ${
                    arrival.status === 'possible_exit' ? 'ring-1 ring-destructive' : 
                    arrival.status === 'called' ? 'ring-1 ring-primary' : ''
                  }`}
                >
                  <CardContent className="p-0 flex flex-col sm:flex-row">
                    {/* Status Strip */}
                    <div className={`w-1.5 shrink-0 ${
                      arrival.status === 'waiting' ? 'bg-amber-500' :
                      arrival.status === 'in_yard' ? 'bg-green-500' :
                      arrival.status === 'called' ? 'bg-primary' :
                      arrival.status === 'possible_exit' ? 'bg-destructive' : 'bg-muted'
                    }`} />
                    
                    <div className="p-4 flex-1 flex flex-col gap-4 justify-between">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-lg font-bold font-mono bg-secondary px-2 py-0.5 rounded border border-border">
                              {arrival.plate}
                            </span>
                            {getStatusBadge(arrival.status)}
                          </div>
                          <p className="text-sm font-medium text-foreground">{arrival.driverName}</p>
                          {arrival.invoiceNumber && (
                            <p className="text-xs text-muted-foreground mt-0.5">NF: {arrival.invoiceNumber}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Entrada: {format(new Date(arrival.createdAt), "HH:mm", { locale: ptBR })}
                          </p>
                        </div>

                        <div className="text-right flex flex-col items-end">
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Tempo de Espera</p>
                          <div className="flex items-center gap-1 text-sm font-mono bg-background border border-border px-2 py-1 rounded">
                            <Clock size={14} className={arrival.elapsedMinutes && arrival.elapsedMinutes > 120 ? 'text-destructive' : 'text-muted-foreground'} />
                            <span className={arrival.elapsedMinutes && arrival.elapsedMinutes > 120 ? 'text-destructive font-bold' : ''}>
                              {arrival.elapsedMinutes ? `${arrival.elapsedMinutes} min` : '0 min'}
                            </span>
                          </div>
                          {arrival.dockNumber && (
                            <p className="text-xs font-bold text-primary mt-2">DOCA {arrival.dockNumber}</p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                        {arrival.status === "possible_exit" ? (
                          <>
                            <div className="w-full text-xs text-destructive flex items-center gap-1 mb-2 bg-destructive/10 p-2 rounded border border-destructive/20">
                              <AlertTriangle size={14} />
                              Veículo saiu da cerca virtual. Confirmar saída?
                            </div>
                            <Button size="sm" variant="destructive" onClick={() => handleCheckout(arrival.id, arrival.plate)} disabled={checkoutArrival.isPending}>
                              <LogOut size={14} className="mr-1" />
                              Confirmar Saída
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDismissExit(arrival.id, arrival.plate)} disabled={updateArrival.isPending}>
                              Ignorar Alerta
                            </Button>
                          </>
                        ) : (
                          <>
                            {(arrival.status === "waiting" || arrival.status === "in_yard") && (
                              <Dialog open={isDialogOpen && callingId === arrival.id} onOpenChange={(open) => {
                                setIsDialogOpen(open);
                                if (open) {
                                  setCallingId(arrival.id);
                                  setSelectedDock("");
                                } else {
                                  setCallingId(null);
                                }
                              }}>
                                <DialogTrigger asChild>
                                  <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                                    <PhoneCall size={14} className="mr-1.5" />
                                    Chamar p/ Doca
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md border-border bg-card">
                                  <DialogHeader>
                                    <DialogTitle>Chamar Veículo</DialogTitle>
                                    <DialogDescription>
                                      O motorista do veículo <strong className="font-mono text-foreground">{arrival.plate}</strong> receberá uma notificação para se dirigir à doca informada.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="py-4">
                                    <Label htmlFor="dockNumber" className="mb-2 block text-sm">Número da Doca</Label>
                                    <Input 
                                      id="dockNumber" 
                                      type="number" 
                                      placeholder="Ex: 4" 
                                      value={selectedDock}
                                      onChange={(e) => setSelectedDock(e.target.value)}
                                      autoFocus
                                      className="font-mono text-lg h-12"
                                    />
                                  </div>
                                  <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                                    <Button onClick={() => handleCallDock(arrival.id)} disabled={callDock.isPending || !selectedDock}>
                                      {callDock.isPending ? "Chamando..." : "Confirmar Chamado"}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            )}

                            <Button size="sm" variant="outline" onClick={() => handleCheckout(arrival.id, arrival.plate)} disabled={checkoutArrival.isPending}>
                              <LogOut size={14} className="mr-1.5" />
                              Checkout Manual
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            )}

            {/* Finished Today */}
            <h2 className="text-lg font-bold flex items-center gap-2 uppercase tracking-wide text-muted-foreground mt-4">
              <CheckCircle2 size={18} />
              Finalizados Hoje ({finishedToday.length})
            </h2>

            {loadingFinished ? (
              <div className="flex justify-center py-8">
                <span className="h-6 w-6 rounded-full border-2 border-primary border-r-transparent animate-spin" />
              </div>
            ) : finishedToday.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed border-border rounded-lg">
                Nenhum veículo finalizado hoje ainda.
              </div>
            ) : (
              <Card className="border-border bg-card overflow-hidden">
                <div className="overflow-x-auto touch-pan-x">
                  <table className="w-full min-w-[700px] text-sm">
                    <thead className="bg-secondary/50">
                      <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-2.5 font-semibold">Placa</th>
                        <th className="px-4 py-2.5 font-semibold">Motorista</th>
                        <th className="px-4 py-2.5 font-semibold">NF</th>
                        <th className="px-4 py-2.5 font-semibold">Entrada</th>
                        <th className="px-4 py-2.5 font-semibold">Saída</th>
                        <th className="px-4 py-2.5 font-semibold">Tempo no Pátio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {finishedToday.map((a) => {
                        const durationMinutes =
                          a.inYardAt && a.finishedAt
                            ? differenceInMinutes(new Date(a.finishedAt), new Date(a.inYardAt))
                            : null;
                        return (
                          <tr key={a.id} className="border-t border-border">
                            <td className="px-4 py-2.5 font-mono font-bold">{a.plate}</td>
                            <td className="px-4 py-2.5">{a.driverName}</td>
                            <td className="px-4 py-2.5 font-mono text-muted-foreground">
                              {a.invoiceNumber || "-"}
                            </td>
                            <td className="px-4 py-2.5 font-mono">
                              {format(new Date(a.createdAt), "HH:mm", { locale: ptBR })}
                            </td>
                            <td className="px-4 py-2.5 font-mono">
                              {a.finishedAt ? format(new Date(a.finishedAt), "HH:mm", { locale: ptBR }) : "-"}
                            </td>
                            <td className="px-4 py-2.5 font-mono">
                              {durationMinutes !== null ? `${durationMinutes} min` : "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
