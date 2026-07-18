import { useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';

export const useItem = (itemId: string | undefined) => {
    const { __legacyApiClient__: apiClient, user } = useApi();

    return useQuery({
        queryKey: ['User', user?.Id, 'Item', itemId],
        queryFn: async () => {
            if (!apiClient || !itemId) return null;
            const result = await apiClient.getJSON(
                apiClient.getUrl('Users/' + user?.Id + '/Items/' + itemId, {
                    Fields: 'Overview,CommunityRating,ProductionYear,RunTimeTicks,Genres,Studios,People,OfficialRating,UserData,ImageTags,MediaSources,CollectionIds'
                })
            );
            return result as any;
        },
        enabled: !!apiClient && !!user?.Id && !!itemId,
        staleTime: 5 * 60 * 1000
    });
};
