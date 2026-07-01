import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  useGetArrival,
  getGetArrivalQueryKey,
  useGetVapidKey,
  getGetVapidKeyQueryKey,
  useUpdateLocation,
  useSubscribePush,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { registerServiceWorker, subscribePush, watchGeolocation } from "@/lib/pwa";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface StatusPageProps {
  arrivalId: number;
  onUnlink: () => void;
}

const STATUS_CONFIG = {
  waiting: {
    label: "Aguardando",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/30",
    dot: "bg-blue-400",
    description: "Seu cadastro foi registrado. Aguarde ser chamado.",
  },
  in_yard: {
    label: "No Pátio",
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/30",
    dot: "bg-green-400",
    description: "Você está no pátio. Aguarde ser chamado para a doca.",
  },
  called: {
    label: "Chamado!",
    color: "text-blue-300",
    bg: "bg-blue-500/20 border-blue-400/60",
    dot: "bg-blue-300 animate-pulse",
    description: "Dirija-se à doca indicada abaixo.",
  },
  possible_exit: {
    label: "Possível Saída",
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/30",
    dot: "bg-red-400",
    description: "Você foi detectado fora do pátio. Contate a portaria se ainda estiver nas dependências.",
  },
  finished: {
    label: "Finalizado",
    color: "text-muted-foreground",
    bg: "bg-gray-800 border-gray-700",
    dot: "bg-gray-400",
    description: "Sua visita foi concluída. Obrigado!",
  },
} as const;

