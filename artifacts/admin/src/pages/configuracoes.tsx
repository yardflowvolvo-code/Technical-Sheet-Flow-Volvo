import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { Settings, Save, MapPin, RefreshCw } from "lucide-react";

import { useGetConfig, useUpdateConfig, getGetConfigQueryKey } from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const configSchema = z.object({
  geofenceLat: z.coerce.number().min(-90).max(90),
  geofenceLng: z.coerce.number().min(-180).max(180),
  geofenceRadiusMeters: z.coerce.number().min(50).max(5000),
  locationIntervalSeconds: z.coerce.number().min(10).max(300),
});

type ConfigFormValues = z.infer<typeof configSchema>;

export default function Configuracoes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useGetConfig({
    query: { queryKey: getGetConfigQueryKey() }
  });

  const updateConfig = useUpdateConfig();

  const form = useForm<ConfigFormValues>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      geofenceLat: 0,
      geofenceLng: 0,
      geofenceRadiusMeters: 500,
      locationIntervalSeconds: 30,
    },
  });

  useEffect(() => {
    if (config) {
      form.reset({
        geofenceLat: config.geofenceLat,
        geofenceLng: config.geofenceLng,
        geofenceRadiusMeters: config.geofenceRadiusMeters,
        locationIntervalSeconds: config.locationIntervalSeconds,
      });
    }
  }, [config, form]);

  const onSubmit = (data: ConfigFormValues) => {
    updateConfig.mutate(
      { data },
      {
        onSuccess: () => {
          toast({
            title: "Configurações salvas",
            description: "Os parâmetros do sistema foram atualizados com sucesso.",
          });
          queryClient.invalidateQueries({ queryKey: getGetConfigQueryKey() });
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Erro ao salvar",
            description: "Não foi possível atualizar as configurações.",
          });
        }
      }
    );
  };

  return (
    <div className="flex-1 h-full p-6 md:p-8 overflow-y-auto bg-background">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Settings className="text-primary" />
            Configurações
          </h1>
          <p className="text-muted-foreground mt-1">Parâmetros do sistema e cerca virtual.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <span className="h-8 w-8 rounded-full border-2 border-primary border-r-transparent animate-spin" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    Cerca Virtual (Geofence)
                  </CardTitle>
                  <CardDescription>
                    Coordenadas centrais do pátio para detectar saídas irregulares.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="geofenceLat"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Latitude</FormLabel>
                          <FormControl>
                            <Input type="number" step="any" className="font-mono bg-background" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="geofenceLng"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Longitude</FormLabel>
                          <FormControl>
                            <Input type="number" step="any" className="font-mono bg-background" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="geofenceRadiusMeters"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Raio da Cerca (metros)</FormLabel>
                        <FormControl>
                          <Input type="number" className="font-mono bg-background" {...field} />
                        </FormControl>
                        <FormDescription>
                          Tamanho da área considerada "dentro do pátio".
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <RefreshCw className="h-5 w-5 text-muted-foreground" />
                    Rastreamento
                  </CardTitle>
                  <CardDescription>
                    Configurações do PWA do motorista.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="locationIntervalSeconds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Intervalo de Atualização (segundos)</FormLabel>
                        <FormControl>
                          <Input type="number" className="font-mono bg-background" {...field} />
                        </FormControl>
                        <FormDescription>
                          Frequência com que o celular do motorista envia a localização.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="submit" disabled={updateConfig.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  {updateConfig.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-primary-foreground border-r-transparent animate-spin" />
                      Salvando...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      Salvar Configurações
                    </span>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </div>
    </div>
  );
}
