import { NextRequest, NextResponse } from 'next/server';
import { aieEngine } from '@/lib/aie/engine';
import { AiePlatform, AieGoal } from '@/types/aie';
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { productInfo, platform, goal, shopId, variant } = body;

        if (!productInfo || !platform || !goal || !shopId || !variant) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Save the specific variant
        const result = await aieEngine.saveSelectedVariant(
            {
                productInfo,
                platform: platform as AiePlatform,
                goal: goal as AieGoal,
                shopId
            },
            variant
        );

        return NextResponse.json(result);

    } catch (error: any) {
        logger.error('AIE Save Error:', error as Error, { component: 'save' });
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
