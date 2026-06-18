import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { AuthUser, Magasin, MagasinInput, Societe } from '@/shared/ipc';

interface Props {
  user: AuthUser;
  onChanged?: () => void;
}

export function MagasinsModule({ user, onChanged }: Props): React.JSX.Element {
  const isAdmin = user.role === 'Admin';
  const [rows, setRows] = useState<Magasin[]>([]);
  const [societes, setSocietes] = useState<Societe[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Magasin | null>(null);
  const [form, setForm] = useState<MagasinInput>({ libelle: '', societe_id: 0 });
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const societeName = (id: number) => societes.find((s) => s.id === id)?.raison_sociale ?? '—';

  async function load() {
    setLoading(true);
    const [mRes, sRes] = await Promise.all([window.api.magasins.list(), window.api.societes.list()]);
    if (mRes.success) setRows(mRes.data); else toast.error(mRes.error.message);
    if (sRes.success) setSocietes(sRes.data);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm({ libelle: '', societe_id: societes[0]?.id ?? 0 });
    setFormError(null);
    setOpen(true);
  }
  function openEdit(m: Magasin) {
    setEditing(m);
    setForm({ libelle: m.libelle, societe_id: m.societe_id });
    setFormError(null);
    setOpen(true);
  }

  async function save() {
    // Validation client minimale
    if (!form.libelle.trim()) { setFormError('Le libellé est requis.'); return; }
    if (!form.societe_id) { setFormError('Veuillez choisir une société.'); return; }
    setSaving(true);
    const res = editing
      ? await window.api.magasins.update(editing.id, form)
      : await window.api.magasins.create(form);
    setSaving(false);
    if (!res.success) {
      if (res.error.code === 'VALIDATION') { setFormError(res.error.message); return; }
      toast.error(res.error.message);
      return;
    }
    toast.success(editing ? 'Magasin modifié.' : 'Magasin créé — plan comptable initialisé (117 comptes).');
    setOpen(false);
    await load();
    onChanged?.();
  }

  async function confirmDelete() {
    if (deleteId === null) return;
    const res = await window.api.magasins.delete(deleteId);
    setDeleteId(null);
    if (!res.success) { toast.error(res.error.message); return; }
    toast.success('Magasin supprimé.');
    await load();
    onChanged?.();
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Magasins</h2>
        {isAdmin && <Button onClick={openCreate}><Plus size={16} /> Nouveau magasin</Button>}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Libellé</TableHead>
            <TableHead>Société</TableHead>
            {isAdmin && <TableHead className="w-24 text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && (
            <TableRow><TableCell colSpan={3} className="text-muted-foreground">Chargement…</TableCell></TableRow>
          )}
          {!loading && rows.length === 0 && (
            <TableRow><TableCell colSpan={3} className="text-muted-foreground">Aucun magasin.</TableCell></TableRow>
          )}
          {rows.map((m) => (
            <TableRow key={m.id}>
              <TableCell className="font-semibold">{m.libelle}</TableCell>
              <TableCell>{societeName(m.societe_id)}</TableCell>
              {isAdmin && (
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon-sm" onClick={() => openEdit(m)} aria-label="Modifier">
                    <Pencil size={15} />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => setDeleteId(m.id)} aria-label="Supprimer">
                    <Trash2 size={15} />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier le magasin' : 'Nouveau magasin'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="lib">Libellé</Label>
              <Input id="lib" value={form.libelle} autoFocus
                onChange={(e) => { setFormError(null); setForm({ ...form, libelle: e.target.value }); }} />
            </div>
            <div className="grid gap-1.5">
              <Label>Société</Label>
              <Select value={form.societe_id ? String(form.societe_id) : undefined}
                onValueChange={(v) => { setFormError(null); setForm({ ...form, societe_id: Number(v) }); }}>
                <SelectTrigger><SelectValue placeholder="Choisir une société" /></SelectTrigger>
                <SelectContent>
                  {societes.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.raison_sociale}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!editing && (
              <p className="text-xs text-muted-foreground">
                Le plan comptable SYSCOHADA sera initialisé automatiquement pour ce magasin.
              </p>
            )}
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le magasin ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le magasin et son plan comptable seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void confirmDelete()}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
