import { useEffect, useRef, useState } from 'react';

function getDominantColor(imageUrl: string): Promise<string> {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) { resolve('rgba(10, 6, 20, 1)'); return; }

                const size = 64;
                canvas.width = size;
                canvas.height = size;
                ctx.drawImage(img, 0, 0, size, size);

                const data = ctx.getImageData(0, 0, size, size).data;
                let r = 0, g = 0, b = 0, count = 0;

                // Sample every 4th pixel for performance
                for (let i = 0; i < data.length; i += 16) {
                    const pr = data[i];
                    const pg = data[i + 1];
                    const pb = data[i + 2];
                    // Skip very dark or very bright pixels
                    if (pr + pg + pb > 30 && pr + pg + pb < 700) {
                        r += pr;
                        g += pg;
                        b += pb;
                        count++;
                    }
                }

                if (count === 0) { resolve('rgba(10, 6, 20, 1)'); return; }

                r = Math.round(r / count);
                g = Math.round(g / count);
                b = Math.round(b / count);

                resolve(`rgba(${r}, ${g}, ${b}, 0.15)`);
            } catch {
                resolve('rgba(10, 6, 20, 1)');
            }
        };
        img.onerror = () => resolve('rgba(10, 6, 20, 1)');
        img.src = imageUrl;
    });
}

export function useAmbientColor(imageUrl: string | null) {
    const [ambientColor, setAmbientColor] = useState('rgba(10, 6, 20, 1)');
    const currentUrlRef = useRef<string | null>(null);

    useEffect(() => {
        if (!imageUrl || imageUrl === currentUrlRef.current) return;
        currentUrlRef.current = imageUrl;

        let cancelled = false;
        getDominantColor(imageUrl).then((color) => {
            if (!cancelled) setAmbientColor(color);
        });

        return () => { cancelled = true; };
    }, [imageUrl]);

    return ambientColor;
}
