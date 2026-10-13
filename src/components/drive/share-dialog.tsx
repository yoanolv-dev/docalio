"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  Check,
  Copy,
  Eye,
  Download,
  Inbox,
  KeyRound,
  Link2,
  LoaderCircle,
  Mail,
  Pencil,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ItemIcon } from "@/components/drive/item-icon";
import { useToast } from "@/components/ui/toast";
import {
  createLinkAction,
  listItemLinksAction,
  revokeLinkAction,
  updateLinkAction,
  type LinkPermission,
} from "@/lib/actions/links";
import {
  cancelGuestInviteAction,
  inviteGuestAction,
  listSpaceGuestsAction,
  removeGuestAccessAction,
  setGuestLevelAction,
  type PendingGuestInvite,
  type SpaceGuest,
} from "@/lib/actions/guests";
import type { AccessLevel, DriveLink } from "@/lib/types/database";
import { cn, formatDate } from "@/lib/utils";

export interface ShareTarget {
  workspaceId: string;
  folderId: string | null;
  documentId: string | null;
  kind: "space" | "folder" | "file";
  name: string;
  mime?: string | null;
}

const PERMISSIONS: { id: LinkPermission; label: string; hint: string; icon: typeof Eye; files: boolean }[] = [
  { id: "download", label: "Consulter et télécharger", hint: "Le plus courant", icon: Download, files: true },
  { id: "view", label: "Consulter seulement", hint: "Aperçu sans téléchargement", icon: Eye, files: true },
  { id: "upload", label: "Déposer des fichiers", hint: "Boîte de dépôt, contenu invisible", icon: Inbox, files: false },
  { id: "download_upload", label: "Télécharger et déposer", hint: "Échange dans les deux sens", icon: Link2, files: false },
];

const EXPIRY = [
  { id: "never", label: "Jamais" },
  { id: "1", label: "24 heures" },
  { id: "7", label: "7 jours" },
  { id: "30", label: "30 jours" },
  { id: "custom", label: "Date précise" },
] as const;

function permissionOf(link: DriveLink): LinkPermission {
  if (!link.can_view) return "upload";
  if (link.can_upload) return "download_upload";
  return link.can_download ? "download" : "view";
}

