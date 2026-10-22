import { Controller, Post, Body, Get, Param, Query } from '@nestjs/common';
import { AuthService } from '@postmill-ai/backend/auth';
import { z } from 'zod';
import { CampaignPlanningService } from '@postmill-ai/nestjs-libraries';
import { UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrgRbacGuard } from '@postmill-ai/backend/org-rbac';
import { RequirePermission } from '@postmill-ai/backend/pipes';
import { ZodInterceptor } from '@postmill-ai/backend/zod.interceptor';
import { plainToInstance } from 'class-transformer';

@Controller('campaigns')
export class CampaignsController {
  constructor(
    private readonly auth: AuthService,
    private readonly campaignService: CampaignPlanningService,
  ) {}

  /// <summary>
  /// Generate a content plan from a campaign brief
  /// </summary>
  @Post('plan')
  @UseGuards(AuthGuard(), OrgRbacGuard)
  @RequirePermission('campaign', 'create')
  @UseInterceptors(new ZodInterceptor())
  async planCampaign(
    @Param('organizationId') organizationId: string,
    @Body() brief: z.infer<typeof campaignBriefSchema>,
  ) {
    // 1. Validate organization access
    await this.auth.assertOrganizationAccess(organizationId, this.auth.currentUser.id);

    // 2. Fetch brand profile for the organization
    const brandProfile = await this.campaignService.getBrandProfile(organizationId);

    // 3. Collect any missing critical information
    const missingInfo = this.campaignService.collectMissingInformation(brief, brandProfile);
    if (missingInfo.length > 0) {
      return {
        status: 'pending_info',
        missing: missingInfo,
        message:
          'Please provide the following missing information to complete the campaign plan.',
      };
    }

    // 4. Read client's brand profile
    const brandContext = await this.campaignService.buildBrandContext(brandProfile);

    // 5. Generate campaign objectives and content themes
    const objectivesAndThemes = await this.campaignService.generateObjectivesAndThemes(
      brief,
      brandContext,
    );

    // 6. Propose a posting calendar (e.g., 30 days)
    const calendar = await this.campaignService.proposeCalendar(
      objectivesAndThemes,
      brandProfile,
    );

    // 7. Generate draft content for individual posts
    const draftPosts = await this.campaignService.generateDraftPosts(
      calendar,
      brandContext,
    );

    // 8. Identify required creative assets
    const assetGaps = await this.campaignService.identifyAssetGaps(draftPosts);

    // 9. Flag posts requiring factual verification
    const flaggedPosts = await this.campaignService.flagForVerification(draftPosts);

    // 10. Present proposed plan for human review
    const plan = {
      brief,
      objectives: objectivesAndThemes.objectives,
      themes: objectivesAndThemes.themes,
      calendar,
      draftPosts,
      assetGaps,
      flaggedPosts,
      generatedAt: new Date(),
    };

    // 11. Save drafts into existing content workflow
    const savedPosts = await this.campaignService.saveDrafts(draftPosts, organizationId);

    return {
      status: 'plan_generated',
      plan,
      nextSteps: [
        'Review the proposed plan below',
        'Edit any draft posts as needed',
        'Submit for approval when satisfied',
        'Schedule approved posts for publishing',
      ],
    };
  }

  /// <summary>
  /// Get a previously generated campaign plan for revision
  /// </summary>
  @Get('plan/:planId')
  @UseGuards(AuthGuard(), OrgRbacGuard)
  @RequirePermission('campaign', 'read')
  async getPlan(
    @Param('organizationId') organizationId: string,
    @Param('planId') planId: string,
  ) {
    return this.campaignService.getPlan(planId, organizationId);
  }

  /// <summary>
  /// Revise an existing campaign plan
  /// </summary>
  @Post('plan/:planId/revise')
  @UseGuards(AuthGuard(), OrgRbacGuard)
  @RequirePermission('campaign', 'update')
  async revisePlan(
    @Param('organizationId') organizationId: string,
    @Param('planId') planId: string,
    @Body() revisions: z.infer<typeof planRevisionsSchema>,
  ) {
    return this.campaignService.revisePlan(planId, organizationId, revisions);
  }
}

// Schema definitions
export const campaignBriefSchema = z.object({
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
    .enum([
      'twitter',
      'linkedin',
      'instagram',
      'facebook',
      'threads',
      'mastodon',
      'bluesky',
      'wordpress',
      'medium',
      'telegram',
      'discord',
      'slack',
      'spotify',
      'youtube',
      'pinterest',
    ])
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
      'multi_post',
    ])
    .optional(),
  tone: z.enum(['professional', 'friendly', 'authoritative', 'casual', 'inspirational', 'humorous']).optional(),
  language: z.string().default('en'),
  cta: z.string().optional(),
  desiredPublishingDate: z.date().optional(),
  campaignDurationDays: z.number().int().positive().default(30),
  brandId: z.string().uuid().optional(),
});

export const planRevisionsSchema = z.object({
  keepDrafts: z.boolean().default(true),
  modifyObjectives: z.string().optional(),
  modifyThemes: z.string().optional(),
  addDays: z.number().int().positive().optional(),
  removeDays: z.number().int().positive().optional(),
});