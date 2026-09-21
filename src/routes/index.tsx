import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock, KeyRound, Send, ShieldCheck, Flame, Scale } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Right2Privacy" },
      {
        name: "description",
        content:
          "End-to-end encrypt messages in your browser, then send the ciphertext through any messenger. Privacy is a human right.",
      },
      { property: "og:title", content: "Right2Privacy" },
      {
        property: "og:description",
        content:
          "End-to-end encrypt messages in your browser, then send the ciphertext through any messenger. Privacy is a human right.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-6">
        <div className="flex min-w-0 items-center gap-2">
          <Lock className="h-5 w-5 shrink-0 text-primary" />
          <span className="truncate font-mono text-sm tracking-tight">Right2Privacy</span>
        </div>
        <nav className="flex shrink-0 items-center gap-2 text-sm">
          <Link to="/auth" className="rounded-md border border-border px-2.5 py-1.5 hover:bg-accent sm:px-3">
            Sign in
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup" as const }}
            className="rounded-md bg-primary px-2.5 py-1.5 text-primary-foreground hover:opacity-90 sm:px-3"
          >
            <span className="sm:hidden">Sign up</span>
            <span className="hidden sm:inline">Create account</span>
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-3xl px-5 pt-16 pb-12 text-center sm:px-6 sm:pt-20 sm:pb-10">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
          Right<span className="text-primary">2</span>Privacy
        </h1>
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">Privacy is a human right.</p>
        <p className="mx-auto mt-8 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Encrypt any message in your browser. Paste the ciphertext into Discord, SMS, email anything. Only the friend
          you chose can decrypt it. We never see the plaintext or your keys.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to="/auth"
            search={{ mode: "signup" as const }}
            className="rounded-md bg-primary px-5 py-2.5 font-medium text-primary-foreground hover:opacity-90"
          >
            Get started
          </Link>
          <Link to="/auth" className="rounded-md border border-border px-5 py-2.5 font-medium hover:bg-accent">
            I have an account
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-5 py-12 sm:px-6 sm:py-16 sm:grid-cols-3">
        <Step
          icon={<KeyRound className="h-5 w-5 text-primary" />}
          title="1. Add a friend"
          body="Find them by their handle. Once they accept, their public key lives in your friends list."
        />
        <Step
          icon={<Lock className="h-5 w-5 text-primary" />}
          title="2. Encrypt in browser"
          body="Type your message and pick a friend. You get a ciphertext blob and the key travels to them privately."
        />
        <Step
          icon={<Send className="h-5 w-5 text-primary" />}
          title="3. Send it anywhere"
          body="Paste the blob into any messenger. Your friend pastes it back into Right2Privacy to decrypt."
        />
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-20 sm:px-6 sm:pb-24">
        <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" /> How the crypto works
          </div>
          <p className="text-sm text-muted-foreground">
            RSA-OAEP 2048 identity keys, AES-GCM 256 per-message keys. All crypto runs in your browser via the Web
            Crypto API. Your private key never leaves your device unencrypted — an optional password-encrypted backup is
            stored so you can restore on another device.
          </p>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-3xl px-5 py-6 text-center text-xs text-muted-foreground sm:px-6">
          <div>Right2Privacy · Privacy is a human right.</div>
          <div className="mt-3 flex justify-center gap-4">
            <Dialog>
              <DialogTrigger className="cursor-pointer underline-offset-4 hover:text-foreground hover:underline">
                <Flame className="mr-1 inline h-3 w-3" />
                Motivation
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto border-destructive/40 bg-background">
                <DialogHeader>
                  <DialogTitle className="text-left text-xl">
                    Chat Control is a surveillance regime dressed up as child safety.
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 text-left text-sm leading-relaxed text-muted-foreground">
                  <p>
                    The European Union. The same institution that lectures the world about human rights is trying to
                    force every messenger on the continent to scan your private conversations before they are even
                    encrypted. They call it "Chat Control." Strip away the PR and it is a mandatory wiretap on 450
                    million people. Every message, every photo, every voice note, pre-screened by an algorithm that
                    answers to a bureaucrat you never voted for.
                  </p>
                  <p>
                    They wave dead children in your face to sell it, because they know no honest argument survives ten
                    seconds of scrutiny. Mass-scanning does not catch predators. Predators already use tools this law
                    cannot touch. It catches <em>you</em>. Your medical photos. Your union chat. Your affair. Your
                    therapy venting. Your jokes taken out of context by a model with a 90% false-positive rate,
                    forwarded to a stranger in an office, and archived forever.
                  </p>
                  <p>
                    A government that demands the right to read every private sentence before it is spoken is not a
                    democracy with a security problem. It is an authoritarian project with a marketing department. The
                    Stasi kept paper files on a third of East Germany and were considered monstrous for it. Brussels
                    wants real-time client-side scanning on everyone, and calls it progress.
                  </p>
                  <p>
                    Right2Privacy exists because we refuse to negotiate our Rights, we demand them. The math does not
                    care about your directive. Big Brother now does. If the "legal" messengers are compromised by
                    decree, we will encrypt on top of them, underneath them, around them. Until the wiretap sees nothing
                    but noise. Paste the ciphertext into Discord, into Signal, into a postcard if you have to. Let them
                    scan it. Let them choke on it. Show them the ultimate <em>Middle Finger</em>.
                  </p>
                  <p className="text-foreground">
                    Privacy is not a loophole for criminals. It is the precondition for every other freedom you still
                    have left. Defend it, or admit you never really wanted it.
                  </p>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog>
              <DialogTrigger className="cursor-pointer underline-offset-4 hover:text-foreground hover:underline">
                <Scale className="mr-1 inline h-3 w-3" />
                Legal
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-left">Legal</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 text-left text-xs leading-relaxed text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">No warranty.</span> Right2Privacy is provided "as is",
                    without warranty of any kind, express or implied, including but not limited to fitness for a
                    particular purpose, security, or non-infringement. You use it at your own risk.
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Acceptable use.</span> This service is a tool for
                    private communication between consenting adults. Do not use it to plan, incite, or carry out acts
                    that are illegal in your jurisdiction. We cannot see your messages and we cannot police them; that
                    responsibility is yours.
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Data we hold.</span> Your email, a handle, your RSA
                    public key, and an encrypted-at-rest backup of your private key that only your password can unlock.
                    Wrapped per-message keys are relayed to the recipient and deleted on first fetch. We never see
                    plaintext, session keys, or your password.
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Your rights (GDPR).</span> You can export or delete
                    your account data at any time from Settings. Deleting your account destroys your key backup — old
                    messages become permanently unreadable. That is a feature.
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Jurisdiction.</span> Right2Privacy takes no position
                    on the legality of end-to-end encryption in any given country. Encryption is mathematics.
                    Mathematics is speech. Speech is protected — for now.
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Step({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3">{icon}</div>
      <div className="text-base font-medium">{title}</div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
