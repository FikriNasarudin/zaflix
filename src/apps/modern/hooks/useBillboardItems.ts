import { useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';

export const useBillboardItems = (filterType: 'all' | 'Movie' | 'Series' = 'all') => {
    const { __legacyApiClient__: apiClient, user } = useApi();

    return useQuery({
        queryKey: ['User', user?.Id, 'Billboard', filterType],
        queryFn: async () => {
            if (!apiClient || !user?.Id) return [];

            const result = await apiClient.getItems(user.Id, {
                SortBy: 'DateCreated',
                SortOrder: 'Descending',
                Limit: 15,
                IncludeItemTypes: filterType === 'all' ? 'Movie,Series' : filterType,
                Recursive: true,
                Fields: 'Overview,CommunityRating,ProductionYear,RunTimeTicks,UserData,Genres'
            });

            if (result?.Items) {
                return result.Items.filter(
                    (i: any) => i.Overview && i.BackdropImageTags && i.BackdropImageTags.length > 0
                ) as any[];
            }
            return [];
        },
        enabled: !!apiClient && !!user?.Id,
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000
    });
};
