import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Bot, Check, Database, Globe, Smartphone, Terminal, MonitorSmartphone, Sparkles, Users, BadgeCheck, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { ConsolePage } from "@/components/console/ConsolePage";
import { CodeBlock } from "@/components/console/CodeBlock";
import { AppLogo } from "@/components/console/AppLogo";
import { APPS_KEY, errorText } from "@/components/console/console-data";
import { saveOAuthClient, saveOAuthClientSettings } from "@/lib/oauth/console.functions";
import { redirectUriSchema } from "@/lib/oauth/console-schemas";
import { DISCOVERY_URL, type AppType } from "@/lib/oauth/integration-templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/console/apps/new")({
  head: () => ({ meta: [{ title: "Nieuwe app — ROUT Developer Console" }] }),
  component: NewAppWizard,
});

type Draft = {
  step: 1 | 2 | 3;
  name: string;
  logoUrl: string;
  type: AppType;
  autoDiscovery: boolean;
  richIdentity: boolean;
  scopes: string[];
  redirects: string[];
};

const STORAGE_KEY = "rout.console.new-app-draft";
const EMPTY: Draft = {
  step: 1, name: "", logoUrl: "", type: "web", autoDiscovery: true, richIdentity: false,
  scopes: ["openid", "profile", "email"], redirects: [""],
};

const TYPES: { id: AppType; label: string; text: string; icon: typeof Globe }[] = [
  { id: "web", label: "Webapp met server", text: "Next.js, Laravel, Rails… Je server bewaart het geheim. PKCE staat aan (aanbevolen).", icon: Globe },
  { id: "spa", label: "Single-page app", text: "React, Vue in de browser. Geen geheim mogelijk, dus PKCE verplicht.", icon: MonitorSmartphone },
  { id: "native", label: "Mobiel / desktop", text: "iOS, Android, Electron. PKCE verplicht, geen geheim in de app.", icon: Smartphone },
];

const SCOPES = [
  { id: "openid", label: "openid", text: "Verplicht. Geeft een unieke ROUT-ID (sub).", locked: true },
  { id: "profile", label: "profile", text: "Naam, handle en avatar." },
  { id: "email", label: "email", text: "E-mailadres en of het geverifieerd is." },
  { id: "linked_accounts", label: "linked_accounts", text: "Gekoppelde sociale accounts (met toestemming)." },
];

const STEPS = ["App-info", "Superpowers", "Scopes & redirects", "Launchpad"];

