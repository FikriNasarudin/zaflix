import { useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';

export const useSimilarItems = (itemId?: string) => {
    const { __legacyApiClient__: apiClient, user } = useApi();

    return useQuery({
        queryKey: ['User', user?.Id, 'Items', itemId, 'Similar'],
        queryFn: async () => {
            if (!apiClient || !user?.Id || !itemId) return [];

            const result = await apiClient.getJSON(
                apiClient.getUrl(`Items/${itemId}/Similar?limit=6&userId=${user.Id}`)
            );

            if (result && Array.isArray(result.Items)) return result.Items as any[];
            if (Array.isArray(result)) return result as any[];
            return [];
        },
        enabled: !!apiClient && !!user?.Id && !!itemId,
        staleTime: 30 * 60 * 1000,
        gcTime: 60 * 60 * 1000
    });
};
