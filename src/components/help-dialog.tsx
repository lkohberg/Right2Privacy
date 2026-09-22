import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CircleHelp, History, KeyRound, Lock, MessagesSquare } from "lucide-react";
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
    { icon: <Lock className="h-4 w-4" />, title: t("help_encrypt_title"), body: t("help_encrypt_body") },
    { icon: <MessagesSquare className="h-4 w-4" />, title: t("help_chat_title"), body: t("help_chat_body") },
    { icon: <History className="h-4 w-4" />, title: t("help_legacy_title"), body: t("help_legacy_body") },
    { icon: <KeyRound className="h-4 w-4" />, title: t("help_keys_title"), body: t("help_keys_body") },
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
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("help_title")}</DialogTitle>
          <DialogDescription>{t("help_intro")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-1">
          {sections.map((s) => (
            <div key={s.title} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {s.icon}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{s.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
        <Button type="button" className="w-full" onClick={() => setOpen(false)}>
          {t("help_close")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
