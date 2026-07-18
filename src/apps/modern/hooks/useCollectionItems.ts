import { useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';

export const useCollectionItems = (collectionId?: string) => {
    const { __legacyApiClient__: apiClient, user } = useApi();

    return useQuery({
        queryKey: ['User', user?.Id, 'Collections', collectionId, 'Items'],
        queryFn: async () => {
            if (!apiClient || !user?.Id || !collectionId) return [];

            const result = await apiClient.getItems(user.Id, {
                ParentId: collectionId,
                Fields: 'Overview,CommunityRating,ProductionYear,UserData,ImageTags'
            });

            if (result && Array.isArray(result.Items)) return result.Items as any[];
            if (Array.isArray(result)) return result as any[];
            return [];
        },
        enabled: !!apiClient && !!user?.Id && !!collectionId,
        staleTime: 10 * 60 * 1000,
        gcTime: 60 * 60 * 1000
    });
};