function NewAppWizard() {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [result, setResult] = useState<{ id: string; clientId: string; secret: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const save = useServerFn(saveOAuthClient);
  const saveSettings = useServerFn(saveOAuthClientSettings);
  const qc = useQueryClient();

  // Restore the draft after a refresh/back; never store secrets.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setDraft({ ...EMPTY, ...(JSON.parse(raw) as Partial<Draft>) });
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded && !result) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [draft, loaded, result]);

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const redirects = draft.redirects.map((r) => r.trim()).filter(Boolean);
  const redirectErrors = draft.redirects.map((r) => (r.trim() && !redirectUriSchema.safeParse(r).success ? "https vereist (http enkel voor localhost), geen #fragment" : null));
  const step1Ok = draft.name.trim().length >= 2 && (!draft.logoUrl || draft.logoUrl.startsWith("https://"));
  const step3Ok = redirects.length > 0 && redirectErrors.every((e) => !e);
  const currentStep = result ? 4 : draft.step;

  const create = async () => {
    setBusy(true);
    try {
      const res = (await save({
        data: {
          name: draft.name.trim(),
          logoUrl: draft.logoUrl.trim() || null,
          redirectUris: redirects,
          scopes: draft.scopes as never,
          richIdentityEnabled: draft.richIdentity,
        },
      })) as { client: { id: string; clientId: string }; clientSecret: string | null };
      await saveSettings({ data: { id: res.client.id, requirePkce: true, accountDiscoveryEnabled: draft.autoDiscovery } });
      await qc.invalidateQueries({ queryKey: APPS_KEY });
      sessionStorage.removeItem(STORAGE_KEY);
      setResult({ id: res.client.id, clientId: res.client.clientId, secret: draft.type === "web" ? res.clientSecret : null });
    } catch (e) {
      toast.error(errorText(e, "Aanmaken mislukt."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ConsolePage title="Nieuwe app" description="Vier stappen naar 'Login met ROUT' — met soevereine identiteit ingebouwd.">
      <ol className="grid grid-cols-4 gap-2">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const done = n < currentStep;
          return (
            <li key={label} className="space-y-2">
              <div className={cn("h-1 rounded-full", n <= currentStep ? "bg-primary" : "bg-muted")} />
              <p className={cn("flex items-center gap-1.5 text-xs", n === currentStep ? "text-foreground" : "text-muted-foreground")}>
                {done ? <Check className="h-3 w-3" /> : <span className="font-mono">{n}</span>} {label}
              </p>
            </li>
          );
        })}
      </ol>

      {!result && draft.step === 1 && (
        <section className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-3">
              <label className="block text-sm font-medium">Naam van je app
                <Input className="mt-1.5" maxLength={120} placeholder="Bv. Fietsclub Gent" value={draft.name} onChange={(e) => set({ name: e.target.value })} />
              </label>
              <label className="block text-sm font-medium">Logo-URL <span className="font-normal text-muted-foreground">(optioneel, https)</span>
                <Input className="mt-1.5" placeholder="https://jouwapp.be/logo.png" value={draft.logoUrl} onChange={(e) => set({ logoUrl: e.target.value })} />
              </label>
            </div>
            <AppLogo app={{ name: draft.name || "?", logoUrl: draft.logoUrl.startsWith("https://") ? draft.logoUrl : null }} />
          </div>
          <div>
            <p className="mb-3 text-sm font-medium">Wat voor app bouw je?</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {TYPES.map(({ id, label, text, icon: Icon }) => (
                <button key={id} type="button" onClick={() => set({ type: id })}
                  className={cn("rounded-2xl border p-4 text-left transition-colors", draft.type === id ? "border-primary bg-primary/5" : "border-border hover:border-foreground/30")}>
                  <Icon className="mb-3 h-5 w-5" />
                  <p className="font-medium">{label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{text}</p>
                </button>
              ))}
            </div>
          </div>
          <Nav next={() => set({ step: 2 })} nextDisabled={!step1Ok} />
        </section>
      )}

      {!result && draft.step === 2 && (
        <section className="space-y-4">
          <Power icon={Users} title="Account Auto-Discovery" checked={draft.autoDiscovery} onChange={(v) => set({ autoDiscovery: v })}
            text="Heeft iemand al een account in jouw app met hetzelfde geverifieerde e-mailadres? Dan wordt het gekoppeld in plaats van een dubbel account te maken. Bezoekers die al bij ROUT ingelogd zijn, worden ook stil herkend."
            example={<><span className="rounded bg-muted px-1.5 py-0.5">jan@mail.be (bestaand)</span> + <span className="rounded bg-muted px-1.5 py-0.5">ROUT-login</span> → <b>één account</b></>} />
          <Power icon={BadgeCheck} title="Rich Identity" checked={draft.richIdentity} onChange={(v) => set({ richIdentity: v })}
            text="Ontvang bij het inloggen geverifieerde badges (persoon, bedrijf, influencer) zodat je echte mensen kan herkennen. De gebruiker beslist zelf of hij ze deelt."
            example={<><span className="rounded bg-muted px-1.5 py-0.5">is_verified_person: true</span> <span className="rounded bg-muted px-1.5 py-0.5">is_influencer: false</span></>} />
          <Nav back={() => set({ step: 1 })} next={() => set({ step: 3 })} />
        </section>
      )}

      {!result && draft.step === 3 && (
        <section className="space-y-6">
          <div>
            <p className="mb-3 text-sm font-medium">Welke gegevens vraag je?</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {SCOPES.map((s) => {
                const on = draft.scopes.includes(s.id);
                return (
                  <label key={s.id} className={cn("flex items-start gap-3 rounded-xl border p-3", on ? "border-primary/60" : "border-border")}>
                    <input type="checkbox" className="mt-1" checked={on} disabled={s.locked}
                      onChange={(e) => set({ scopes: e.target.checked ? [...draft.scopes, s.id] : draft.scopes.filter((x) => x !== s.id) })} />
                    <span><span className="font-mono text-sm">{s.label}</span><span className="block text-xs text-muted-foreground">{s.text}</span></span>
                  </label>
                );
              })}
            </div>
          </div>
          <div>
            <p className="mb-1 text-sm font-medium">Redirect-URI's</p>
            <p className="mb-3 text-xs text-muted-foreground">Waar ROUT gebruikers naar terugstuurt. Moet exact overeenkomen. Tijdens testen mag http://localhost.</p>
            <div className="space-y-2">
              {draft.redirects.map((r, i) => (
                <div key={i}>
                  <div className="flex gap-2">
                    <Input value={r} placeholder={draft.type === "native" ? "https://jouwapp.be/auth/callback" : "http://localhost:3000/auth/callback"}
                      onChange={(e) => set({ redirects: draft.redirects.map((x, j) => (j === i ? e.target.value : x)) })} />
                    {draft.redirects.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" aria-label="Verwijder" onClick={() => set({ redirects: draft.redirects.filter((_, j) => j !== i) })}><X className="h-4 w-4" /></Button>
                    )}
                  </div>
                  {redirectErrors[i] && <p className="mt-1 text-xs text-destructive">{redirectErrors[i]}</p>}
                </div>
              ))}
              {draft.redirects.length < 20 && (
                <Button type="button" variant="outline" size="sm" onClick={() => set({ redirects: [...draft.redirects, ""] })}><Plus className="h-4 w-4" /> Nog een URI</Button>
              )}
            </div>
          </div>
          <Nav back={() => set({ step: 2 })} next={create} nextDisabled={!step3Ok || busy} nextLabel={busy ? "Aanmaken…" : "App aanmaken"} />
        </section>
      )}

      {result && (
        <section className="space-y-6">
          <div className="rounded-2xl border border-primary/40 bg-primary/5 p-5">
            <p className="flex items-center gap-2 font-medium"><Sparkles className="h-4 w-4" /> {draft.name} is klaar voor lancering</p>
            <p className="mt-1 text-sm text-muted-foreground">Je app staat in testfase: alleen jij en uitgenodigde testers kunnen inloggen.</p>
          </div>
          <CodeBlock label="client_id" code={result.clientId} />
          {result.secret && (
            <div className="space-y-2">
              <CodeBlock label="client_secret — wordt maar één keer getoond" code={result.secret} />
              <p className="text-xs text-muted-foreground">Bewaar dit enkel op je server (bv. ROUT_CLIENT_SECRET). Kwijt? Je kan het roteren onder Credentials.</p>
            </div>
          )}
          <CodeBlock label="Discovery URL" code={DISCOVERY_URL} />
          <div className="grid gap-3 sm:grid-cols-3">
            <Launch to="/console/apps/$appId/ai-prompts" appId={result.id} icon={Bot} title="AI-prompt" text="Laat Cursor, Copilot of Lovable de login bouwen." />
            <Launch to="/console/apps/$appId/schema" appId={result.id} icon={Database} title="Schema-templates" text="SQL en Prisma voor rout_id en badges." />
            <Launch to="/console/apps/$appId/auth-logs" appId={result.id} icon={Terminal} title="Auth-debugger" text="Zie elke login-poging live, met oplossing." />
          </div>
        </section>
      )}
    </ConsolePage>
  );
}

