import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Search, Wifi, WifiOff, Settings } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'wouter';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { Studio } from '@shared/schema';

export default function StudiosListPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  // Fetch all studios
  const { data: studios, isLoading, error } = useQuery<Studio[]>({
    queryKey: ['/api/studios'],
  });

  // Delete studio mutation
  const deleteStudioMutation = useMutation({
    mutationFn: (studioId: string) => apiRequest(`/api/studios/${studioId}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/studios'] });
      queryClient.invalidateQueries({ queryKey: ['/api/streams'] });
      toast({
        title: 'Studio deleted',
        description: 'The studio and all its streams have been successfully deleted.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete studio',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg" data-testid="text-loading-studios">Loading studios...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-red-400 text-lg" data-testid="text-error-studios">
            Failed to load studios: {(error as any).message || 'Unknown error'}
          </div>
        </div>
      </div>
    );
  }

  // Filter studios based on search query
  const filteredStudios = studios?.filter(studio =>
    studio.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    studio.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    studio.status.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <Wifi className="w-4 h-4" />;
      case 'offline':
        return <WifiOff className="w-4 h-4" />;
      case 'maintenance':
        return <Settings className="w-4 h-4" />;
      default:
        return <WifiOff className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500 text-white';
      case 'offline':
        return 'bg-red-500 text-white';
      case 'maintenance':
        return 'bg-yellow-500 text-black';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto" data-testid="admin-studios-page">
      <Card className="hover-elevate">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">Manage Studios</CardTitle>
            <Button asChild data-testid="button-add-studio">
              <Link href="/admin/studios/new">
                <Plus className="w-4 h-4 mr-2" />
                Add Studio
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search Bar */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search studios..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-studios"
              />
            </div>
            <div className="text-sm text-muted-foreground" data-testid="text-studios-count">
              {filteredStudios.length} of {studios?.length || 0} studios
            </div>
          </div>

          {/* Studios Table */}
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Preview</TableHead>
                  <TableHead>Studio Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Feed Count</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? 'No studios match your search' : 'No studios found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudios.map((studio) => (
                    <TableRow key={studio.id} data-testid={`row-studio-${studio.id}`}>
                      <TableCell>
                        <img
                          src={studio.thumbnail}
                          alt={studio.name}
                          className="w-16 h-9 object-cover rounded"
                          data-testid={`img-thumbnail-${studio.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{studio.name}</TableCell>
                      <TableCell className="max-w-xs truncate">{studio.description}</TableCell>
                      <TableCell>
                        <Badge
                          className={`flex items-center gap-1 w-fit ${getStatusColor(studio.status)}`}
                          data-testid={`badge-status-${studio.id}`}
                        >
                          {getStatusIcon(studio.status)}
                          {studio.status.charAt(0).toUpperCase() + studio.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{studio.feedCount}</span> feeds
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            data-testid={`button-edit-${studio.id}`}
                          >
                            <Link href={`/admin/studios/edit/${studio.id}`}>
                              <Edit className="w-4 h-4" />
                            </Link>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                                data-testid={`button-delete-${studio.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Studio</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{studio.name}"? This will also delete all associated streams and cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel data-testid={`button-cancel-delete-${studio.id}`}>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteStudioMutation.mutate(studio.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  data-testid={`button-confirm-delete-${studio.id}`}
                                >
                                  Delete Studio & Streams
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}