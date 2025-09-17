import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  // 304 Not Modified is a valid success response for caching
  if (!res.ok && res.status !== 304) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Cache for CSRF token to avoid repeated requests
let cachedCsrfToken: string | null = null;

async function getCSRFToken(): Promise<string> {
  try {
    // Always fetch a fresh token to avoid cache issues
    const response = await fetch('/api/csrf-token', {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch CSRF token');
    }
    
    const data = await response.json();
    cachedCsrfToken = data.csrfToken;
    return data.csrfToken;
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    throw error;
  }
}

export async function apiRequest(
  url: string,
  options?: {
    method?: string;
    body?: string;
    headers?: Record<string, string>;
  }
): Promise<any> {
  const method = options?.method || 'GET';
  const headers: Record<string, string> = {
    ...(options?.body ? { "Content-Type": "application/json" } : {}),
    ...(options?.headers || {}),
  };

  // Add CSRF token for non-GET requests
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    try {
      const csrfToken = await getCSRFToken();
      headers['x-csrf-token'] = csrfToken;
    } catch (error) {
      console.error('Failed to get CSRF token:', error);
      // Continue without CSRF token - let the server handle the error
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body: options?.body,
    credentials: "include",
  });

  // Clear cached CSRF token on 403 errors (token might be invalid)
  if (res.status === 403) {
    cachedCsrfToken = null;
  }

  await throwIfResNotOk(res);
  
  // Handle 304 Not Modified responses (they typically have no body)
  if (res.status === 304) {
    // Return empty object for 304 responses to indicate "use cached data"
    return {};
  }
  
  // Parse JSON response for non-DELETE methods
  if (method !== 'DELETE') {
    return await res.json();
  }
  
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    // Handle 304 Not Modified - use cached data
    if (res.status === 304) {
      return {};
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
