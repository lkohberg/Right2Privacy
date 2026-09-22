import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bell,
  CircleHelp,
  ContactRound,
  Eye,
  History,
  KeyRound,
  Lock,
  MessagesSquare,
  Settings,
  UserRound,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function HelpDialog({ triggerClassName }: { triggerClassName?: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const sections = [
    { icon: <UserRound className="h-4 w-4" />, title: t("settings_account"), body: t("help_account_body") },
    { icon: <Users className="h-4 w-4" />, title: t("friends_title"), body: t("help_friends_body") },
    { icon: <ContactRound className="h-4 w-4" />, title: t("nav_messages"), body: t("help_contacts_body") },
    { icon: <MessagesSquare className="h-4 w-4" />, title: t("help_chat_title"), body: t("help_chat_body") },
    { icon: <History className="h-4 w-4" />, title: t("help_legacy_title"), body: t("help_legacy_body") },
    { icon: <Bell className="h-4 w-4" />, title: t("activity_title"), body: t("help_notifications_body") },
    { icon: <Settings className="h-4 w-4" />, title: t("settings_title"), body: t("help_settings_body") },
    { icon: <Eye className="h-4 w-4" />, title: t("nav_watchlist"), body: t("help_watchlist_body") },
    { icon: <KeyRound className="h-4 w-4" />, title: t("help_keys_title"), body: t("help_keys_body") },
    { icon: <Lock className="h-4 w-4" />, title: t("help_encrypt_title"), body: t("help_privacy_body") },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title={t("help_title")}
          aria-label={t("help_title")}
          className={triggerClassName ?? "h-10 w-10 rounded-lg text-muted-foreground"}
        >
          <CircleHelp className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden bg-card p-0 text-left sm:max-w-2xl">
        <DialogHeader className="border-b border-border px-6 pb-5 pt-6 pr-12">
          <DialogTitle>{t("help_title")}</DialogTitle>
          <DialogDescription className="leading-relaxed">{t("help_intro")}</DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto px-5 py-2 sm:px-6">
          {sections.map((s, index) => (
            <div key={`${index}-${s.title}`} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 border-b border-border py-4 last:border-b-0">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {s.icon}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold"><span className="mr-2 font-mono text-xs text-primary">{index + 1}.</span>{s.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-border p-4 sm:px-6">
          <Button type="button" className="w-full" onClick={() => setOpen(false)}>
            {t("help_close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
