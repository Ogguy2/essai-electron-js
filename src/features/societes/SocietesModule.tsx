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
import type { AuthUser, Societe, SocieteInput } from '@/shared/ipc';

const EMPTY: SocieteInput = { raison_sociale: '', rccm: '', adresse: '', telephone: '' };

interface Props {
  user: AuthUser;
  onChanged?: () => void;
}

export function SocietesModule({ user, onChanged }: Props): React.JSX.Element {
  const isAdmin = user.role === 'Admin';
  const [rows, setRows] = useState<Societe[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Societe | null>(null);
  const [form, setForm] = useState<SocieteInput>(EMPTY);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await window.api.societes.list();
    if (res.success) setRows(res.data);
    else toast.error(res.error.message);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }
  function openEdit(s: Societe) {
    setEditing(s);
    setForm({ raison_sociale: s.raison_sociale, rccm: s.rccm, adresse: s.adresse, telephone: s.telephone });
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    const res = editing
      ? await window.api.societes.update(editing.id, form)
      : await window.api.societes.create(form);
    setSaving(false);
    if (!res.success) { toast.error(res.error.message); return; }
    toast.success(editing ? 'Société modifiée.' : 'Société créée.');
    setOpen(false);
    await load();
    onChanged?.();
  }

  async function remove(s: Societe) {
    if (!confirm(`Supprimer « ${s.raison_sociale} » ?`)) return;
    const res = await window.api.societes.delete(s.id);
    if (!res.success) { toast.error(res.error.message); return; }
    toast.success('Société supprimée.');
    await load();
    onChanged?.();
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Sociétés</h2>
        {isAdmin && (
          <Button onClick={openCreate}><Plus size={16} /> Nouvelle société</Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Raison sociale</TableHead>
            <TableHead>RCCM</TableHead>
            <TableHead>Adresse</TableHead>
            <TableHead>Téléphone</TableHead>
            {isAdmin && <TableHead className="w-24 text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && (
            <TableRow><TableCell colSpan={5} className="text-muted-foreground">Chargement…</TableCell></TableRow>
          )}
          {!loading && rows.length === 0 && (
            <TableRow><TableCell colSpan={5} className="text-muted-foreground">Aucune société.</TableCell></TableRow>
          )}
          {rows.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-semibold">{s.raison_sociale}</TableCell>
              <TableCell>{s.rccm}</TableCell>
              <TableCell>{s.adresse}</TableCell>
              <TableCell>{s.telephone}</TableCell>
              {isAdmin && (
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon-sm" onClick={() => openEdit(s)} aria-label="Modifier">
                    <Pencil size={15} />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => void remove(s)} aria-label="Supprimer">
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
            <DialogTitle>{editing ? 'Modifier la société' : 'Nouvelle société'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="rs">Raison sociale</Label>
              <Input id="rs" value={form.raison_sociale}
                onChange={(e) => setForm({ ...form, raison_sociale: e.target.value })} autoFocus />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="rccm">RCCM</Label>
              <Input id="rccm" value={form.rccm} onChange={(e) => setForm({ ...form, rccm: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="adr">Adresse</Label>
              <Input id="adr" value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tel">Téléphone</Label>
              <Input id="tel" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