export default function StatusPage({ arrivalId, onUnlink }: StatusPageProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const stopGeoRef = useRef<(() => void) | null>(null);
  const swRegRef = useRef<ServiceWorkerRegistration | null>(null);

  const { data: arrival, isLoading } = useGetArrival(arrivalId, {
    query: {
      queryKey: getGetArrivalQueryKey(arrivalId),
      refetchInterval: 8000,
      enabled: !!arrivalId,
    },
  });

  const { data: vapidKeyData } = useGetVapidKey({
    query: { queryKey: getGetVapidKeyQueryKey() },
  });

  const updateLocation = useUpdateLocation();
  const subscribePushMutation = useSubscribePush();

  useEffect(() => {
    // Register service worker
    registerServiceWorker().then((reg) => {
      if (reg) swRegRef.current = reg;
    });
  }, []);

  useEffect(() => {
    if (!arrivalId) return;

    // Start geolocation tracking
    stopGeoRef.current = watchGeolocation((lat, lng) => {
      updateLocation.mutate(
        { id: arrivalId, data: { lat, lng } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetArrivalQueryKey(arrivalId) });
          },
        }
      );
    }, 20000);

    return () => {
      stopGeoRef.current?.();
    };
  }, [arrivalId]);

  async function handleEnablePush() {
    if (!swRegRef.current || !vapidKeyData?.publicKey) {
      toast({
        title: "Notificações não disponíveis",
        description: "Certifique-se de que o app está instalado na tela inicial.",
        variant: "destructive",
      });
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast({
          title: "Permissão negada",
          description: "Habilite as notificações nas configurações do dispositivo.",
          variant: "destructive",
        });
        return;
      }

      const sub = await subscribePush(swRegRef.current, vapidKeyData.publicKey);
      const subJson = sub.toJSON();

      subscribePushMutation.mutate(
        {
          id: arrivalId,
          data: {
            endpoint: sub.endpoint,
            keys: {
              auth: subJson.keys?.auth ?? "",
              p256dh: subJson.keys?.p256dh ?? "",
            },
          },
        },
        {
          onSuccess: () => {
            toast({ title: "Notificações ativadas!", description: "Você será notificado quando chamado para a doca." });
            queryClient.invalidateQueries({ queryKey: getGetArrivalQueryKey(arrivalId) });
          },
          onError: () => {
            toast({ title: "Erro ao ativar notificações", variant: "destructive" });
          },
        }
      );
    } catch (err) {
      toast({ title: "Erro ao configurar notificações", variant: "destructive" });
    }
  }

  function handleUnlink() {
    stopGeoRef.current?.();
    localStorage.removeItem("yardflow_arrival_id");
    onUnlink();
    setLocation("/");
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Carregando...</div>
      </div>
    );
  }

  if (!arrival) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 gap-4">
        <p className="text-muted-foreground">Registro não encontrado.</p>
        <Button
          onClick={handleUnlink}
          variant="outline"
          className="border-border text-foreground"
        >
          Vincular novamente
        </Button>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[arrival.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.waiting;

  return (
    <div className="min-h-screen bg-background flex flex-col p-5 max-w-sm mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pt-2">
        <div>
          <h1 className="text-foreground font-bold text-lg">Yardflow</h1>
          <p className="text-muted-foreground text-xs">Sistema de Pátio</p>
        </div>
        <button
          data-testid="button-unlink"
          onClick={handleUnlink}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Desvincular
        </button>
      </div>

      {/* Status Card */}
      <div
        data-testid={`status-badge-${arrival.status}`}
        className={`border rounded-2xl p-5 mb-4 ${statusCfg.bg}`}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className={`w-2.5 h-2.5 rounded-full ${statusCfg.dot}`} />
          <span className={`font-semibold text-base ${statusCfg.color}`}>
            {statusCfg.label}
          </span>
        </div>
        <p className="text-foreground/80 text-sm leading-relaxed">{statusCfg.description}</p>
      </div>

      {/* Called to Dock */}
      {arrival.status === "called" && arrival.dockNumber && (
        <div
          data-testid="dock-number-display"
          className="bg-blue-600 rounded-2xl p-6 text-center mb-4"
        >
          <p className="text-white font-medium text-sm mb-1">Doca</p>
          <p className="text-white font-black text-5xl">{arrival.dockNumber}</p>
        </div>
      )}

      {/* Truck Info */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-4">
        <h3 className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-3">
          Seus dados
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground text-sm">Placa</span>
            <span
              data-testid="text-plate"
              className="text-foreground font-mono font-semibold text-sm"
            >
              {arrival.plate}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground text-sm">Motorista</span>
            <span data-testid="text-driver" className="text-foreground text-sm">
              {arrival.driverName}
            </span>
          </div>
          {arrival.invoiceNumber && (
            <div className="flex justify-between">
              <span className="text-muted-foreground text-sm">Nota Fiscal</span>
              <span data-testid="text-invoice" className="text-foreground text-sm">
                {arrival.invoiceNumber}
              </span>
            </div>
          )}
          {arrival.elapsedMinutes !== null && arrival.elapsedMinutes !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted-foreground text-sm">Tempo no pátio</span>
              <span data-testid="text-elapsed" className="text-foreground text-sm">
                {arrival.elapsedMinutes < 60
                  ? `${arrival.elapsedMinutes} min`
                  : `${Math.floor(arrival.elapsedMinutes / 60)}h ${arrival.elapsedMinutes % 60}min`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Location status */}
      {arrival.lastLocationAt && (
        <div className="bg-card border border-border rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-muted-foreground text-xs">Localização ativa</span>
        </div>
      )}

      {/* Push subscription */}
      {!arrival.hasPushSubscription && arrival.status !== "finished" && (
        <Button
          data-testid="button-enable-push"
          onClick={handleEnablePush}
          disabled={subscribePushMutation.isPending}
          className="bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 rounded-xl h-11 text-sm"
        >
          {subscribePushMutation.isPending
            ? "Ativando..."
            : "Ativar notificações"}
        </Button>
      )}

      {arrival.hasPushSubscription && (
        <div className="text-center text-green-400 text-xs mt-2">
          Notificações ativadas
        </div>
      )}

      {/* iOS hint */}
      <p className="text-gray-700 text-xs text-center mt-auto pt-6">
        iOS: instale na tela inicial para receber notificações push.
      </p>
    </div>
  );
}
