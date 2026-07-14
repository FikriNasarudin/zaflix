import { useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';

export const useSeasons = (seriesId?: string) => {
    const { __legacyApiClient__: apiClient, user } = useApi();

    return useQuery({
        queryKey: ['User', user?.Id, 'Series', seriesId, 'Seasons'],
        queryFn: async () => {
            if (!apiClient || !user?.Id || !seriesId) return [];

            const result = await apiClient.getSeasons(seriesId, { userId: user.Id });

            if (result && Array.isArray(result.Items)) return result.Items as any[];
            if (Array.isArray(result)) return result as any[];
            return [];
        },
        enabled: !!apiClient && !!user?.Id && !!seriesId,
        staleTime: 10 * 60 * 1000,
        gcTime: 60 * 60 * 1000
    });
};
