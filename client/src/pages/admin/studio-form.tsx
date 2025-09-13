import { useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save } from 'lucide-react';
import { Link } from 'wouter';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { insertStudioSchema, type Studio } from '@shared/schema';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

// Enhanced form schema with validation
const studioFormSchema = insertStudioSchema.extend({
  name: z.string().min(1, 'Studio name is required').max(100, 'Name too long'),
  description: z.string().min(1, 'Description is required').max(500, 'Description too long'),
  thumbnail: z.string().url('Must be a valid image URL'),
  status: z.enum(['online', 'offline', 'maintenance'], {
    required_error: 'Status is required',
  }),
  feedCount: z.coerce.number().min(0, 'Feed count must be 0 or greater').default(0),
});

type StudioFormData = z.infer<typeof studioFormSchema>;

export default function StudioFormPage() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isEditing = !!id;

  // Fetch studio data if editing
  const { data: studio, isLoading: studioLoading } = useQuery<Studio>({
    queryKey: ['/api/studios', id],
    queryFn: () => apiRequest(`/api/studios/${id}`),
    enabled: isEditing,
  });

  const form = useForm<StudioFormData>({
    resolver: zodResolver(studioFormSchema),
    defaultValues: {
      name: '',
      description: '',
      thumbnail: '',
      status: 'offline',
      feedCount: 0,
    },
  });

  // Update form when studio data loads
  useEffect(() => {
    if (studio && isEditing) {
      form.reset({
        name: studio.name,
        description: studio.description,
        thumbnail: studio.thumbnail,
        status: studio.status as any,
        feedCount: studio.feedCount,
      });
    }
  }, [studio, isEditing, form]);

  // Create/update mutations
  const createStudioMutation = useMutation({
    mutationFn: (data: StudioFormData) => apiRequest('/api/studios', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/studios'] });
      queryClient.invalidateQueries({ queryKey: ['/api/streams'] });
      toast({
        title: 'Studio created',
        description: 'The studio has been successfully created.',
      });
      navigate('/admin/studios');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create studio',
        variant: 'destructive',
      });
    },
  });

  const updateStudioMutation = useMutation({
    mutationFn: (data: StudioFormData) => apiRequest(`/api/studios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/studios'] });
      queryClient.invalidateQueries({ queryKey: ['/api/streams'] });
      toast({
        title: 'Studio updated',
        description: 'The studio has been successfully updated.',
      });
      navigate('/admin/studios');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update studio',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: StudioFormData) => {
    if (isEditing) {
      updateStudioMutation.mutate(data);
    } else {
      createStudioMutation.mutate(data);
    }
  };

  const statusOptions = [
    { value: 'online', label: 'Online' },
    { value: 'offline', label: 'Offline' },
    { value: 'maintenance', label: 'Maintenance' },
  ];

  if (studioLoading && isEditing) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg" data-testid="text-loading-studio">Loading studio...</div>
        </div>
      </div>
    );
  }

  const isLoading = createStudioMutation.isPending || updateStudioMutation.isPending;

  return (
    <div className="p-6 max-w-4xl mx-auto" data-testid="admin-studio-form-page">
      <Card className="hover-elevate">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild data-testid="button-back-to-studios">
              <Link href="/admin/studios">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Studios
              </Link>
            </Button>
            <CardTitle className="text-2xl font-bold">
              {isEditing ? 'Edit Studio' : 'Add New Studio'}
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
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Studio Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Studio A Control Room"
                          data-testid="input-name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        data-testid="select-status"
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {statusOptions.map((option) => (
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
              </div>

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe this studio's purpose and capabilities..."
                        rows={3}
                        data-testid="input-description"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Thumbnail and Feed Count */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="thumbnail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Thumbnail URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="/generated_images/studio-thumbnail.png"
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

                <FormField
                  control={form.control}
                  name="feedCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Feed Count</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          data-testid="input-feed-count"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Form Actions */}
              <div className="flex items-center gap-4 pt-6">
                <Button
                  type="submit"
                  disabled={isLoading}
                  data-testid="button-save-studio"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isLoading ? 'Saving...' : isEditing ? 'Update Studio' : 'Create Studio'}
                </Button>
                <Button variant="outline" asChild data-testid="button-cancel-studio">
                  <Link href="/admin/studios">Cancel</Link>
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}