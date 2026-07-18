import { useMemo } from 'react';

export type TimePeriod = 'morning' | 'afternoon' | 'evening' | 'night';

export interface TimeOfDayResult {
    period: TimePeriod;
    greeting: string;
    /** Hint for content sorting: 'DatePlayed' or 'DateCreated' with Descending for recent; 'CommunityRating' for night */
    sortHint: string;
}

function getTimePeriod(): TimePeriod {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
}

const GREETINGS: Record<TimePeriod, string> = {
    morning: 'Good morning',
    afternoon: 'Good afternoon',
    evening: 'Good evening',
    night: 'Late night picks'
};

export function useTimeOfDay(): TimeOfDayResult {
    return useMemo(() => {
        const period = getTimePeriod();
        return {
            period,
            greeting: GREETINGS[period],
            sortHint: period === 'night'
                ? 'CommunityRating,ProductionYear'
                : 'DateCreated,ProductionYear'
        };
    }, []);
}
