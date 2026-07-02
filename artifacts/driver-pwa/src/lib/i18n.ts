export type Lang = "pt" | "en";

export function detectLang(): Lang {
  if (typeof navigator === "undefined") return "pt";
  const langs = navigator.languages && navigator.languages.length
    ? navigator.languages
    : [navigator.language];
  for (const l of langs) {
    if (l?.toLowerCase().startsWith("pt")) return "pt";
  }
  return "en";
}

const dict = {
  pt: {
    appSubtitle: "Sistema de Pátio",
    linkTitle: "Vincular chegada",
    linkSubtitle: "Informe a placa do caminhão e o número da nota fiscal para se vincular ao registro.",
    plateLabel: "Placa do caminhão",
    platePlaceholder: "ABC-1234",
    or: "ou",
    invoiceLabel: "Número da nota fiscal",
    invoicePlaceholder: "NF-000123",
    linkButton: "Vincular",
    linkButtonLoading: "Buscando...",
    installHint: "Para receber notificações, instale este app na tela inicial.",
    missingFields: "Informe a placa e o número da nota fiscal",
    notFoundTitle: "Cadastro não encontrado",
    notFoundDescription: "Verifique a placa ou número da nota e tente novamente.",
    loading: "Carregando...",
    notFound: "Registro não encontrado.",
    linkAgain: "Vincular novamente",
    unlink: "Desvincular",
    statusWaitingLabel: "Aguardando",
    statusWaitingDesc: "Seu cadastro foi registrado. Aguarde ser chamado.",
    statusInYardLabel: "No Pátio",
    statusInYardDesc: "Você está no pátio. Aguarde ser chamado para a doca.",
    statusCalledLabel: "Chamado!",
    statusCalledDesc: "Dirija-se à doca indicada abaixo.",
    statusAlertLabel: "Possível Saída",
    statusAlertDesc: "Você foi detectado fora do pátio. Contate a portaria se ainda estiver nas dependências.",
    statusFinishedLabel: "Finalizado",
    statusFinishedDesc: "Sua visita foi concluída. Obrigado!",
    dockLabel: "Doca",
    tapToSilence: "Toque para silenciar",
    yourData: "Seus dados",
    plate: "Placa",
    driver: "Motorista",
    invoice: "Nota Fiscal",
    timeInYard: "Tempo no pátio",
    locationActive: "Localização ativa",
    enableNotifications: "Ativar notificações",
    enablingNotifications: "Ativando...",
    notificationsActive: "Notificações ativadas",
    notificationsUnavailableTitle: "Notificações não disponíveis",
    notificationsUnavailableDesc: "Certifique-se de que o app está instalado na tela inicial.",
    permissionDeniedTitle: "Permissão negada",
    permissionDeniedDesc: "Habilite as notificações nas configurações do dispositivo.",
    notificationsEnabledTitle: "Notificações ativadas!",
    notificationsEnabledDesc: "Você será notificado quando chamado para a doca.",
    notificationsErrorTitle: "Erro ao ativar notificações",
    notificationsConfigErrorTitle: "Erro ao configurar notificações",
    iosHint: "iOS: instale na tela inicial para receber notificações push.",
    hoursShort: "h",
    minutesShort: "min",
  },
  en: {
    appSubtitle: "Yard System",
    linkTitle: "Link your arrival",
    linkSubtitle: "Enter the truck's license plate and the invoice number to link to your record.",
    plateLabel: "License plate",
    platePlaceholder: "ABC-1234",
    or: "or",
    invoiceLabel: "Invoice number",
    invoicePlaceholder: "INV-000123",
    linkButton: "Link",
    linkButtonLoading: "Searching...",
    installHint: "To receive notifications, install this app on your home screen.",
    missingFields: "Enter both the plate and the invoice number",
    notFoundTitle: "Record not found",
    notFoundDescription: "Check the plate or invoice number and try again.",
    loading: "Loading...",
    notFound: "Record not found.",
    linkAgain: "Link again",
    unlink: "Unlink",
    statusWaitingLabel: "Waiting",
    statusWaitingDesc: "Your record has been registered. Please wait to be called.",
    statusInYardLabel: "In the Yard",
    statusInYardDesc: "You're in the yard. Please wait to be called to a dock.",
    statusCalledLabel: "Called!",
    statusCalledDesc: "Head to the dock number shown below.",
    statusAlertLabel: "Possible Exit",
    statusAlertDesc: "You were detected outside the yard. Contact the gate if you're still on site.",
    statusFinishedLabel: "Finished",
    statusFinishedDesc: "Your visit is complete. Thank you!",
    dockLabel: "Dock",
    tapToSilence: "Tap to silence",
    yourData: "Your details",
    plate: "Plate",
    driver: "Driver",
    invoice: "Invoice",
    timeInYard: "Time in yard",
    locationActive: "Location active",
    enableNotifications: "Enable notifications",
    enablingNotifications: "Enabling...",
    notificationsActive: "Notifications enabled",
    notificationsUnavailableTitle: "Notifications unavailable",
    notificationsUnavailableDesc: "Make sure the app is installed on your home screen.",
    permissionDeniedTitle: "Permission denied",
    permissionDeniedDesc: "Enable notifications in your device settings.",
    notificationsEnabledTitle: "Notifications enabled!",
    notificationsEnabledDesc: "You'll be notified when called to a dock.",
    notificationsErrorTitle: "Couldn't enable notifications",
    notificationsConfigErrorTitle: "Error setting up notifications",
    iosHint: "iOS: install on your home screen to receive push notifications.",
    hoursShort: "h",
    minutesShort: "min",
  },
} as const;

export type TranslationKey = keyof typeof dict["pt"];

export function useI18n() {
  const lang = detectLang();
  const t = (key: TranslationKey): string => dict[lang][key];
  return { lang, t };
}
