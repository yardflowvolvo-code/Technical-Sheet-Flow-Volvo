import { useEffect, useRef, useState } from "react";
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
import {
  Clock,
  MapPin,
  PhoneCall,
  AlertTriangle,
  CheckCircle2,
  Bell,
  BellOff,
  Navigation,
  Truck,
} from "lucide-react";
import { registerServiceWorker, subscribePush, watchGeolocation } from "@/lib/pwa";
import { startAlarm, stopAlarm, unlockAudio } from "@/lib/alarm";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useI18n, type TranslationKey } from "@/lib/i18n";

interface StatusPageProps {
  arrivalId: number;
  onUnlink: () => void;
}

const STATUS_META = {
  waiting: {
    labelKey: "statusWaitingLabel" as TranslationKey,
    descKey: "statusWaitingDesc" as TranslationKey,
    icon: Clock,
    pulse: false,
    text: "text-status-waiting",
    heroBg: "bg-status-waiting/10",
    heroBorder: "border-status-waiting/30",
    iconBg: "bg-status-waiting/20",
    pulseBg: "bg-status-waiting/40",
    solidBg: "bg-status-waiting",
  },
  in_yard: {
    labelKey: "statusInYardLabel" as TranslationKey,
    descKey: "statusInYardDesc" as TranslationKey,
    icon: MapPin,
    pulse: false,
    text: "text-status-in-yard",
    heroBg: "bg-status-in-yard/10",
    heroBorder: "border-status-in-yard/30",
    iconBg: "bg-status-in-yard/20",
    pulseBg: "bg-status-in-yard/40",
    solidBg: "bg-status-in-yard",
  },
  called: {
    labelKey: "statusCalledLabel" as TranslationKey,
    descKey: "statusCalledDesc" as TranslationKey,
    icon: PhoneCall,
    pulse: true,
    text: "text-status-called",
    heroBg: "bg-status-called/15",
    heroBorder: "border-status-called/50",
    iconBg: "bg-status-called/25",
    pulseBg: "bg-status-called/40",
    solidBg: "bg-status-called",
  },
  possible_exit: {
    labelKey: "statusAlertLabel" as TranslationKey,
    descKey: "statusAlertDesc" as TranslationKey,
    icon: AlertTriangle,
    pulse: false,
    text: "text-status-alert",
    heroBg: "bg-status-alert/10",
    heroBorder: "border-status-alert/30",
    iconBg: "bg-status-alert/20",
    pulseBg: "bg-status-alert/40",
    solidBg: "bg-status-alert",
  },
  finished: {
    labelKey: "statusFinishedLabel" as TranslationKey,
    descKey: "statusFinishedDesc" as TranslationKey,
    icon: CheckCircle2,
    pulse: false,
    text: "text-status-finished",
    heroBg: "bg-status-finished/10",
    heroBorder: "border-status-finished/30",
    iconBg: "bg-status-finished/20",
    pulseBg: "bg-status-finished/40",
    solidBg: "bg-status-finished",
  },
} as const;

