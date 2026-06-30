import { Link } from "wouter";
import { AlertTriangle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-background">
      <div className="bg-secondary p-4 rounded-full mb-6 border border-border">
        <AlertTriangle className="h-12 w-12 text-primary" />
      </div>
      <h1 className="text-4xl font-bold font-sans text-foreground mb-2">Página não encontrada</h1>
      <p className="text-muted-foreground max-w-md mb-8">
        O recurso que você está tentando acessar não existe ou foi movido. Verifique o endereço e tente novamente.
      </p>
      <Link href="/portaria">
        <Button size="lg" className="font-medium bg-primary text-primary-foreground hover:bg-primary/90">
          <Home className="mr-2 h-5 w-5" />
          Voltar para Portaria
        </Button>
      </Link>
    </div>
  );
}