function Nav({ back, next, nextDisabled, nextLabel = "Volgende" }: { back?: () => void; next: () => void; nextDisabled?: boolean; nextLabel?: string }) {
  return (
    <div className="flex justify-between border-t border-border pt-6">
      {back ? <Button variant="ghost" onClick={back}><ArrowLeft className="h-4 w-4" /> Terug</Button> : <Link to="/console/apps" className="text-sm text-muted-foreground hover:text-foreground">Annuleren</Link>}
      <Button onClick={next} disabled={nextDisabled}>{nextLabel} <ArrowRight className="h-4 w-4" /></Button>
    </div>
  );
}

function Power({ icon: Icon, title, text, example, checked, onChange }: { icon: typeof Users; title: string; text: string; example: React.ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className={cn("rounded-2xl border p-5 transition-colors", checked ? "border-primary bg-primary/5" : "border-border")}>
      <div className="flex items-start gap-4">
        <Icon className="mt-0.5 h-6 w-6 shrink-0" />
        <div className="flex-1">
          <p className="font-medium">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{text}</p>
          <p className="mt-3 font-mono text-xs text-muted-foreground">{example}</p>
        </div>
        <Switch checked={checked} onCheckedChange={onChange} aria-label={title} />
      </div>
    </div>
  );
}

function Launch({ to, appId, icon: Icon, title, text }: { to: "/console/apps/$appId/ai-prompts" | "/console/apps/$appId/schema" | "/console/apps/$appId/auth-logs"; appId: string; icon: typeof Bot; title: string; text: string }) {
  return (
    <Link to={to} params={{ appId }} className="rounded-2xl border border-border p-4 transition-colors hover:border-foreground/30">
      <Icon className="mb-3 h-5 w-5" />
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{text}</p>
    </Link>
  );
}
