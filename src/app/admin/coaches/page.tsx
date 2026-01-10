'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { logger } from '@/lib/logger'

interface Coach {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  invited_at: string;
  password_set_at: string | null;
}

export default function AdminCoachesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated' || (session && session.user.role !== 'admin')) {
      router.push('/admin/login');
    } else if (status === 'authenticated') {
      fetchCoaches();
    }
  }, [status, session, router]);

  const fetchCoaches = async () => {
    try {
      const response = await fetch('/api/admin/coaches');
      const data = await response.json();

      if (response.ok) {
        setCoaches(data.coaches || []);
      }
    } catch (error) {
      logger.error('Error fetching coaches:', error as Error, { component: 'coaches' });
    } finally {
      setLoading(false);
    }
  };

  const handleInviteCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess('');
    setInviteLoading(true);

    try {
      const response = await fetch('/api/admin/invite-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: inviteName, email: inviteEmail })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to invite coach');
      }

      setInviteSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteUrl(data.inviteUrl);
      setInviteName('');
      setInviteEmail('');
      fetchCoaches();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to send invitation");
    } finally {
      setInviteLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-smart-blue-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-oxford-navy">Manage Coaches</h1>
          <p className="text-gray-600 mt-1">Invite and manage coach accounts</p>
        </div>
        <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
          <DialogTrigger asChild>
            <Button className="bg-smart-blue-500 hover:bg-smart-blue-600">
              Invite Coach
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Coach</DialogTitle>
              <DialogDescription>
                Send an invitation to a new coach
              </DialogDescription>
            </DialogHeader>

            {inviteError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{inviteError}</AlertDescription>
              </Alert>
            )}

            {inviteSuccess && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {inviteSuccess}
                  {inviteUrl && (
                    <div className="mt-2 p-2 bg-white rounded border border-green-200">
                      <p className="text-xs font-medium mb-1">Invite URL:</p>
                      <p className="text-xs break-all">{inviteUrl}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        (Send this link to the coach to set their password)
                      </p>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleInviteCoach} className="space-y-4">
              <div>
                <Label htmlFor="name">Coach Name</Label>
                <Input
                  id="name"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="john@example.com"
                  required
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteError('');
                    setInviteSuccess('');
                    setInviteUrl('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={inviteLoading}
                  className="bg-smart-blue-500 hover:bg-smart-blue-600"
                >
                  {inviteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Invitation
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coaches</CardTitle>
          <CardDescription>
            {coaches.length} {coaches.length === 1 ? 'coach' : 'coaches'} registered
          </CardDescription>
        </CardHeader>
        <CardContent>
          {coaches.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No coaches yet</p>
              <p className="text-sm text-gray-400">Invite your first coach to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invited</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coaches.map((coach) => (
                  <TableRow key={coach.id}>
                    <TableCell className="font-medium">{coach.name}</TableCell>
                    <TableCell>{coach.email}</TableCell>
                    <TableCell>
                      {coach.password_set_at ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-orange-300 text-orange-700">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {new Date(coach.invited_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
