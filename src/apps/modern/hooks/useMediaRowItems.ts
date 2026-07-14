import { useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';

export const useMediaRowItems = (title: string, query: any) => {
    const { __legacyApiClient__: apiClient, user } = useApi();
    const queryString = JSON.stringify(query);

    return useQuery({
        queryKey: ['User', user?.Id, 'MediaRow', title, query],
        queryFn: async () => {
            if (!apiClient || !user?.Id) return [];

            const parsedQuery = JSON.parse(queryString);
            const result = await apiClient.getItems(user.Id, {
                ...parsedQuery,
                Fields: 'Overview,CommunityRating,ProductionYear,UserData,ImageTags'
            });

            return (result?.Items || []) as any[];
        },
        enabled: !!apiClient && !!user?.Id,
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000
    });
};
