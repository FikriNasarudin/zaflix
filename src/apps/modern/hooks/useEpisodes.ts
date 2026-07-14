import { useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';

export const useEpisodes = (seriesId?: string, seasonId?: string) => {
    const { __legacyApiClient__: apiClient, user } = useApi();

    return useQuery({
        queryKey: ['User', user?.Id, 'Series', seriesId, 'Seasons', seasonId, 'Episodes'],
        queryFn: async () => {
            if (!apiClient || !user?.Id || !seriesId || !seasonId) return [];

            const result = await apiClient.getEpisodes(seriesId, {
                seasonId,
                userId: user.Id,
                Fields: 'Overview'
            });

            if (result && Array.isArray(result.Items)) return result.Items as any[];
            if (Array.isArray(result)) return result as any[];
            return [];
        },
        enabled: !!apiClient && !!user?.Id && !!seriesId && !!seasonId,
        staleTime: 10 * 60 * 1000,
        gcTime: 60 * 60 * 1000
    });
};
