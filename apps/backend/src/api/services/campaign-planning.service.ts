import { Injectable, BadGatewayException } from '@nestjs/common';
import { ProviderKernel } from '@postmill-ai/provider-kernel';
import { AIBrandProfile } from '@postmill-ai/nestjs-libraries';
import { AIOrgProviderConfig } from '@postmill-ai/nestjs-libraries';
import { Organization } from '@postmill-ai/nestsh-libraries';
import { z } from 'zod';
import { generateObject } from '@postmill-ai/nestjs-libraries/ai';
import { safeFetch } from '@postmill-ai/nestjs-libraries';
import { AISpendLog } from '@postmill-ai/nestsh-libraries';
import { Inngest } from '@postmill-ai/backend/inngest';

@Injectable()
export class CampaignPlanningService {
  constructor(
    private readonly kernel: ProviderKernel,
    private readonly prisma,
  ) {}

  async getBrandProfile(organizationId: string): Promise<AIBrandProfile> {
    const brand = await this.prisma.aIBrandProfile.findFirst({
      where: { organizationId },
      include: { organization: true },
    });
    if (!brand) {
      return this.initializeDefaultBrandProfile(organizationId);
    }
    return brand;
  }

  async initializeDefaultBrandProfile(organizationId: string) {
    // Create a minimal default brand profile
    return this.prisma.aIBrandProfile.create({
      data: {
        organizationId,
        name: 'My Brand',
        description: 'Our company brand',
        brandVoiceAndTone: 'professional',
        preferredCallsToAction: [],
        approvedTerminology: [],
        prohibitedClaims: [],
        brandColors: [],
        website: null,
        approvedSourceMaterials: [],
        frequentlyAskedQuestions: [],
        competitors: [],
        campaignObjectives: [],
        brandSpecificInstructions: '',
      },
    });
  }

  async collectMissingInformation(
    brief: z.infer<typeof import('../schemas').campaignBriefSchema>,
    brandProfile: AIBrandProfile,
  ): Promise<string[]> {
    const missing: string[] = [];

    // Check required fields
    if (!brief.title?.trim()) missing.push('Campaign title');
    if (!brief.objective?.trim()) missing.push('Campaign objective');

    // Check platform-specific requirements
    if (!brief.platforms || brief.platforms.length === 0) {
      missing.push('At least one social platform');
    }

    // Check brand context availability
    if (!brandProfile.name) {
      missing.push('Brand name and description');
    }

    // Check CTA if not provided
    if (!brief.cta && !brief.objective?.includes('call to action')) {
      missing.push('Clear call to action');
    }

    // Check content format
    if (!brief.contentFormat) {
      missing.push('Content format/type');
    }

    return missing;
  }

  async buildBrandContext(brandProfile: AIBrandProfile) {
    // Build structured brand context from the profile
    const context: Record<string, any> = {
      brandName: brandProfile.name || 'Unknown Brand',
      brandDescription: brandProfile.description || '',
      brandVoice: brandProfile.brandVoiceAndTone || 'professional',
      targetAudience: brandProfile.targetAudience || '',
      industry: brandProfile.industry || '',
      preferredLanguage: brandProfile.preferredLanguage || 'en',
      approvedTerminology: brandProfile.approvedTerminology || [],
      prohibitedClaims: brandProfile.prohibitedClaims || [],
      callsToAction: brandProfile.preferredCallsToAction || [],
      brandColors: brandProfile.brandColors || [],
      website: brandProfile.website || '',
      faqs: brandProfile.frequentlyAskedQuestions || [],
      competitors: brandProfile.competitors || [],
      campaignObjectives: brandProfile.campaignObjectives || [],
      brandInstructions: brandProfile.brandSpecificInstructions || '',
    };

    // Add products/services if available
    if (brandProfile.productsAndServices) {
      context.productsAndServices = brandProfile.productsAndServices;
    }

    // Add geographic market
    if (brandProfile.geographicMarket) {
      context.geographicMarket = brandProfile.geographicMarket;
    }

    return context;
  }

  async generateObjectivesAndThemes(
    brief: z.infer<typeof import('../schemas').campaignBriefSchema>,
    brandContext: Record<string, any>,
  ) {
    // Use AI to generate campaign objectives and content themes
    const aiResponse = await generateObject({
      provider: 'openai',
      model: 'gpt-4o-mini',
      prompt: this.buildPlanningPrompt(brief, brandContext),
      schema: z.object({
        objectives: z.array(z.string()).describe('Campaign objectives'),
        themes: z.array(z.string()).describe('Content themes'),
        keyMessages: z.array(z.string()).describe('Key messages to communicate'),
        warnings: z.array(z.string()).describe('Warnings for unsupported claims'),
      }),
      temperature: 0.7,
    });

    return {
      objectives: aiResponse.objectives,
      themes: aiResponse.themes,
    };
  }

