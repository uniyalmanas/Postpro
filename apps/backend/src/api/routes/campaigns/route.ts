import { HANDLER } from '@postmill-ai/backend/handler';
import { z } from 'zod';
import { CampaignPlanningService } from '@postmill-ai/backend/campaign-planning.service';
import { prisma } from '@postmill-ai/backend/prisma';

export const POST = HANDLER(async (context) => {
  const { organizationId } = context.params;
  const body = await context.request.json();

  // Validate input using the same schema as the frontend
  const briefSchema = z.object({
    title: z.string().min(1, 'Campaign title is required'),
    objective: z.string().min(1, 'Campaign objective is required'),
    targetAudience: z
      .object({
        demographics: z.string().optional(),
        interests: z.string().array().optional(),
        geographic: z.string().array().optional(),
      })
      .optional(),
    platforms: z
      .enum(['linkedin', 'instagram', 'twitter', 'facebook', 'threads', 'mastodon'])
      .array()
      .min(1, 'At least one platform is required'),
    contentFormat: z
      .enum([
        'educational',
        'product_announcement',
        'promotional',
        'founder_content',
        'case_study',
        'testimonial',
        'seasonal',
        'short_video_script',
      ])
      .optional(),
    tone: z.enum(['professional', 'friendly', 'authoritative', 'casual', 'inspirational', 'humorous']),
    language: z.string().default('en'),
    cta: z.string().optional(),
    desiredPublishingDate: z.date().optional(),
    campaignDurationDays: z.number().int().positive().default(30),
  });

  const validated = briefSchema.safeParse(body);
  if (!validated.success) {
    return new Response(
      JSON.stringify({
        error: validated.error.errors[0].message,
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const service = new CampaignPlanningService(
    context.kernel,
    prisma
  );

  try {
    const plan = await service.planCampaign(organizationId, validated.data);

    return new Response(
      JSON.stringify({
        status: plan.status,
        plan: plan.plan,
        nextSteps: plan.nextSteps,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Campaign planning error:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to generate campaign plan',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

export const GET = HANDLER(async (context) => {
  const { organizationId, planId } = context.params;

  const service = new CampaignPlanningService(
    context.kernel,
    prisma
  );

  try {
    const plan = await service.getPlan(planId, organizationId);

    return new Response(
      JSON.stringify({
        status: 'plan_retrieved',
        plan,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Get campaign plan error:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to retrieve campaign plan',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});