function linkUrl(token: string): string {
  return `${window.location.origin}/s/${token}`;
}

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function expiresFrom(choice: string, customDate: string): string | null {
  if (choice === "never") return null;
  if (choice === "custom") {
    if (!customDate) return null;
    const d = new Date(`${customDate}T23:59:59`);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return new Date(Date.now() + Number(choice) * 86_400_000).toISOString();
}

/**
 * Partage d'un fichier, d'un dossier ou d'un espace : liens (lecture,
 * téléchargement, dépôt ; mot de passe ; expiration) et, pour un espace,
 * personnes invitées.
 */
export function ShareDialog({
  open,
  onOpenChange,
  target,
  canManage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: ShareTarget | null;
  /** Peut créer des liens et inviter (membre avec droit d'écriture). */
  canManage: boolean;
}) {
  const [tab, setTab] = useState<"links" | "people">("links");
  const [prevKey, setPrevKey] = useState<string | null>(null);
  const key = target ? `${target.kind}:${target.documentId ?? target.folderId ?? target.workspaceId}` : null;
  if (open && key !== prevKey) {
    setPrevKey(key);
    setTab("links");
  }

  if (!target) return null;
  const isSpace = target.kind === "space";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] max-w-xl gap-0 overflow-hidden p-0">
        <div className="flex items-start gap-3 border-b border-border px-6 pb-4 pt-6">
          <ItemIcon kind={target.kind === "file" ? "file" : "folder"} name={target.name} mime={target.mime} />
          <div className="min-w-0">
            <DialogTitle className="truncate pr-6">Partager « {target.name} »</DialogTitle>
            <DialogDescription className="mt-0.5">
              {target.kind === "file"
                ? "Un lien sécurisé vers ce fichier."
                : target.kind === "folder"
                  ? "Un lien vers ce dossier et tout son contenu."
                  : "Des liens vers tout l'espace, ou des personnes invitées."}
            </DialogDescription>
          </div>
        </div>

        {isSpace && canManage && (
          <div className="flex gap-1 border-b border-border px-6 pt-2">
            {(
              [
                ["links", "Liens", Link2],
                ["people", "Personnes invitées", Users],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "-mb-px flex items-center gap-2 border-b-2 px-3 pb-2.5 pt-1 text-sm font-medium transition-colors",
                  tab === id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="max-h-[70dvh] overflow-y-auto px-6 py-5">
          {!canManage ? (
            <p className="rounded-xl bg-canvas p-4 text-sm text-muted-foreground">
              Seules les personnes qui peuvent modifier cet espace créent des liens de partage.
            </p>
          ) : tab === "people" && isSpace ? (
            <PeoplePanel workspaceId={target.workspaceId} />
          ) : (
            <LinksPanel target={target} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// Liens
// -----------------------------------------------------------------------------

function LinksPanel({ target }: { target: ShareTarget }) {
  const toast = useToast();
  const [links, setLinks] = useState<DriveLink[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<DriveLink | null>(null);
  const [justCreated, setJustCreated] = useState<string | null>(null);

  const fetchLinks = useCallback(
    () =>
      listItemLinksAction({
        workspaceId: target.workspaceId,
        folderId: target.folderId,
        documentId: target.documentId,
      }),
    [target.workspaceId, target.folderId, target.documentId]
  );

  const load = useCallback(async () => {
    setLinks(await fetchLinks());
  }, [fetchLinks]);

  useEffect(() => {
    let cancelled = false;
    fetchLinks().then((list) => {
      if (cancelled) return;
      setLinks(list);
      if (list.length === 0) setCreating(true);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchLinks]);

  if (links === null) {
    return (
      <div className="flex justify-center py-8">
        <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {links.length > 0 && (
        <ul className="space-y-2">
          {links.map((link) =>
            editing?.id === link.id ? (
              <li key={link.id}>
                <LinkForm
                  target={target}
                  link={link}
                  onCancel={() => setEditing(null)}
                  onSaved={async () => {
                    setEditing(null);
                    toast.show("Lien mis à jour.");
                    await load();
                  }}
                />
              </li>
            ) : (
              <LinkRow
                key={link.id}
                link={link}
                highlight={link.token === justCreated}
                onEdit={() => {
                  setCreating(false);
                  setEditing(link);
                }}
                onRevoked={load}
              />
            )
          )}
        </ul>
      )}

      {creating ? (
        <LinkForm
          target={target}
          onCancel={links.length ? () => setCreating(false) : undefined}
          onSaved={async (token) => {
            setCreating(false);
            setJustCreated(token ?? null);
            if (token && (await copy(linkUrl(token)))) toast.show("Lien créé et copié dans le presse-papiers.");
            else toast.show("Lien créé.");
            await load();
          }}
        />
      ) : (
        !editing && (
          <Button variant="outline" className="w-full" onClick={() => setCreating(true)}>
            <Link2 className="h-4 w-4" />
            Nouveau lien
          </Button>
        )
      )}
    </div>
  );
}

function LinkRow({
  link,
  highlight,
  onEdit,
  onRevoked,
}: {
  link: DriveLink;
  highlight: boolean;
  onEdit: () => void;
  onRevoked: () => void;
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const [now] = useState(() => Date.now());
  const perm = PERMISSIONS.find((p) => p.id === permissionOf(link))!;
  const expired = link.expires_at ? new Date(link.expires_at).getTime() < now : false;
  const PermIcon = perm.icon;

  const meta = [
    link.expires_at ? (expired ? "Expiré" : `Expire le ${formatDate(link.expires_at)}`) : "Sans expiration",
    link.has_password ? "Mot de passe" : null,
    `${link.view_count} ouverture${link.view_count > 1 ? "s" : ""}`,
    link.can_download ? `${link.download_count} téléchargement${link.download_count > 1 ? "s" : ""}` : null,
    link.can_upload ? `${link.upload_count} dépôt${link.upload_count > 1 ? "s" : ""}` : null,
  ].filter(Boolean);

  return (
    <li
      className={cn(
        "rounded-xl border p-3.5 transition-colors",
        highlight ? "border-primary/40 bg-primary-subtle/60" : "border-border bg-white"
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-canvas text-muted-foreground">
          {link.has_password ? <KeyRound className="h-4 w-4" /> : <PermIcon className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {link.label ? `${link.label} · ` : ""}
            {perm.label}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{meta.join(" · ")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="sm"
            variant={highlight ? "default" : "outline"}
            onClick={async () => {
              if (await copy(linkUrl(link.token))) {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1800);
              } else toast.error("Copie impossible : sélectionnez le lien manuellement.");
            }}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copié" : "Copier"}
          </Button>
          <Button size="icon-sm" variant="ghost" aria-label="Modifier le lien" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Révoquer le lien"
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await revokeLinkAction(link.id);
                if (r.ok) {
                  toast.show("Lien révoqué : il ne fonctionne plus.");
                  onRevoked();
                } else toast.error(r.message);
              })
            }
          >
            {pending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
    </li>
  );
}

function LinkForm({
  target,
  link,
  onCancel,
  onSaved,
}: {
  target: ShareTarget;
  link?: DriveLink;
  onCancel?: () => void;
  onSaved: (token?: string) => void;
}) {
  const [permission, setPermission] = useState<LinkPermission>(link ? permissionOf(link) : "download");
  const [expiry, setExpiry] = useState<string>(link?.expires_at ? "custom" : "never");
  const [customDate, setCustomDate] = useState(link?.expires_at ? link.expires_at.slice(0, 10) : "");
  const [usePassword, setUsePassword] = useState(Boolean(link?.has_password));
  const [password, setPassword] = useState("");
  const [label, setLabel] = useState(link?.label ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const options = PERMISSIONS.filter((p) => target.kind !== "file" || p.files);
  const [minDate] = useState(() => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (usePassword && !link?.has_password && password.trim().length < 4) {
      setError("Choisissez un mot de passe d'au moins 4 caractères.");
      return;
    }
    if (expiry === "custom" && !customDate) {
      setError("Choisissez une date d'expiration.");
      return;
    }
    start(async () => {
      const expiresAt = expiresFrom(expiry, customDate);
      if (link) {
        const r = await updateLinkAction(link.id, {
          permission,
          expiresAt,
          clearExpiry: expiry === "never",
          password: !usePassword ? (link.has_password ? "" : null) : password.trim() ? password.trim() : null,
          label,
        });
        if (!r.ok) return setError(r.message);
        onSaved();
      } else {
        const r = await createLinkAction({
          workspaceId: target.workspaceId,
          folderId: target.folderId,
          documentId: target.documentId,
          permission,
          expiresAt,
          password: usePassword ? password : null,
          label,
        });
        if (!r.ok) return setError(r.message);
        onSaved(r.token);
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-border bg-canvas/60 p-4">
      <div>
        <p className="mb-2 text-sm font-medium">Ce que la personne peut faire</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {options.map((p) => {
            const Icon = p.icon;
            const on = permission === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPermission(p.id)}
                aria-pressed={on}
                className={cn(
                  "flex items-start gap-2.5 rounded-lg border bg-white p-2.5 text-left transition-all",
                  on ? "border-primary ring-2 ring-primary/15" : "border-border hover:border-slate-300"
                )}
              >
                <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", on ? "text-primary" : "text-muted-foreground")} />
                <span>
                  <span className="block text-sm font-medium leading-tight">{p.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{p.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">Expiration</span>
          <select
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            className="mt-1.5 h-9 w-full rounded-md border border-input bg-white px-2.5 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
          >
            {EXPIRY.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </label>
        {expiry === "custom" ? (
          <label className="block">
            <span className="text-sm font-medium">Jusqu&apos;au</span>
            <Input type="date" min={minDate} value={customDate} onChange={(e) => setCustomDate(e.target.value)} className="mt-1.5 h-9 bg-white" />
          </label>
        ) : (
          <label className="block">
            <span className="text-sm font-medium">
              Nom du lien <span className="font-normal text-muted-foreground">(facultatif)</span>
            </span>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex. Cabinet comptable" maxLength={120} className="mt-1.5 h-9 bg-white" />
          </label>
        )}
      </div>

      <div>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
          <input
            type="checkbox"
            checked={usePassword}
            onChange={(e) => setUsePassword(e.target.checked)}
            className="h-4 w-4 rounded border-input accent-[var(--primary)]"
          />
          Protéger par un mot de passe
        </label>
        {usePassword && (
          <Input
            type="text"
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={link?.has_password ? "Laisser vide pour garder l'actuel" : "Au moins 4 caractères"}
            className="mt-2 h-9 bg-white"
            maxLength={100}
          />
        )}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            Annuler
          </Button>
        )}
        <Button type="submit" disabled={pending}>
          {pending && <LoaderCircle className="h-4 w-4 animate-spin" />}
          {link ? "Enregistrer" : "Créer le lien"}
        </Button>
      </div>
    </form>
  );
}

// -----------------------------------------------------------------------------
// Personnes invitées (espace)
// -----------------------------------------------------------------------------

function PeoplePanel({ workspaceId }: { workspaceId: string }) {
  const toast = useToast();
  const [data, setData] = useState<{ guests: SpaceGuest[]; invites: PendingGuestInvite[] } | null>(null);
  const [email, setEmail] = useState("");
  const [level, setLevel] = useState<AccessLevel>("editor");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const load = useCallback(async () => {
    setData(await listSpaceGuestsAction(workspaceId));
  }, [workspaceId]);

  useEffect(() => {
    let cancelled = false;
    listSpaceGuestsAction(workspaceId).then((d) => {
      if (!cancelled) setData(d);
    });
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  function invite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInviteLink(null);
    start(async () => {
      const r = await inviteGuestAction({ workspaceId, email, level });
      if (!r.ok) return setError(r.message);
      setEmail("");
      if (r.mode === "granted") {
        toast.show("Accès ouvert : la personne voit déjà cet espace.");
      } else {
        const url = `${window.location.origin}/invite/${r.token}`;
        setInviteLink(url);
        if (await copy(url)) toast.show("Invitation créée, lien copié.");
      }
      await load();
    });
  }

  return (
    <div className="space-y-5">
      <form onSubmit={invite} className="space-y-2">
        <p className="text-sm font-medium">Inviter une personne extérieure</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@entreprise.fr"
              className="h-10 pl-9"
            />
          </div>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as AccessLevel)}
            className="h-10 rounded-md border border-input bg-white px-2.5 text-sm"
            aria-label="Niveau d'accès"
          >
            <option value="editor">Peut modifier</option>
            <option value="viewer">Lecture seule</option>
          </select>
          <Button type="submit" className="h-10" disabled={pending || !email.trim()}>
            {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Inviter
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Les invités ne voient que cet espace. Ils sont gratuits et illimités.
        </p>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {inviteLink && (
          <div className="rounded-lg border border-primary/30 bg-primary-subtle/60 p-3 text-sm">
            <p className="font-medium">Envoyez ce lien à la personne invitée</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Valable 14 jours. Elle crée son compte ou se connecte, puis arrive dans l&apos;espace.</p>
            <div className="mt-2 flex gap-2">
              <Input readOnly value={inviteLink} className="h-9 bg-white font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
              <Button size="sm" className="h-9" onClick={() => copy(inviteLink).then((ok) => ok && toast.show("Lien copié."))}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </form>

      {data === null ? (
        <div className="flex justify-center py-4">
          <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : data.guests.length + data.invites.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          Personne n&apos;est encore invité dans cet espace.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {data.guests.map((g) => (
            <li key={g.accessId} className="flex items-center gap-3 px-3.5 py-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-50 text-xs font-semibold text-violet-700">
                {(g.name || "?").slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{g.name}</p>
                {g.email && g.email !== g.name && <p className="truncate text-xs text-muted-foreground">{g.email}</p>}
              </div>
              <select
                value={g.level}
                aria-label={`Niveau d'accès de ${g.name}`}
                onChange={async (e) => {
                  const r = await setGuestLevelAction(g.accessId, e.target.value as AccessLevel);
                  if (!r.ok) toast.error(r.message);
                  await load();
                }}
                className="h-8 rounded-md border border-input bg-white px-2 text-xs"
              >
                <option value="editor">Peut modifier</option>
                <option value="viewer">Lecture seule</option>
              </select>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Retirer ${g.name}`}
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={async () => {
                  const r = await removeGuestAccessAction(g.accessId);
                  if (r.ok) toast.show(`${g.name} n'a plus accès à cet espace.`);
                  else toast.error(r.message);
                  await load();
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
          {data.invites.map((i) => (
            <li key={i.id} className="flex items-center gap-3 px-3.5 py-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-canvas text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{i.email ?? "Invitation"}</p>
                <p className="text-xs text-muted-foreground">
                  En attente · {i.level === "viewer" ? "lecture seule" : "peut modifier"} · expire le {formatDate(i.expires_at)}
                </p>
              </div>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Copier le lien d'invitation"
                onClick={() => copy(`${window.location.origin}/invite/${i.token}`).then((ok) => ok && toast.show("Lien d'invitation copié."))}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Annuler l'invitation"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={async () => {
                  const r = await cancelGuestInviteAction(i.id);
                  if (!r.ok) toast.error(r.message);
                  await load();
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
