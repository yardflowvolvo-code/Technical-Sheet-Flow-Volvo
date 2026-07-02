import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Truck, Plus, Clock, FileText, User } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { 
  useCreateArrival, 
  useListArrivals, 
  getListArrivalsQueryKey 
} from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

const arrivalSchema = z.object({
  plate: z.string().min(7, "Placa deve ter no mínimo 7 caracteres").max(8, "Placa muito longa"),
  driverName: z.string().min(3, "Nome do motorista é obrigatório"),
  invoiceNumber: z.string().min(1, "Número da nota fiscal é obrigatório"),
});

type ArrivalFormValues = z.infer<typeof arrivalSchema>;

export default function Portaria() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const driverUrl = `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}/driver`;

  const { data: recentArrivals = [], isLoading: loadingArrivals } = useListArrivals(
    { status: "waiting" },
    { query: { refetchInterval: 10000, queryKey: getListArrivalsQueryKey({ status: "waiting" }) } }
  );

  const createArrival = useCreateArrival();

  const form = useForm<ArrivalFormValues>({
    resolver: zodResolver(arrivalSchema),
    defaultValues: {
      plate: "",
      driverName: "",
      invoiceNumber: "",
    },
  });

  const onSubmit = (data: ArrivalFormValues) => {
    createArrival.mutate(
      { data },
      {
        onSuccess: () => {
          toast({
            title: "Entrada registrada",
            description: `Veículo ${data.plate} registrado com sucesso.`,
          });
          form.reset();
          queryClient.invalidateQueries({ queryKey: getListArrivalsQueryKey({ status: "waiting" }) });
          queryClient.invalidateQueries({ queryKey: getListArrivalsQueryKey() });
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Erro ao registrar",
            description: "Não foi possível registrar a entrada. Tente novamente.",
          });
        },
      }
    );
  };

  return (
    <div className="flex-1 h-full p-6 md:p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Portaria</h1>
            <p className="text-muted-foreground mt-1">Registro de novas chegadas e link para motoristas.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Column */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  Registrar Chegada
                </CardTitle>
                <CardDescription>
                  Insira os dados do veículo e do motorista para iniciar o rastreamento.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="plate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Placa do Veículo</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="ABC-1234 ou ABC1D23" 
                                className="uppercase font-mono" 
                                {...field} 
                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="driverName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome do Motorista</FormLabel>
                            <FormControl>
                              <Input placeholder="Nome completo" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="invoiceNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nota Fiscal</FormLabel>
                          <FormControl>
                            <Input placeholder="Número da NF ou pedido" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="pt-2">
                      <Button 
                        type="submit" 
                        className="w-full sm:w-auto" 
                        disabled={createArrival.isPending}
                      >
                        {createArrival.isPending ? (
                          <span className="flex items-center gap-2">
                            <span className="h-4 w-4 rounded-full border-2 border-primary-foreground border-r-transparent animate-spin" />
                            Registrando...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Registrar Veículo
                          </span>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  Últimos Registros (Aguardando Pátio)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[250px] pr-4">
                  {loadingArrivals ? (
                    <div className="flex justify-center items-center h-32">
                      <span className="h-6 w-6 rounded-full border-2 border-primary border-r-transparent animate-spin" />
                    </div>
                  ) : recentArrivals.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum veículo aguardando no momento.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentArrivals.map((arrival) => (
                        <div key={arrival.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 rounded-md bg-secondary/50 border border-border">
                          <div className="flex items-center gap-3 mb-2 sm:mb-0">
                            <div className="bg-background border border-border rounded px-2 py-1 font-mono text-sm font-bold">
                              {arrival.plate}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{arrival.driverName}</p>
                              {arrival.invoiceNumber && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <FileText className="h-3 w-3" /> NF: {arrival.invoiceNumber}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1 bg-background px-2 py-1 rounded">
                            <Clock className="h-3 w-3" />
                            Chegou às {format(new Date(arrival.createdAt), "HH:mm")}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* QR Code Column */}
          <div className="space-y-6">
            <Card className="border-border bg-card h-full flex flex-col">
              <CardHeader className="text-center pb-2">
                <CardTitle>Acesso do Motorista</CardTitle>
                <CardDescription>
                  Peça para o motorista escanear o código para acompanhar o status.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center flex-1 space-y-6">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-border">
                  <QRCodeSVG
                    value={driverUrl}
                    size={192}
                    level="M"
                    marginSize={0}
                  />
                </div>
                
                <div className="text-center space-y-2 w-full">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">URL do Aplicativo</p>
                  <div className="bg-secondary p-3 rounded-md border border-border text-center overflow-hidden text-ellipsis whitespace-nowrap">
                    <code className="text-sm text-primary">{driverUrl}</code>
                  </div>
                </div>

                <div className="w-full bg-secondary/30 border border-border rounded-lg p-4 text-sm text-muted-foreground space-y-2">
                  <p className="flex gap-2"><span className="text-primary font-bold">1.</span> O motorista acessa o link</p>
                  <p className="flex gap-2"><span className="text-primary font-bold">2.</span> Digita a placa do veículo</p>
                  <p className="flex gap-2"><span className="text-primary font-bold">3.</span> Permite acesso à localização</p>
                  <p className="flex gap-2"><span className="text-primary font-bold">4.</span> Recebe notificação da doca</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
