import type { ImpactStyle } from '@capacitor/haptics';

export async function hapticLight() {
    try {
        const { Haptics } = await import('@capacitor/haptics');
        await Haptics.impact({ style: 'LIGHT' as ImpactStyle });
    } catch {
        // noop on web or if plugin unavailable
    }
}

export async function hapticMedium() {
    try {
        const { Haptics } = await import('@capacitor/haptics');
        await Haptics.impact({ style: 'MEDIUM' as ImpactStyle });
    } catch {
        // noop on web or if plugin unavailable
    }
}

export async function hapticHeavy() {
    try {
        const { Haptics } = await import('@capacitor/haptics');
        await Haptics.impact({ style: 'HEAVY' as ImpactStyle });
    } catch {
        // noop on web or if plugin unavailable
    }
}

export async function hapticSelection() {
    try {
        const { Haptics } = await import('@capacitor/haptics');
        await Haptics.selectionStart();
    } catch {
        // noop on web or if plugin unavailable
    }
}
