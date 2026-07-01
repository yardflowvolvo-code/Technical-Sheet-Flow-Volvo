import { useState } from "react";
import { useLocation } from "wouter";
import { useLinkArrival } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface LinkPageProps {
  onLinked: (arrivalId: number) => void;
}

export default function LinkPage({ onLinked }: LinkPageProps) {
  const [plate, setPlate] = useState("");
  const [invoice, setInvoice] = useState("");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const linkArrival = useLinkArrival();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!plate && !invoice) {
      toast({ title: "Informe a placa ou número da nota", variant: "destructive" });
      return;
    }
    linkArrival.mutate(
      { data: { plate: plate.toUpperCase() || undefined, invoiceNumber: invoice || undefined } },
      {
        onSuccess: (arrival) => {
          localStorage.setItem("yardflow_arrival_id", String(arrival.id));
          onLinked(arrival.id);
          setLocation("/status");
        },
        onError: () => {
          toast({
            title: "Cadastro não encontrado",
            description: "Verifique a placa ou número da nota e tente novamente.",
            variant: "destructive",
          });
        },
      }
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-block bg-white rounded-2xl px-5 py-3 shadow-lg mb-4">
            <img
              src={`${import.meta.env.BASE_URL}yardflow-logo.png`}
              alt="YardFlow"
              className="h-14 w-auto object-contain"
            />
          </div>
          <p className="text-blue-400 mt-2 text-sm font-medium">Sistema de Pátio</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-foreground font-semibold text-lg mb-1">Vincular chegada</h2>
          <p className="text-muted-foreground text-sm mb-5">
            Informe a placa do caminhão ou o número da nota fiscal para se vincular ao registro.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="plate" className="text-foreground text-sm">
                Placa do caminhão
              </Label>
              <Input
                id="plate"
                data-testid="input-plate"
                className="mt-1.5 bg-background border-border text-foreground placeholder:text-muted-foreground uppercase"
                placeholder="ABC-1234"
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                maxLength={10}
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-muted-foreground text-xs">ou</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div>
              <Label htmlFor="invoice" className="text-foreground text-sm">
                Número da nota fiscal
              </Label>
              <Input
                id="invoice"
                data-testid="input-invoice"
                className="mt-1.5 bg-background border-border text-foreground placeholder:text-muted-foreground"
                placeholder="NF-000123"
                value={invoice}
                onChange={(e) => setInvoice(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              data-testid="button-link"
              disabled={linkArrival.isPending}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold h-11 rounded-xl mt-2"
            >
              {linkArrival.isPending ? "Buscando..." : "Vincular"}
            </Button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          Para notificações push, instale este app na tela inicial.
        </p>
      </div>
    </div>
  );
}
