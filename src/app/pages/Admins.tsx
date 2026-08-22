import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  Crown,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Phone,
  Plus,
  Shield,
  ShieldCheck,
  UserCog,
  UserPlus,
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { toast } from 'sonner';
import { api, type AdminAccount } from '../lib/api';
import { withStepUp } from '../components/security/StepUpDialog';
import { useAuth } from '../contexts/AuthContext';
import { EmptyState, Initials, RowSkeleton, StatTile } from '../components/coupons/CouponAtoms';

interface PermissionCatalog {
  permissions: Array<{ key: string; resource: string; action: string; description: string }>;
  roles: Array<{ name: string; description: string | null; permissions: string[] }>;
  presets: Array<{ name: string; description: string; permissions: string[] }>;
}

const ROLE_LABELS: Record<string, string> = {
  'super-admin': 'Super Admin',
  admin: 'Administrator',
  'finance-admin': 'Finance',
  'dispatch-admin': 'Dispatch',
  operator: 'Operator',
};

const RESOURCE_LABELS: Record<string, string> = {
  rides: 'Rides & dispatch',
  drivers: 'Drivers',
  coupons: 'Coupons',
  operators: 'Operators',
  admins: 'Administrators',
  analytics: 'Analytics',
  call_logs: 'Call logs',
  settings: 'Settings',
};

/**
 * Administrator accounts and what each of them may do.
 *
 * Exactly one account holds the Super Admin role — the database enforces that
 * with a partial unique index, so this screen offers *transfer*, never a second
 * grant. Everyone else is composed from roles, and the matrix below shows the
 * resulting capabilities rather than making anyone infer them from role names.
 */
