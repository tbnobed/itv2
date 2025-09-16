import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
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
import WebRTCPreview from '@/components/WebRTCPreview';
import type { Stream } from '@shared/schema';

interface GroupedStreams {
  featured: Stream[];
  overTheAir: Stream[];
  liveFeeds: Stream[];
  studios: Stream[];
  uhd: Stream[];
}

export default function StreamsListPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  // Fetch all streams
  const { data: streamData, isLoading, error } = useQuery<GroupedStreams>({
    queryKey: ['/api/streams'],
  });

  // Delete stream mutation
  const deleteStreamMutation = useMutation({
    mutationFn: (streamId: string) => apiRequest(`/api/streams/${streamId}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/streams'] });
      toast({
        title: 'Stream deleted',
        description: 'The stream has been successfully deleted.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete stream',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg" data-testid="text-loading-streams">Loading streams...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-red-400 text-lg" data-testid="text-error-streams">
            Failed to load streams: {(error as any).message || 'Unknown error'}
          </div>
        </div>
      </div>
    );
  }

  // Combine all streams for the table
  const allStreams = streamData ? [
    ...streamData.featured,
    ...streamData.overTheAir,
    ...streamData.liveFeeds,
    ...streamData.studios,
    ...streamData.uhd,
  ] : [];

  // Filter streams based on search query
  const filteredStreams = allStreams.filter(stream =>
    stream.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stream.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stream.streamId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'featured':
        return 'bg-primary text-primary-foreground';
      case 'overTheAir':
        return 'bg-blue-500 text-white';
      case 'liveFeeds':
        return 'bg-green-500 text-white';
      case 'studios':
        return 'bg-purple-500 text-white';
      case 'uhd':
        return 'bg-orange-500 text-white';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'overTheAir':
        return 'Over The Air';
      case 'liveFeeds':
        return 'Live Feeds';
      case 'uhd':
        return 'UHD Streams';
      default:
        return category.charAt(0).toUpperCase() + category.slice(1);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto" data-testid="admin-streams-page">
      <Card className="hover-elevate">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">Manage Streams</CardTitle>
            <Button asChild data-testid="button-add-stream">
              <Link href="/admin/streams/new">
                <Plus className="w-4 h-4 mr-2" />
                Add Stream
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
                placeholder="Search streams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-streams"
              />
            </div>
            <div className="text-sm text-muted-foreground" data-testid="text-streams-count">
              {filteredStreams.length} of {allStreams.length} streams
            </div>
          </div>

          {/* Streams Table */}
          <div className="border rounded-md max-h-[calc(100vh-300px)] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Preview</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Stream ID</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStreams.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? 'No streams match your search' : 'No streams found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStreams.map((stream) => (
                    <TableRow key={stream.id} data-testid={`row-stream-${stream.id}`}>
                      <TableCell>
                        <div className="w-16 h-9 rounded overflow-hidden">
                          <WebRTCPreview
                            streamUrl={stream.url}
                            streamId={stream.streamId}
                            className="w-full h-full"
                            fallbackImage={stream.thumbnail}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{stream.title}</TableCell>
                      <TableCell className="font-mono text-sm">{stream.streamId}</TableCell>
                      <TableCell>
                        <Badge
                          className={getCategoryColor(stream.category)}
                          data-testid={`badge-category-${stream.id}`}
                        >
                          {getCategoryLabel(stream.category)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate font-mono text-xs">
                        {stream.url}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            data-testid={`button-edit-${stream.id}`}
                          >
                            <Link href={`/admin/streams/edit/${stream.id}`}>
                              <Edit className="w-4 h-4" />
                            </Link>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                                data-testid={`button-delete-${stream.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Stream</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{stream.title}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel data-testid={`button-cancel-delete-${stream.id}`}>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteStreamMutation.mutate(stream.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  data-testid={`button-confirm-delete-${stream.id}`}
                                >
                                  Delete
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