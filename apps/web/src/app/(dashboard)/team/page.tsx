"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Users, MoreHorizontal, Trash2, Shield } from "lucide-react";
import { toast } from "sonner";
import { listUsers, inviteUser, removeUser, updateUserRole, getInvitations } from "@/lib/api/users";
import { QUERY_KEYS } from "@/lib/utils/constants";
import { formatRelativeTime } from "@/lib/utils/format";
import { PageHeader } from "@/components/layout/page-header";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";

export default function TeamPage() {
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState<any>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");

  const { data: users, isLoading } = useQuery({ queryKey: QUERY_KEYS.USERS, queryFn: listUsers });

  const inviteMut = useMutation({
    mutationFn: () => inviteUser(inviteEmail, inviteRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USERS });
      toast.success("Invitation sent");
      setInviteOpen(false);
      setInviteEmail("");
    },
    onError: (err: any) => toast.error(err.message || "Failed to send invite"),
  });

  const removeMut = useMutation({
    mutationFn: (userId: string) => removeUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USERS });
      toast.success("User removed");
      setDeleteUser(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const roleMut = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USERS });
      toast.success("Role updated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <Breadcrumbs />
      <PageHeader title="Team" description="Manage team members and access">
        <Button variant="brand" onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4" /> Invite
        </Button>
      </PageHeader>

      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : !users?.length ? (
        <EmptyState icon={Users} title="No team members" description="Invite your first team member." action={{ label: "Invite", onClick: () => setInviteOpen(true) }} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {users.map((user) => (
                <div key={user.id} className="flex items-center gap-4 p-4">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-xs">
                      {user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <Badge variant={user.role === "ADMIN" ? "default" : "secondary"} className="text-[10px]">
                    {user.role}
                  </Badge>
                  {user.lastLoginAt && (
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      {formatRelativeTime(user.lastLoginAt)}
                    </span>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => roleMut.mutate({ userId: user.id, role: user.role === "ADMIN" ? "MEMBER" : "ADMIN" })}>
                        <Shield className="h-4 w-4 mr-2" />
                        {user.role === "ADMIN" ? "Demote to Member" : "Promote to Admin"}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => setDeleteUser(user)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Invite Team Member</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colleague@company.com" type="email" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">Member</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button variant="brand" onClick={() => inviteMut.mutate()} disabled={!inviteEmail || inviteMut.isPending}>
              {inviteMut.isPending ? "Sending..." : "Send Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteUser}
        onOpenChange={(open) => !open && setDeleteUser(null)}
        title="Remove Team Member"
        description={`Remove ${deleteUser?.name}? They will lose access to the platform.`}
        confirmLabel="Remove"
        variant="destructive"
        loading={removeMut.isPending}
        onConfirm={() => deleteUser && removeMut.mutate(deleteUser.id)}
      />
    </div>
  );
}