export default function StatusPage({ arrivalId, onUnlink }: StatusPageProps) {
  const { t } = useI18n();
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

  // Tracks which specific "called" event the driver has already acknowledged
  // (silenced), keyed by calledAt — so a NEW call always rings again, but
  // re-fetching the same call every 8s doesn't restart the alarm the driver
  // already stopped.
  const [acknowledgedCallKey, setAcknowledgedCallKey] = useState<string | null>(null);

  const isAlerting =
    arrival?.status === "called" && arrival.calledAt !== acknowledgedCallKey;

  function handleAcknowledge() {
    stopAlarm();
    if (arrival?.calledAt) setAcknowledgedCallKey(arrival.calledAt);
  }

  useEffect(() => {
    if (isAlerting) {
      startAlarm();
    } else {
      stopAlarm();
    }
    return () => stopAlarm();
  }, [isAlerting]);

  // If the driver taps the OS push notification while the app is open in
  // another tab/background, the service worker tells us to stop ringing.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.data?.type === "yardflow:ack") {
        handleAcknowledge();
      }
    }
    navigator.serviceWorker?.addEventListener("message", onMessage);
    return () => navigator.serviceWorker?.removeEventListener("message", onMessage);
  }, [arrival?.calledAt]);

  useEffect(() => {
    registerServiceWorker().then((reg) => {
      if (reg) swRegRef.current = reg;
    });
  }, []);

  useEffect(() => {
    if (!arrivalId) return;

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
    unlockAudio();
    if (!swRegRef.current || !vapidKeyData?.publicKey) {
      toast({
        title: t("notificationsUnavailableTitle"),
        description: t("notificationsUnavailableDesc"),
        variant: "destructive",
      });
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast({
          title: t("permissionDeniedTitle"),
          description: t("permissionDeniedDesc"),
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
            toast({ title: t("notificationsEnabledTitle"), description: t("notificationsEnabledDesc") });
            queryClient.invalidateQueries({ queryKey: getGetArrivalQueryKey(arrivalId) });
          },
          onError: () => {
            toast({ title: t("notificationsErrorTitle"), variant: "destructive" });
          },
        }
      );
    } catch (err) {
      toast({ title: t("notificationsConfigErrorTitle"), variant: "destructive" });
    }
  }

  function handleUnlink() {
    stopAlarm();
    stopGeoRef.current?.();
    localStorage.removeItem("yardflow_arrival_id");
    onUnlink();
    setLocation("/");
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="h-8 w-8 rounded-full border-2 border-primary border-r-transparent animate-spin" />
      </div>
    );
  }

  if (!arrival) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 gap-4">
        <p className="text-muted-foreground">{t("notFound")}</p>
        <Button onClick={handleUnlink} variant="outline" className="border-border text-foreground">
          {t("linkAgain")}
        </Button>
      </div>
    );
  }

  const meta = STATUS_META[arrival.status as keyof typeof STATUS_META] ?? STATUS_META.waiting;
  const StatusIcon = meta.icon;

  return (
    <div className="min-h-screen bg-background flex flex-col p-5 max-w-sm mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 pt-1">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-[#0051EC] shrink-0">
            <Truck size={18} className="text-white" />
          </div>
          <p className="font-bold text-lg tracking-tight leading-none notranslate" translate="no">
            <span className="text-foreground">Yard</span>
            <span className="text-[#5B9BFF]">Flow</span>
          </p>
        </div>
        <button
          data-testid="button-unlink"
          onClick={handleUnlink}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
        >
          {t("unlink")}
        </button>
      </div>

      {/* Status Hero */}
      <div
        data-testid={`status-badge-${arrival.status}`}
        className={`rounded-2xl p-5 mb-4 border shadow-lg ${meta.heroBg} ${meta.heroBorder}`}
      >
        <div className="flex items-center gap-3 mb-2.5">
          <div className={`relative flex items-center justify-center h-10 w-10 rounded-full shrink-0 ${meta.iconBg}`}>
            {meta.pulse && (
              <span className={`absolute inset-0 rounded-full animate-ping ${meta.pulseBg}`} />
            )}
            <StatusIcon size={19} className={`relative ${meta.text}`} />
          </div>
          <span className={`font-bold text-lg ${meta.text}`}>
            {t(meta.labelKey)}
          </span>
        </div>
        <p className="text-foreground/85 text-sm leading-relaxed">{t(meta.descKey)}</p>
      </div>

      {/* Called to Dock — the signature moment of this app */}
      {arrival.status === "called" && arrival.dockNumber && (
        <button
          type="button"
          data-testid="dock-number-display"
          onClick={handleAcknowledge}
          className={`relative w-full rounded-2xl p-6 text-center mb-4 overflow-hidden shadow-xl ${meta.solidBg} ${
            isAlerting ? "animate-pulse" : ""
          }`}
        >
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,white,transparent_60%)]" />
          <Navigation size={20} className="relative mx-auto mb-1 text-primary-foreground/90" />
          <p className="relative text-primary-foreground/90 font-semibold text-sm mb-1 uppercase tracking-widest">
            {t("dockLabel")}
          </p>
          <p className="relative text-primary-foreground font-black text-6xl leading-none tabular-nums">
            {arrival.dockNumber}
          </p>
          {isAlerting && (
            <p className="relative text-primary-foreground/90 text-xs font-semibold mt-3 flex items-center justify-center gap-1.5">
              <BellOff size={13} />
              {t("tapToSilence")}
            </p>
          )}
        </button>
      )}

      {/* Truck Info */}
      <div className="bg-card border border-card-border rounded-2xl p-5 mb-4 shadow-sm">
        <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-3">
          {t("yourData")}
        </h3>
        <div className="space-y-2.5">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm">{t("plate")}</span>
            <span
              data-testid="text-plate"
              className="text-foreground font-mono font-bold text-sm bg-secondary px-2 py-0.5 rounded"
            >
              {arrival.plate}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm">{t("driver")}</span>
            <span data-testid="text-driver" className="text-foreground text-sm font-medium">
              {arrival.driverName}
            </span>
          </div>
          {arrival.invoiceNumber && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">{t("invoice")}</span>
              <span data-testid="text-invoice" className="text-foreground text-sm font-medium">
                {arrival.invoiceNumber}
              </span>
            </div>
          )}
          {arrival.elapsedMinutes !== null && arrival.elapsedMinutes !== undefined && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">{t("timeInYard")}</span>
              <span data-testid="text-elapsed" className="text-foreground text-sm font-medium tabular-nums">
                {arrival.elapsedMinutes < 60
                  ? `${arrival.elapsedMinutes} ${t("minutesShort")}`
                  : `${Math.floor(arrival.elapsedMinutes / 60)}${t("hoursShort")} ${arrival.elapsedMinutes % 60}${t("minutesShort")}`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Location status */}
      {arrival.lastLocationAt && (
        <div className="bg-card border border-card-border rounded-xl px-4 py-3 mb-4 flex items-center gap-2.5 shadow-sm">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-status-in-yard opacity-60 animate-ping" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-status-in-yard" />
          </span>
          <span className="text-muted-foreground text-xs font-medium">{t("locationActive")}</span>
        </div>
      )}

      {/* Push subscription */}
      {!arrival.hasPushSubscription && arrival.status !== "finished" && (
        <Button
          data-testid="button-enable-push"
          onClick={handleEnablePush}
          disabled={subscribePushMutation.isPending}
          variant="outline"
          className="border-border text-foreground hover:bg-secondary rounded-xl h-12 text-sm gap-2"
        >
          <Bell size={16} />
          {subscribePushMutation.isPending ? t("enablingNotifications") : t("enableNotifications")}
        </Button>
      )}

      {arrival.hasPushSubscription && (
        <div className="flex items-center justify-center gap-1.5 text-status-in-yard text-xs mt-1 font-medium">
          <Bell size={12} />
          {t("notificationsActive")}
        </div>
      )}

      {/* iOS hint */}
      <p className="text-muted-foreground/60 text-xs text-center mt-auto pt-6">
        {t("iosHint")}
      </p>
    </div>
  );
}
