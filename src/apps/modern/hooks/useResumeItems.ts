import { useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';

interface ResumeParams {
    limit?: number;
    parentId?: string;
    includeItemTypes?: string;
    excludeItemTypes?: string;
    fields?: string;
    imageTypeLimit?: number;
    enableImageTypes?: string;
}

export const useResumeItems = (params?: ResumeParams) => {
    const { __legacyApiClient__: apiClient, user } = useApi();

    return useQuery({
        queryKey: ['User', user?.Id, 'ResumeItems', params],
        queryFn: async () => {
            if (!apiClient || !user?.Id) return [];

            const result = await apiClient.getJSON(
                apiClient.getUrl('Items/Resume', {
                    userId: user.Id,
                    limit: params?.limit || 12,
                    parentId: params?.parentId,
                    includeItemTypes: params?.includeItemTypes,
                    excludeItemTypes: params?.excludeItemTypes,
                    fields: params?.fields || 'Overview,CommunityRating,ProductionYear,UserData,ImageTags',
                    imageTypeLimit: params?.imageTypeLimit || 1,
                    enableImageTypes: params?.enableImageTypes || 'Primary,Backdrop,Thumb'
                })
            );

            if (result && Array.isArray(result.Items)) return result.Items as any[];
            if (Array.isArray(result)) return result as any[];
            return [];
        },
        enabled: !!apiClient && !!user?.Id,
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000
    });
};
