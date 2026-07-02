import { useState } from "react";
import { format, subDays } from "date-fns";
import { Download, CalendarIcon, FileText } from "lucide-react";
import { useGetReports, getGetReportsQueryKey } from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const STATUS_LABELS: Record<string, string> = {
  waiting: "Aguardando",
  in_yard: "No Pátio",
  called: "Chamado",
  possible_exit: "Saída Irregular",
  finished: "Finalizado",
};

export default function Relatorios() {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 7), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data: reportData, isLoading } = useGetReports({
    from: new Date(dateFrom).toISOString(),
    to: new Date(dateTo).toISOString(),
    page: 1,
    limit: 100
  }, {
    query: {
      queryKey: getGetReportsQueryKey({
        from: new Date(dateFrom).toISOString(),
        to: new Date(dateTo).toISOString(),
        page: 1,
        limit: 100
      })
    }
  });

  const handleExportCSV = () => {
    if (!reportData?.data) return;
    
    const headers = ["ID", "Placa", "Motorista", "NF", "Status", "Doca", "Chegada", "Pátio", "Saída", "Duração (min)"];
    const csvContent = [
      headers.join(","),
      ...reportData.data.map(r => [
        r.id,
        r.plate,
        `"${r.driverName}"`,
        r.invoiceNumber || "-",
        r.status,
        r.dockNumber || "-",
        r.createdAt ? new Date(r.createdAt).toLocaleString() : "-",
        r.inYardAt ? new Date(r.inYardAt).toLocaleString() : "-",
        r.finishedAt ? new Date(r.finishedAt).toLocaleString() : "-",
        r.durationMinutes || "-"
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `yardflow-report-${format(new Date(), "yyyyMMdd-HHmm")}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 h-full p-6 md:p-8 overflow-y-auto bg-background">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <FileText className="text-primary" />
              Relatórios
            </h1>
            <p className="text-muted-foreground mt-1">Histórico de operações e tempos de permanência.</p>
          </div>
          
          <Button onClick={handleExportCSV} disabled={!reportData?.data?.length} variant="outline" className="shrink-0 border-border">
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>

        <Card className="border-border bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Filtro de Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-end gap-4">
              <div className="w-full sm:w-auto space-y-2">
                <label className="text-sm font-medium">De</label>
                <Input 
                  type="date" 
                  value={dateFrom} 
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-background border-border"
                />
              </div>
              <div className="w-full sm:w-auto space-y-2">
                <label className="text-sm font-medium">Até</label>
                <Input 
                  type="date" 
                  value={dateTo} 
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-background border-border"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-secondary/50">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="font-mono text-xs">PLACA</TableHead>
                  <TableHead>MOTORISTA</TableHead>
                  <TableHead>STATUS</TableHead>
                  <TableHead>CHEGADA</TableHead>
                  <TableHead>SAÍDA</TableHead>
                  <TableHead className="text-right">PERMANÊNCIA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <span className="inline-block h-6 w-6 rounded-full border-2 border-primary border-r-transparent animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : !reportData?.data || reportData.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      Nenhum registro encontrado no período.
                    </TableCell>
                  </TableRow>
                ) : (
                  reportData.data.map((row) => (
                    <TableRow key={row.id} className="border-border hover:bg-secondary/50">
                      <TableCell className="font-mono font-medium">{row.plate}</TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">{row.driverName}</div>
                        {row.invoiceNumber && <div className="text-xs text-muted-foreground">NF: {row.invoiceNumber}</div>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          row.status === 'finished' ? 'border-border text-muted-foreground' : 'border-primary text-primary'
                        }>
                          {STATUS_LABELS[row.status] ?? row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {row.createdAt ? format(new Date(row.createdAt), "dd/MM/yyyy HH:mm") : "-"}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {row.finishedAt ? format(new Date(row.finishedAt), "dd/MM/yyyy HH:mm") : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {row.durationMinutes ? `${row.durationMinutes}m` : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {reportData && reportData.data.length > 0 && (
            <div className="p-4 border-t border-border bg-secondary/30 text-xs text-muted-foreground text-center">
              Mostrando os últimos {reportData.data.length} registros
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
