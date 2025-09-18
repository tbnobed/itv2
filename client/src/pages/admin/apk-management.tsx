import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  Smartphone, 
  Upload, 
  Download, 
  FileCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  HardDrive,
  Calendar
} from 'lucide-react';

// CSRF token function (same as in queryClient.ts)
async function getCSRFToken(): Promise<string> {
  try {
    const response = await fetch('/api/csrf-token', {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch CSRF token');
    }
    
    const data = await response.json();
    return data.csrfToken;
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    throw error;
  }
}

interface APKInfo {
  exists: boolean;
  filename?: string;
  size?: number;
  sizeFormatted?: string;
  lastModified?: string;
  lastModifiedFormatted?: string;
  message?: string;
}

export default function ApkManagement() {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Fetch current APK info
  const { data: apkInfo, isLoading, error, refetch } = useQuery<APKInfo>({
    queryKey: ['/api/admin/apk/info'],
    queryFn: () => apiRequest('/api/admin/apk/info'),
  });

  // Upload APK mutation
  const uploadApkMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('apk', file);

      // Get CSRF token first
      try {
        const csrfToken = await getCSRFToken();
        
        // Create a XMLHttpRequest to track upload progress
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const progress = Math.round((event.loaded / event.total) * 100);
              setUploadProgress(progress);
            }
          });

          xhr.addEventListener('load', () => {
            setIsUploading(false);
            if (xhr.status === 200 || xhr.status === 201) {
              try {
                const response = JSON.parse(xhr.responseText);
                resolve(response);
              } catch (e) {
                reject(new Error('Invalid response format'));
              }
            } else {
              try {
                const errorResponse = JSON.parse(xhr.responseText);
                reject(new Error(errorResponse.error || 'Upload failed'));
              } catch (e) {
                reject(new Error(`Upload failed with status ${xhr.status}`));
              }
            }
          });

          xhr.addEventListener('error', () => {
            setIsUploading(false);
            reject(new Error('Network error during upload'));
          });

          xhr.open('POST', '/api/admin/apk/upload');
          xhr.setRequestHeader('x-csrf-token', csrfToken);
          xhr.send(formData);
        });
      } catch (error) {
        setIsUploading(false);
        throw new Error('Failed to get CSRF token: ' + (error instanceof Error ? error.message : String(error)));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/apk/info'] });
      setUploadProgress(0);
      toast({
        title: "Upload successful",
        description: "APK file has been successfully uploaded and is now available for download.",
      });
    },
    onError: (error: any) => {
      setUploadProgress(0);
      setIsUploading(false);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload APK file. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.apk')) {
      toast({
        title: "Invalid file type",
        description: "Please select a valid APK file (.apk extension).",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "APK file must be smaller than 100MB.",
        variant: "destructive",
      });
      return;
    }

    if (file.size === 0) {
      toast({
        title: "Invalid file",
        description: "The selected file is empty.",
        variant: "destructive",
      });
      return;
    }

    uploadApkMutation.mutate(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-accent rounded"></div>
          <div className="h-32 bg-accent rounded"></div>
          <div className="h-20 bg-accent rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('APK Query Error:', error);
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-destructive">Error Loading APK Info</h3>
              <p className="text-muted-foreground mt-2">
                {error.message || 'Failed to load APK information'}
              </p>
              <Button 
                variant="outline" 
                className="mt-4" 
                onClick={() => refetch()}
                data-testid="button-retry"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto" data-testid="page-apk-management">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Smartphone className="w-8 h-8" />
            APK Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage Android APK file for the OBTV mobile application
          </p>
        </div>
      </div>

      {/* Current APK Status */}
      <Card className="hover-elevate">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <FileCheck className="w-5 h-5" />
            Current APK File
          </CardTitle>
          <CardDescription>
            Information about the currently uploaded APK file
          </CardDescription>
        </CardHeader>
        <CardContent>
          {apkInfo?.exists ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="font-medium" data-testid="text-apk-filename">
                      {apkInfo.filename}
                    </span>
                    <Badge variant="default">Available</Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4" />
                      <span data-testid="text-apk-size">
                        Size: {apkInfo.sizeFormatted}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span data-testid="text-apk-date">
                        Modified: {apkInfo.lastModifiedFormatted}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span data-testid="text-apk-relative-time">
                        {formatDate(apkInfo.lastModified!)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Direct download bypassing SPA router
                      const link = document.createElement('a');
                      link.href = '/api/download/firestick-apk';
                      link.download = 'OBTV-FireStick.apk';
                      link.style.display = 'none';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    data-testid="button-download-apk"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription data-testid="text-no-apk">
                {apkInfo?.message || 'No APK file currently uploaded'}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Upload Interface */}
      <Card className="hover-elevate">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload New APK
          </CardTitle>
          <CardDescription>
            Upload a new APK file to replace the current one. Maximum file size: 100MB
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" data-testid="progress-upload" />
              </div>
            )}

            {/* Drag and Drop Area */}
            <div
              className={`
                border-2 border-dashed rounded-lg p-8 text-center transition-colors
                ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
                ${isUploading ? 'opacity-50 pointer-events-none' : 'hover:border-primary/50 hover:bg-primary/5'}
              `}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              data-testid="dropzone-apk"
            >
              <div className="space-y-4">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Upload className="w-6 h-6 text-primary" />
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">
                    Drop your APK file here
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    or click the button below to browse
                  </p>
                  
                  <Button
                    onClick={handleButtonClick}
                    disabled={isUploading}
                    data-testid="button-select-apk"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isUploading ? 'Uploading...' : 'Select APK File'}
                  </Button>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  <p>Supported format: .apk</p>
                  <p>Maximum size: 100MB</p>
                </div>
              </div>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".apk,application/vnd.android.package-archive"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
              data-testid="input-file-apk"
            />
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">📱 About APK Files</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• APK files are Android application packages</li>
                <li>• Only upload APK files from trusted sources</li>
                <li>• The uploaded APK will be available for download</li>
                <li>• Users can install this APK on Android TV devices</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">⚠️ Important Notes</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Maximum file size: 100MB</li>
                <li>• Only .apk files are accepted</li>
                <li>• Uploading will replace the current APK</li>
                <li>• Changes take effect immediately</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}