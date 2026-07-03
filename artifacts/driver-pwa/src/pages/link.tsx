import { useState } from "react";
import { useLocation } from "wouter";
import { Truck } from "lucide-react";
import { useLinkArrival } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { unlockAudio } from "@/lib/alarm";

interface LinkPageProps {
  onLinked: (token: string) => void;
}

export default function LinkPage({ onLinked }: LinkPageProps) {
  const { t } = useI18n();
  const [plate, setPlate] = useState("");
  const [invoice, setInvoice] = useState("");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const linkArrival = useLinkArrival();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    unlockAudio();
    if (!plate.trim() || !invoice.trim()) {
      toast({ title: t("missingFields"), variant: "destructive" });
      return;
    }
    linkArrival.mutate(
      { data: { plate: plate.toUpperCase(), invoiceNumber: invoice } },
      {
        onSuccess: (arrival) => {
          if (!arrival.publicToken) {
            toast({ title: t("notFoundTitle"), variant: "destructive" });
            return;
          }
          localStorage.setItem("yardflow_token", arrival.publicToken);
          onLinked(arrival.publicToken);
          setLocation("/status");
        },
        onError: () => {
          toast({
            title: t("notFoundTitle"),
            description: t("notFoundDescription"),
            variant: "destructive",
          });
        },
      }
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient background accent */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-status-called/10 blur-3xl" />

      <div className="w-full max-w-sm relative">
        <div className="w-full bg-card border border-card-border rounded-t-2xl px-6 pt-7 pb-6 shadow-lg flex flex-col items-center text-center">
          <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-[#2F5FCE]/20 border border-[#2F5FCE]/35 mb-3">
            <Truck size={26} className="text-[#8FB0F5]" />
          </div>
          <p className="notranslate font-bold text-2xl tracking-tight" translate="no">
            <span className="text-[#5B82D6]">Yard</span>
            <span className="text-[#8FB0F5]">Flow</span>
          </p>
          <p className="text-muted-foreground text-[10px] uppercase tracking-widest mt-1">
            {t("appSubtitle")}
          </p>
        </div>

        <div className="bg-card border border-card-border border-t-0 rounded-b-2xl p-6 shadow-lg mb-8">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/15 text-primary shrink-0">
              <Truck size={18} />
            </div>
            <h2 className="text-foreground font-semibold text-lg">{t("linkTitle")}</h2>
          </div>
          <p className="text-muted-foreground text-sm mb-5 leading-relaxed">
            {t("linkSubtitle")}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="plate" className="text-foreground text-sm">
                {t("plateLabel")} <span className="text-status-alert">*</span>
              </Label>
              <Input
                id="plate"
                data-testid="input-plate"
                className="mt-1.5 bg-background border-border text-foreground placeholder:text-muted-foreground uppercase h-12 text-base font-mono tracking-wider"
                placeholder={t("platePlaceholder")}
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                maxLength={10}
                required
              />
            </div>

            <div>
              <Label htmlFor="invoice" className="text-foreground text-sm">
                {t("invoiceLabel")} <span className="text-status-alert">*</span>
              </Label>
              <Input
                id="invoice"
                data-testid="input-invoice"
                className="mt-1.5 bg-background border-border text-foreground placeholder:text-muted-foreground h-12 text-base"
                placeholder={t("invoicePlaceholder")}
                value={invoice}
                onChange={(e) => setInvoice(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              data-testid="button-link"
              disabled={linkArrival.isPending}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-12 text-base rounded-xl mt-2"
            >
              {linkArrival.isPending ? t("linkButtonLoading") : t("linkButton")}
            </Button>
          </form>
        </div>

        <p className="text-center text-muted-foreground/70 text-xs mt-6">
          {t("installHint")}
        </p>
      </div>
    </div>
  );
}