export default function Admins() {
  const { isSuperAdmin, refreshPermissions } = useAuth();
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [catalog, setCatalog] = useState<PermissionCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AdminAccount | null>(null);
  const [transferTarget, setTransferTarget] = useState<AdminAccount | null>(null);

  const load = useCallback(async () => {
    try {
      const [list, cat] = await Promise.all([api.admins.list(), api.admins.catalog()]);
      setAdmins(list.admins ?? []);
      setCatalog(cat);
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not load administrators');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(
    () => ({
      total: admins.length,
      active: admins.filter((a) => a.isActive).length,
      restricted: admins.filter((a) => !a.isSuperAdmin && a.permissions.length < (catalog?.permissions.length ?? 0)).length,
    }),
    [admins, catalog]
  );

  if (!isSuperAdmin && !loading && admins.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Lock}
          title="Super Admin access required"
          description="Only the Super Admin can create administrators and change permission sets."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Administrators</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create administrator accounts and choose exactly what each of them can reach.
          </p>
        </div>
        <Button className="bg-[#00BDC3] text-white hover:bg-[#009EA3]" onClick={() => setCreateOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" /> New administrator
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Administrators" value={stats.total} hint="Including the Super Admin" icon={UserCog} />
        <StatTile
          label="Active"
          value={stats.active}
          hint={stats.total - stats.active > 0 ? `${stats.total - stats.active} deactivated` : 'All can sign in'}
          icon={ShieldCheck}
          accent="#10B981"
        />
        <StatTile
          label="Restricted"
          value={stats.restricted}
          hint="Hold a limited permission set"
          icon={KeyRound}
          accent="#6366F1"
        />
      </div>

      {loading ? (
        <RowSkeleton rows={3} />
      ) : (
        <div className="space-y-3">
          {admins.map((admin) => (
            <AdminRow
              key={admin.id}
              admin={admin}
              catalogSize={catalog?.permissions.length ?? 0}
              onEdit={() => setEditing(admin)}
              onTransfer={() => setTransferTarget(admin)}
              onChanged={load}
            />
          ))}
        </div>
      )}

      <CreateAdminDialog
        open={createOpen}
        roles={catalog?.roles ?? []}
        onClose={() => setCreateOpen(false)}
        onDone={load}
      />
      <PermissionsDialog
        admin={editing}
        catalog={catalog}
        onClose={() => setEditing(null)}
        onDone={async () => {
          await load();
          await refreshPermissions();
        }}
      />

      <AlertDialog open={!!transferTarget} onOpenChange={(open) => !open && setTransferTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transfer the Super Admin role?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{transferTarget?.name}</strong> becomes the Super Admin with unrestricted access, and you are
              demoted to a standard administrator. Exactly one account can hold this role, so this cannot be undone
              from your side — only the new Super Admin can transfer it back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#EF4444] text-white hover:bg-[#DC2626]"
              onClick={async () => {
                if (!transferTarget) return;
                try {
                  await withStepUp('super_admin_transfer', () =>
                    api.admins.transferSuperAdmin(transferTarget.id)
                  );
                  toast.success(`${transferTarget.name} is now the Super Admin`);
                  setTransferTarget(null);
                  await load();
                  await refreshPermissions();
                } catch (e: any) {
                  toast.error(e?.message ?? 'Transfer failed');
                }
              }}
            >
              Transfer role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AdminRow({
  admin,
  catalogSize,
  onEdit,
  onTransfer,
  onChanged,
}: {
  admin: AdminAccount;
  catalogSize: number;
  onEdit: () => void;
  onTransfer: () => void;
  onChanged: () => void;
}) {
  const [saving, setSaving] = useState(false);

  const toggleActive = async (isActive: boolean) => {
    setSaving(true);
    try {
      await api.admins.update(admin.id, { isActive });
      toast.success(isActive ? `${admin.name} reactivated` : `${admin.name} deactivated`);
      onChanged();
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not update the account');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className={`border-border/70 transition-opacity ${admin.isActive ? '' : 'opacity-60'}`}>
      <CardContent className="flex flex-wrap items-center gap-4 p-4">
        <div className="relative">
          <Initials name={admin.name} />
          {admin.isSuperAdmin && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#F59E0B] ring-2 ring-background">
              <Crown className="h-3 w-3 text-white" />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">{admin.name}</p>
            {admin.isSuperAdmin ? (
              <Badge className="gap-1 bg-[#F59E0B] text-white hover:bg-[#F59E0B]">
                <Crown className="h-3 w-3" /> Super Admin
              </Badge>
            ) : (
              admin.roles.map((role) => (
                <Badge key={role} variant="outline" className="text-[10px] uppercase tracking-wide">
                  {ROLE_LABELS[role] ?? role}
                </Badge>
              ))
            )}
            {!admin.isActive && (
              <Badge variant="outline" className="border-[#EF4444]/40 text-[10px] uppercase tracking-wide text-[#DC2626] dark:text-[#F87171]">
                Deactivated
              </Badge>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {admin.email}
            </span>
            {admin.phone && (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {admin.phone}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Shield className="h-3 w-3" />
              <span className="tabular-nums">
                {admin.isSuperAdmin ? catalogSize || 'all' : admin.permissions.length}
              </span>{' '}
              permissions
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!admin.isSuperAdmin && (
            <>
              <div className="flex items-center gap-2 pr-1">
                <span className="text-xs text-muted-foreground">{admin.isActive ? 'Active' : 'Off'}</span>
                <Switch checked={admin.isActive} disabled={saving} onCheckedChange={toggleActive} />
              </div>
              <Button size="sm" variant="outline" onClick={onEdit}>
                <KeyRound className="mr-1.5 h-4 w-4" /> Permissions
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-[#B45309] hover:bg-[#F59E0B]/10 dark:text-[#FBBF24]"
                onClick={onTransfer}
                disabled={!admin.isActive}
                title={admin.isActive ? 'Make this account the Super Admin' : 'Reactivate the account first'}
              >
                <Crown className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CreateAdminDialog({
  open,
  roles,
  onClose,
  onDone,
}: {
  open: boolean;
  roles: PermissionCatalog['roles'];
  onClose: () => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', department: '' });
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['admin']);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ name: '', email: '', password: '', phone: '', department: '' });
      setSelectedRoles(['admin']);
    }
  }, [open]);

  // The Super Admin role is transferred, never granted at creation.
  const assignable = roles.filter((r) => r.name !== 'super-admin');
  const valid = form.name.trim().length >= 2 && /\S+@\S+\.\S+/.test(form.email) && form.password.length >= 8;

  const submit = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await api.admins.create({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone || undefined,
        department: form.department || undefined,
        roles: selectedRoles.length ? selectedRoles : ['admin'],
      });
      toast.success(`${form.name} can now sign in`);
      onClose();
      onDone();
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not create the administrator');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>New administrator</DialogTitle>
          <DialogDescription>They sign in with this email and password, and can change it later.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="admin-name">Full name</Label>
            <Input
              id="admin-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Selam Bekele"
              autoFocus
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="selam@tokuma.et"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-phone">Phone</Label>
              <Input
                id="admin-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="0911 123456"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password">Temporary password</Label>
            <Input
              id="admin-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="At least 8 characters"
            />
            {form.password.length > 0 && form.password.length < 8 && (
              <p className="text-xs text-[#DC2626] dark:text-[#F87171]">
                {8 - form.password.length} more character{8 - form.password.length === 1 ? '' : 's'} needed.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Permission set</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {assignable.map((role) => {
                const checked = selectedRoles.includes(role.name);
                return (
                  <button
                    key={role.name}
                    type="button"
                    onClick={() =>
                      setSelectedRoles((prev) =>
                        checked ? prev.filter((r) => r !== role.name) : [...prev, role.name]
                      )
                    }
                    className={`rounded-xl border p-3 text-left transition-all ${
                      checked
                        ? 'border-[#00BDC3] bg-[#00BDC3]/10 ring-2 ring-[#00BDC3]/25'
                        : 'border-border hover:border-[#00BDC3]/50 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{ROLE_LABELS[role.name] ?? role.name}</p>
                      {checked && <Check className="h-4 w-4 shrink-0 text-[#00BDC3]" />}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {role.description ?? `${role.permissions.length} permissions`}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button className="bg-[#00BDC3] text-white hover:bg-[#009EA3]" onClick={submit} disabled={!valid || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create administrator
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PermissionsDialog({
  admin,
  catalog,
  onClose,
  onDone,
}: {
  admin: AdminAccount | null;
  catalog: PermissionCatalog | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (admin) setSelectedRoles(admin.roles.filter((r) => r !== 'super-admin'));
  }, [admin]);

  const assignable = (catalog?.roles ?? []).filter((r) => r.name !== 'super-admin');

  // The effective set is the union of the chosen roles — showing it resolved
  // means nobody has to reason about overlapping role definitions.
  const effective = useMemo(() => {
    const keys = new Set<string>();
    for (const roleName of selectedRoles) {
      const role = assignable.find((r) => r.name === roleName);
      role?.permissions.forEach((p) => keys.add(p));
    }
    return keys;
  }, [selectedRoles, assignable]);

  const byResource = useMemo(() => {
    const groups = new Map<string, PermissionCatalog['permissions']>();
    for (const p of catalog?.permissions ?? []) {
      groups.set(p.resource, [...(groups.get(p.resource) ?? []), p]);
    }
    return [...groups.entries()];
  }, [catalog]);

  const submit = async () => {
    if (!admin || selectedRoles.length === 0) return;
    setSaving(true);
    try {
      await api.admins.setRoles(admin.id, selectedRoles);
      toast.success(`Permissions updated for ${admin.name}`);
      onClose();
      onDone();
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not update permissions');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!admin} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Permissions — {admin?.name}</DialogTitle>
          <DialogDescription>
            Pick one or more roles. The matrix below shows what that actually grants.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="grid gap-2 sm:grid-cols-2">
            {assignable.map((role) => {
              const checked = selectedRoles.includes(role.name);
              return (
                <button
                  key={role.name}
                  type="button"
                  onClick={() =>
                    setSelectedRoles((prev) =>
                      checked ? prev.filter((r) => r !== role.name) : [...prev, role.name]
                    )
                  }
                  className={`rounded-xl border p-3 text-left transition-all ${
                    checked
                      ? 'border-[#00BDC3] bg-[#00BDC3]/10 ring-2 ring-[#00BDC3]/25'
                      : 'border-border hover:border-[#00BDC3]/50 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{ROLE_LABELS[role.name] ?? role.name}</p>
                    {checked && <Check className="h-4 w-4 shrink-0 text-[#00BDC3]" />}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{role.description}</p>
                </button>
              );
            })}
          </div>

          <div className="space-y-3 rounded-xl border border-border/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Effective access</p>
              <span className="text-xs tabular-nums text-muted-foreground">
                {effective.size} of {catalog?.permissions.length ?? 0}
              </span>
            </div>

            <div className="space-y-3">
              {byResource.map(([resource, permissions]) => (
                <div key={resource}>
                  <p className="text-[11px] font-medium uppercase tracking-[0.09em] text-muted-foreground">
                    {RESOURCE_LABELS[resource] ?? resource}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {permissions.map((p) => {
                      const granted = effective.has(p.key);
                      return (
                        <span
                          key={p.key}
                          title={p.description}
                          className={`rounded-md px-2 py-1 text-[11px] font-medium ring-1 transition-colors ${
                            granted
                              ? 'bg-[#10B981]/12 text-[#059669] ring-[#10B981]/30 dark:text-[#34D399]'
                              : 'bg-muted text-muted-foreground/70 ring-border'
                          }`}
                        >
                          {p.action.replace(/_/g, ' ')}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedRoles.length === 0 && (
            <p className="text-sm text-[#DC2626] dark:text-[#F87171]">
              Select at least one role — an administrator with no role cannot reach anything.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-[#00BDC3] text-white hover:bg-[#009EA3]"
            onClick={submit}
            disabled={selectedRoles.length === 0 || saving}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save permissions
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
