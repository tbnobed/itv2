import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, Upload } from 'lucide-react';
import { Link } from 'wouter';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { insertStreamSchema, type Stream, type Studio } from '@shared/schema';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

// Enhanced form schema with additional validation
const streamFormSchema = insertStreamSchema.extend({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  streamId: z.string().min(1, 'Stream ID is required').max(20, 'Stream ID too long'),
  url: z.string().url('Must be a valid URL').startsWith('webrtc://', 'Must be a WebRTC URL'),
  thumbnail: z.string().url('Must be a valid image URL'),
  category: z.enum(['featured', 'overTheAir', 'liveFeeds', 'studios'], {
    required_error: 'Category is required',
  }),
  studioId: z.string().optional(),
});

type StreamFormData = z.infer<typeof streamFormSchema>;

export default function StreamFormPage() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isEditing = !!id;

  // Fetch stream data if editing
  const { data: stream, isLoading: streamLoading } = useQuery<Stream>({
    queryKey: ['/api/streams', id],
    queryFn: () => apiRequest(`/api/streams/${id}`),
    enabled: isEditing,
  });

  // Fetch studios for dropdown
  const { data: studios } = useQuery<Studio[]>({
    queryKey: ['/api/studios'],
  });

  const form = useForm<StreamFormData>({
    resolver: zodResolver(streamFormSchema),
    defaultValues: {
      title: '',
      streamId: '',
      url: '',
      thumbnail: '',
      category: 'featured',
      studioId: '',
    },
  });

  // Update form when stream data loads
  useEffect(() => {
    if (stream && isEditing) {
      form.reset({
        title: stream.title,
        streamId: stream.streamId,
        url: stream.url,
        thumbnail: stream.thumbnail,
        category: stream.category as any,
        studioId: stream.studioId || '',
      });
    }
  }, [stream, isEditing, form]);

  // Create/update mutations
  const createStreamMutation = useMutation({
    mutationFn: (data: StreamFormData) => apiRequest('/api/streams', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/streams'] });
      toast({
        title: 'Stream created',
        description: 'The stream has been successfully created.',
      });
      navigate('/admin/streams');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create stream',
        variant: 'destructive',
      });
    },
  });

  const updateStreamMutation = useMutation({
    mutationFn: (data: StreamFormData) => apiRequest(`/api/streams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/streams'] });
      toast({
        title: 'Stream updated',
        description: 'The stream has been successfully updated.',
      });
      navigate('/admin/streams');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update stream',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: StreamFormData) => {
    // Clean up studioId for non-studio categories
    const cleanData = {
      ...data,
      studioId: data.category === 'studios' ? data.studioId : undefined,
    };

    if (isEditing) {
      updateStreamMutation.mutate(cleanData);
    } else {
      createStreamMutation.mutate(cleanData);
    }
  };

  const categoryOptions = [
    { value: 'featured', label: 'Featured' },
    { value: 'overTheAir', label: 'Over The Air' },
    { value: 'liveFeeds', label: 'Live Feeds' },
    { value: 'studios', label: 'Studios' },
  ];

  if (streamLoading && isEditing) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg" data-testid="text-loading-stream">Loading stream...</div>
        </div>
      </div>
    );
  }

  const isLoading = createStreamMutation.isPending || updateStreamMutation.isPending;

  return (
    <div className="p-6 max-w-4xl mx-auto" data-testid="admin-stream-form-page">
      <Card className="hover-elevate">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild data-testid="button-back-to-streams">
              <Link href="/admin/streams">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Streams
              </Link>
            </Button>
            <CardTitle className="text-2xl font-bold">
              {isEditing ? 'Edit Stream' : 'Add New Stream'}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stream Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Main Studio Camera"
                          data-testid="input-title"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="streamId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stream ID</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., CAM001"
                          className="font-mono"
                          data-testid="input-stream-id"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* URL and Thumbnail */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WebRTC Stream URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="webrtc://localhost:1985/live/stream-name"
                          className="font-mono"
                          data-testid="input-url"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="thumbnail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Thumbnail URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="/generated_images/thumbnail.png"
                          data-testid="input-thumbnail"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                      {field.value && (
                        <div className="mt-2">
                          <img
                            src={field.value}
                            alt="Thumbnail preview"
                            className="w-32 h-18 object-cover rounded border"
                          />
                        </div>
                      )}
                    </FormItem>
                  )}
                />
              </div>

              {/* Category and Studio */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        data-testid="select-category"
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categoryOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch('category') === 'studios' && (
                  <FormField
                    control={form.control}
                    name="studioId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Studio</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          data-testid="select-studio"
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select studio" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {studios?.map((studio) => (
                              <SelectItem key={studio.id} value={studio.id}>
                                {studio.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Form Actions */}
              <div className="flex items-center gap-4 pt-6">
                <Button
                  type="submit"
                  disabled={isLoading}
                  data-testid="button-save-stream"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isLoading ? 'Saving...' : isEditing ? 'Update Stream' : 'Create Stream'}
                </Button>
                <Button variant="outline" asChild data-testid="button-cancel-stream">
                  <Link href="/admin/streams">Cancel</Link>
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}