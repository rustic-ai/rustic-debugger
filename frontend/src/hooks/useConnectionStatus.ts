import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@services/api/client';

export function useConnectionStatus() {
  const { data } = useQuery({
    queryKey: ['health'],
    queryFn: () => apiClient.getHealth(),
    refetchInterval: 5000, // Check every 5 seconds
  });
  
  return {
    isConnected: data?.services.redis.connected ?? false,
    latency: data?.services.redis.latency ?? 0,
    status: data?.status ?? 'unhealthy',
    uptime: data?.uptime ?? 0,
  };
}