  buildPlanningPrompt(brief: any, brandContext: Record<string, any>) {
    return `# Campaign Brief

## Title: ${brief.title}
## Objective: ${brief.objective}
## Target Audience: ${JSON.stringify(brief.targetAudience)}
## Platforms: ${brief.platforms.join(', ')}
## Content Format: ${brief.contentFormat || 'Not specified'}
## Tone: ${brief.tone || 'Not specified'}
## Language: ${brief.language}
## Call to Action: ${brief.cta || 'Not specified'}
## Duration: ${brief.campaignDurationDays} days

## Brand Context
- Brand Name: ${brandContext.brandName}
- Brand Description: ${brandContext.brandDescription}
- Brand Voice: ${brandContext.brandVoice}
- Approved Terminology: ${JSON.stringify(brandContext.approvedTerminology)}
- Prohibited Claims: ${JSON.stringify(brandContext.prohibitedClaims)}
- Calls to Action: ${JSON.stringify(brandContext.callsToAction)}
- Brand Colors: ${JSON.stringify(brandContext.brandColors)}
- Website: ${brandContext.website}
- FAQs: ${JSON.stringify(brandContext.faqs)}
- Competitors: ${JSON.stringify(brandContext.competitors)}

## Task
Generate a comprehensive content plan including:
1. 3-5 campaign objectives aligned with the objective above
2. 5-7 content themes that would resonate with the target audience
3. Key messages to communicate across all posts
4. Any warnings about unsupported claims or prohibited terminology

Be specific, actionable, and grounded in the brand context. Do not fabricate facts or make claims not supported by the brand information provided.`;

  }

  async proposeCalendar(
    objectivesAndThemes: {
      objectives: string[];
      themes: string[];
    },
    brandProfile: AIBrandProfile,
  ) {
    const duration = brandProfile.campaignDurationDays || 30;
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    // Generate a posting calendar based on objectives and themes
    const calendar = [];
    const postsPerWeek = Math.max(1, Math.floor(duration / 4)); // ~1 post per week

    for (let week = 0; week < Math.ceil(duration / 7); week++) {
      const weekPlan = {
        week: week + 1,
        posts: [],
      };

      for (let i = 0; i < postsPerWeek; i++) {
        const dayIndex = (week * postsPerWeek + i) % daysOfWeek.length;
        const themeIndex = (week + i) % brandContext.themes.length;
        const objectiveIndex = week % objectivesAndThemes.objectives.length;

        weekPlan.posts.push({
          day: daysOfWeek[dayIndex],
          theme: brandContext.themes[themeIndex] || 'General',
          objective: objectivesAndThemes.objectives[objectiveIndex],
          platformDistribution: this.distributeByPlatform(week, i, brandProfile),
          suggestedPublishTime: this.suggestPublishTime(daysOfWeek[dayIndex]),
        });
      }

      calendar.push(weekPlan);
    }

    return calendar;
  }

  distributeByPlatform(week: number, postIndex: number, brandProfile: AIBrandProfile) {
    // Distribute posts across the organization's connected platforms
    const platforms = brandProfile.organization?.integrations?.filter((i: any) => i.enabled) || [];
    const platformNames = platforms.map((i: any) => i.name || i.identifier);

    if (platformNames.length === 0) return ['linkedin', 'twitter'];

    // Simple round-robin distribution
    const platform = platformNames[((week * 5) + postIndex) % platformNames.length];
    return [platform, ...this.getSecondaryPlatforms(platformNames, platform)];
  }

  getSecondaryPlatforms(platforms: string[], primary: string): string[] {
    const secondary = [...platforms];
    secondary.splice(secondary.indexOf(primary) === -1 ? 0 : secondary.indexOf(primary), 1);
    return secondary.slice(0, 2);
  }

  suggestPublishTime(day: string) {
    const times = {
      Monday: '10:00 AM',
      Tuesday: '11:00 AM',
      Wednesday: '2:00 PM',
      Thursday: '11:00 AM',
      Friday: '10:00 AM',
      Saturday: '9:00 AM',
      Sunday: '10:00 AM',
    };
    return times[day as keyof typeof times] || '10:00 AM';
  }

  async generateDraftPosts(
    calendar: any[],
    brandContext: Record<string, any>,
  ) {
    const draftPosts = [];

    for (const week of calendar) {
      for (const post of week.posts) {
        // Generate post content using AI
        const aiResponse = await generateObject({
          provider: 'openai',
          model: 'gpt-4o-mini',
          prompt: this.buildPostPrompt(post, brandContext),
          schema: z.object({
            content: z.string().describe('The post copy'),
            headline: z.string().optional().describe('Optional headline'),
            hashtags: z.array(z.string()).describe('Relevant hashtags'),
            cta: z.string().describe('Call to action'),
            creativeDirection: z.string().describe('Suggested creative direction'),
            imagePrompt: z.string().optional().describe('Image-generation prompt'),
            sources: z.array(z.string()).describe('Sources for factual claims when research was used'),
            warnings: z.array(z.string()).describe('Warnings for missing information or unsupported claims'),
          }),
          temperature: 0.8,
        });

        draftPosts.push({
          ...post,
          content: aiResponse.content,
          headline: aiResponse.headline,
          hashtags: aiResponse.hashtags,
          cta: aiResponse.cta,
          creativeDirection: aiResponse.creativeDirection,
          imagePrompt: aiResponse.imagePrompt,
          sources: aiResponse.sources,
          warnings: aiResponse.warnings,
          status: 'QUEUE',
          creationMethod: 'AI_DESIGNER',
          brandId: brandProfile.organization?.aiBrandProfiles?.[0]?.id,
        });
      }
    }

    return draftPosts;
  }

