import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { UserPlus, Users, Trash2, Copy, Check, ShieldAlert } from "lucide-react";

import {
  useListCompanyUsers,
  getListCompanyUsersQueryKey,
  useCreateCompanyUser,
  useUpdateCompanyUser,
  useDeleteCompanyUser,
  useGetMe,
  type CompanyUser,
} from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const roleLabels: Record<string, string> = {
  gestor: "Gestor",
  portaria: "Portaria",
  doca: "Doca",
};

const createUserSchema = z.object({
  name: z.string().min(2, "Informe o nome completo"),
  email: z.string().email("E-mail inválido"),
  role: z.enum(["gestor", "portaria", "doca"]),
});

type CreateUserValues = z.infer<typeof createUserSchema>;

function NewUserDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (password: string, email: string) => void;
}) {
  const { toast } = useToast();
  const createUser = useCreateCompanyUser();

  const form = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { name: "", email: "", role: "portaria" },
  });

  const onSubmit = (data: CreateUserValues) => {
    createUser.mutate(
      { data },
      {
        onSuccess: (created) => {
          form.reset();
          onOpenChange(false);
          onCreated(created.temporaryPassword, created.email);
        },
        onError: (err: any) => {
          toast({
            variant: "destructive",
            title: "Não foi possível criar o usuário",
            description:
              err?.message ??
              "Verifique se o e-mail já não está cadastrado.",
          });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo usuário interno</DialogTitle>
          <DialogDescription>
            Cria o login de acesso ao painel para um funcionário da Volvo
            (gestor, portaria ou doca).
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Maria Silva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="maria@volvo.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Função</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="gestor">Gestor</SelectItem>
                      <SelectItem value="portaria">Portaria</SelectItem>
                      <SelectItem value="doca">Doca</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="submit"
                disabled={createUser.isPending}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {createUser.isPending ? "Criando..." : "Criar usuário"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function PasswordRevealDialog({
  open,
  onOpenChange,
  email,
  password,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  password: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(password).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Usuário criado com sucesso</DialogTitle>
          <DialogDescription>
            Compartilhe essa senha temporária com <strong>{email}</strong>{" "}
            (WhatsApp, e-mail, etc). Ela só aparece esta vez — o Yardflow não
            guarda nem mostra de novo.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/40 p-3">
          <code className="flex-1 font-mono text-lg tracking-wide">
            {password}
          </code>
          <Button type="button" size="icon" variant="outline" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Recomende que a pessoa troque a senha no primeiro acesso, em
          "Gerenciar conta" no canto inferior esquerdo do painel.
        </p>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} className="w-full">
            Entendi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Usuarios() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: me, isLoading: meLoading } = useGetMe();
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [revealPassword, setRevealPassword] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [userToDelete, setUserToDelete] = useState<CompanyUser | null>(null);

  const isGestor = me?.companyUser?.role === "gestor";

  const { data: users, isLoading } = useListCompanyUsers({
    query: { queryKey: getListCompanyUsersQueryKey(), enabled: isGestor },
  });

  const updateUser = useUpdateCompanyUser();
  const deleteUser = useDeleteCompanyUser();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListCompanyUsersQueryKey() });

  const handleRoleChange = (user: CompanyUser, role: string) => {
    updateUser.mutate(
      { id: user.id, data: { role: role as CompanyUser["role"] } },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: "Função atualizada" });
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Não foi possível atualizar a função",
          });
        },
      }
    );
  };

  const confirmDelete = () => {
    if (!userToDelete) return;
    deleteUser.mutate(
      { id: userToDelete.id },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: "Usuário removido" });
          setUserToDelete(null);
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Não foi possível remover o usuário",
          });
          setUserToDelete(null);
        },
      }
    );
  };

  return (
    <div className="flex-1 h-full p-6 md:p-8 overflow-y-auto bg-background">
      <div className="max-w-4xl mx-auto space-y-6">
        {meLoading ? (
          <div className="flex justify-center py-12">
            <span className="h-8 w-8 rounded-full border-2 border-primary border-r-transparent animate-spin" />
          </div>
        ) : !isGestor ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center text-muted-foreground">
            <ShieldAlert className="h-10 w-10" />
            <p>Apenas gestores podem gerenciar usuários.</p>
          </div>
        ) : (
        <>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Users className="text-primary" />
              Usuários
            </h1>
            <p className="text-muted-foreground mt-1">
              Funcionários da Volvo com acesso ao painel administrativo.
            </p>
          </div>
          <Button
            onClick={() => setNewUserOpen(true)}
            className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Novo usuário
          </Button>
        </div>

        <Card className="border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-secondary/50">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>NOME</TableHead>
                  <TableHead>E-MAIL</TableHead>
                  <TableHead>FUNÇÃO</TableHead>
                  <TableHead className="text-right">AÇÕES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12">
                      <span className="inline-block h-6 w-6 rounded-full border-2 border-primary border-r-transparent animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : !users || users.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-12 text-muted-foreground"
                    >
                      Nenhum usuário cadastrado ainda.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} className="border-border hover:bg-secondary/50">
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(role) => handleRoleChange(user, role)}
                        >
                          <SelectTrigger className="w-[140px] h-8">
                            <SelectValue>
                              <Badge variant="outline" className="border-primary text-primary">
                                {roleLabels[user.role]}
                              </Badge>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gestor">Gestor</SelectItem>
                            <SelectItem value="portaria">Portaria</SelectItem>
                            <SelectItem value="doca">Doca</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setUserToDelete(user)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
        </>
        )}
      </div>

      <NewUserDialog
        open={newUserOpen}
        onOpenChange={setNewUserOpen}
        onCreated={(password, email) => setRevealPassword({ password, email })}
      />

      {revealPassword && (
        <PasswordRevealDialog
          open={!!revealPassword}
          onOpenChange={(open) => !open && setRevealPassword(null)}
          email={revealPassword.email}
          password={revealPassword.password}
        />
      )}

      <AlertDialog
        open={!!userToDelete}
        onOpenChange={(open) => !open && setUserToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              {userToDelete?.name} perderá o acesso ao painel imediatamente.
              Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
