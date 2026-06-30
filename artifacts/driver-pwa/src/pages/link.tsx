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
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 mb-4">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-amber-400 fill-current">
              <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Yardflow</h1>
          <p className="text-gray-400 mt-1 text-sm">Sistema de Pátio</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-white font-semibold text-lg mb-1">Vincular chegada</h2>
          <p className="text-gray-400 text-sm mb-5">
            Informe a placa do caminhão ou o número da nota fiscal para se vincular ao registro.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="plate" className="text-gray-300 text-sm">
                Placa do caminhão
              </Label>
              <Input
                id="plate"
                data-testid="input-plate"
                className="mt-1.5 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 uppercase"
                placeholder="ABC-1234"
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                maxLength={10}
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-800" />
              <span className="text-gray-600 text-xs">ou</span>
              <div className="flex-1 h-px bg-gray-800" />
            </div>

            <div>
              <Label htmlFor="invoice" className="text-gray-300 text-sm">
                Número da nota fiscal
              </Label>
              <Input
                id="invoice"
                data-testid="input-invoice"
                className="mt-1.5 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                placeholder="NF-000123"
                value={invoice}
                onChange={(e) => setInvoice(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              data-testid="button-link"
              disabled={linkArrival.isPending}
              className="w-full bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold h-11 rounded-xl mt-2"
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