  buildPostPrompt(post: any, brandContext: Record<string, any>) {
    const { day, theme, objective } = post;

    return `# Post Brief for ${day}

## Objective: ${objective}
## Theme: ${theme}

## Brand Context
- Brand: ${brandContext.brandName}
- Brand Voice: ${brandContext.brandVoice}
- Approved Terminology: ${JSON.stringify(brandContext.approvedTerminology.slice(0, 5))}
- Prohibited Claims: ${JSON.stringify(brandContext.prohibitedClaims.slice(0, 5))}
- Calls to Action: ${JSON.stringify(brandContext.callsToAction.slice(0, 3))}

## Post Requirements
- Format: Platform-appropriate caption with platform: ${post.platform || 'Not specified'}
- Include relevant hashtags (3-5 max)
- Clear call to action
- Suggested creative direction
- Image generation prompt if applicable
- Warning flags for any unsupported claims or missing information

## Output Format (JSON with fields: content, headline?, hashtags[], cta, creativeDirection, imagePrompt?, sources?, warnings?)
Generate the post content now.`;
  }

  async identifyAssetGaps(draftPosts: any[]) {
    // Analyze draft posts to identify missing creative assets
    const gaps = {
      missingImages: 0,
      missingVideos: 0,
      missingLinks: 0,
      recommendedAssets: [] as string[],
    };

    for (const post of draftPosts) {
      // Check if post has image prompt
      if (!post.imagePrompt) {
        gaps.missingImages++;
        // Recommend an image based on content
        if (post.content?.toLowerCase().includes('product') || post.content?.toLowerCase().includes('service')) {
          gaps.recommendedAssets.push(`Product image for: ${post.content.substring(0, 50)}...`);
        }
        if (post.content?.toLowerCase().includes('team') || post.content?.toLowerCase().includes('people')) {
          gaps.recommendedAssets.push(`Team photo or headshot`);
        }
        if (post.content?.toLowerCase().includes('infographic') || post.content?.toLowerCase().includes('data')) {
          gaps.recommendedAssets.push(`Data visualization or infographic`);
        }
      }

      // Check for links
      if (post.content && !post.content.includes('http') && !post.content.includes('www.')) {
        gaps.missingLinks++;
        gaps.recommendedAssets.push(`Outbound link or reference URL`);
      }
    }

    return gaps;
  }

  async flagForVerification(draftPosts: any[]) {
    // Flag posts that may require factual verification
    const flagged = [];

    for (const post of draftPosts) {
      const warnings = post.warnings || [];

      // Check for claims that need verification
      const claimPatterns = [
        /\b\d+%\b/, // Percentage claims
        /\b\d+x\b/, // Multiplication claims
        /\blaunched in \d{4}\b/, // Year claims
        /\b\d+\+?\s*followers?\b/, // Follower claims
        /\b\d+\+?\s*employees?\b/, // Employee count claims
      ];

      const hasUnsupportedClaims = claimPatterns.some((pattern) =>
        post.content?.match(pattern),
      );

      if (hasUnsupportedClaims || warnings.length > 0) {
        flagged.push({
          postId: post.id,
          content: post.content,
          warnings: warnings,
          reason: hasUnsupportedClaims ? 'Unsupported quantitative claims detected' : 'Explicit warnings provided',
        });
      }
    }

    return flagged;
  }

  async saveDrafts(draftPosts: any[], organizationId: string) {
    // Save draft posts as Posts with state=QUEUE
    // This integrates with the existing content workflow
    const saved = [];

    for (const post of draftPosts) {
      // Use the existing Post creation pathway
      // The actual creation would go through the Posts service/repository
      // For now, we'll structure the data for later saving
      saved.push({
        id: post.id || `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        organizationId,
        content: post.content,
        brandId: post.brandId,
        state: 'QUEUE',
        creationMethod: 'AI_DESIGNER',
        title: post.objective.substring(0, 50) + '...',
        description: '',
        publishDate: null,
        delay: 0,
        group: `campaign-draft-${Date.now()}`,
        tags: [],
        lastViews: 0,
        lastLikes: 0,
        lastComments: 0,
        commentCount: 0,
        approvalStatus: 'pending',
        approvedById: null,
        approvedAt: null,
        error: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return saved;
  }
}