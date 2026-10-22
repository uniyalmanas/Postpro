import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useNavigate } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@postmill-ai/react/form';
import { Input } from '@postmill-ai/react/form';
import { Select } from '@postmill-ai/react/select';
import { Textarea } from '@postmill-ai/react/form';
import { useT } from '@postmill-ai/react';
import { useOrganization } from '@/hooks/use-organization';

const campaignBriefSchema = z.object({
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

export default function CampaignPlanningPage() {
  const { t } = useT();
  const navigate = useNavigate();
  const { organization, isLoading: orgLoading } = useOrganization();
  const { toast } = useToast();

  const [brief, setBrief] = useState(() => ({
    title: '',
    objective: '',
    targetAudience: {},
    platforms: [],
    contentFormat: undefined,
    tone: 'professional',
    language: 'en',
    cta: '',
    desiredPublishingDate: undefined,
    campaignDurationDays: 30,
  }));

  const [plan, setPlan] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const formRef = useRef();

  // Initialize form with default values
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<z.infer<typeof campaignBriefSchema>>({
    mode: 'onBlur',
    reValidate: 'onChange',
  });

  // SWR for fetching existing plans
  const { data: existingPlan, error, isValidating } = useSWR(
    organization?.id ? `/api/campaigns/plan/${organization.id}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const onSubmit = async (data: z.infer<typeof campaignBriefSchema>) => {
    setIsGenerating(true);
    setHasSubmitted(true);

    try {
      const response = await fetch(`/api/campaigns/plan/${organization.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate campaign plan');
      }

      const result = await response.json();
      setPlan(result.plan);
      toast({
        title: t('campaignPlan.successTitle'),
        description: t('campaignPlan.successDescription'),
        variant: 'success',
      });
    } catch (error: any) {
      console.error('Campaign planning error:', error);
      toast({
        title: t('campaignPlan.errorTitle'),
        description: error.message || 'Failed to generate campaign plan. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (orgLoading || !organization?.id) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <p>{t('general.loadingOrganization')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav class="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-semibold">{t('campaigns.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('campaigns.subtitle')}</p>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
        {/* Campaign Brief Form */}
        <div className="rounded-border border-border bg-card p-6 mb-8">
          <h2 className="text-xl font-medium mb-4">{t('campaigns.briefTitle')}</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t('campaigns.title')}</label>
              <Input
                {...register('title', { required: 'Title is required' })}
                defaultValue={brief.title}
                placeholder="My 30-Day Instagram Growth Campaign"
                className="w-full"
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('campaigns.objective')}</label>
              <Input
                {...register('objective', { required: 'Objective is required' })}
                placeholder="Generate enquiries for upcoming batch"
                className="w-full"
              />
              {errors.objective && (
                <p className="text-sm text-destructive">{errors.objective.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('campaigns.targetAudience')}</label>
              <Input
                {...register('targetAudience.demographics', { placeholder: 'e.g., Women 25-45, health enthusiasts' })}
                placeholder="Demographics"
                className="w-full"
              />
              <Input
                {...register('targetAudience.interests', { placeholder: 'e.g., fitness, wellness, nutrition', multiline: true, rows: 3 })}
                placeholder="Interests"
                className="w-full"
              />
              <Input
                {...register('targetAudience.geographic', { placeholder: 'e.g., Dehradun, India', multiline: true, rows: 2 })}
                placeholder="Geographic Location"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('campaigns.platforms')}</label>
              <Select
                multiple
                {...register('platforms', { required: 'At least one platform is required' })}
                className="w-full"
              >
                <Select.Item value="linkedin">LinkedIn</Select.Item>
                <Select.Item value="instagram">Instagram</Select.Item>
                <Select.Item value="twitter">Twitter / X</Select.Item>
                <Select.Item value="facebook">Facebook</Select.Item>
                <Select.Item value="threads">Threads</Select.Item>
                <Select.Item value="mastodon">Mastodon</Select.Item>
              </Select>
              {errors.platforms && (
                <p className="text-sm text-destructive">{errors.platforms.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('campaigns.contentFormat')}</label>
              <Select
                {...register('contentFormat', { placeholder: t('campaigns.selectFormat') })}
                className="w-full"
              >
                <Select.Item value="educational">{t('campaigns.educational')}</Select.Item>
                <Select.Item value="product_announcement">{t('campaigns.productAnnouncement')}</Select.Item>
                <Select.Item value="promotional">{t('campaigns.promotional')}</Select.Item>
                <Select.Item value="founder_content">{t('campaigns.founderContent')}</Select.Item>
                <Select.Item value="case_study">{t('campaigns.caseStudy')}</Select.Item>
                <Select.Item value="testimonial">{t('campaigns.testimonial')}</Select.Item>
                <Select.Item value="seasonal">{t('campaigns.seasonal')}</Select.Item>
                <Select.Item value="short_video_script">{t('campaigns.shortVideoScript')}</Select.Item>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('campaigns.tone')}</label>
              <Select
                {...register('tone', { placeholder: t('campaigns.selectTone') })}
                className="w-full"
              >
                <Select.Item value="professional">{t('campaigns.professional')}</Select.Item>
                <Select.Item value="friendly">{t('campaigns.friendly')}</Select.Item>
                <Select.Item value="authoritative">{t('campaigns.authoritative')}</Select.Item>
                <Select.Item value="casual">{t('campaigns.casual')}</Select.Item>
                <Select.Item value="inspirational">{t('campaigns.inspirational')}</Select.Item>
                <Select.Item value="humorous">{t('campaigns.humorous')}</Select.Item>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-2">{t('campaigns.language')}</label>
                <Select
                  {...register('language', { placeholder: t('campaigns.selectLanguage') })}
                  className="w-full"
                >
                  <Select.Item value="en">English</Select.Item>
                  <Select.Item value="es">Spanish</Select.Item>
                  <Select.Item value="hi">Hindi</Select.Item>
                  <Select.Item value="fr">French</Select.Item>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('campaigns.duration')}</label>
                <Input
                  type="number"
                  {...register('campaignDurationDays', { mode: 'onBlur' })}
                  min={1}
                  max={365}
                  step={1}
                  value={brief.campaignDurationDays}
                  onChange={(e) =>
                    setBrief({ ...brief, campaignDurationDays: Number(e.target.value) })
                  }
                  className="w-full"
                />
                {t('campaigns.days')}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('campaigns.cta')}</label>
              <Input
                {...register('cta', { placeholder: t('campaigns.ctaPlaceholder') })}
                placeholder="e.g., Sign up, Learn more, Get started"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('campaigns.desiredDate')}</label>
              <Input
                type="date"
                {...register('desiredPublishingDate', { mode: 'onBlur' })}
                value={
                  brief.desiredPublishingDate
                    ? new Date(brief.desiredPublishingDate).toISOString().split('T')[0]
                    : ''
                }
                className="w-full"
              />
            </div>

            <Button
              type="submit"
              disabled={isGenerating}
              className="w-full"
              style={{ marginTop: '1rem' }}
            >
              {isGenerating ? t('general.generating') : t('campaigns.generatePlan')}
            </Button>
          </form>
        </div>

        {/* Generated Plan */}
        {plan && (
          <div className="rounded-border border-border bg-card p-6">
            <h2 className="text-xl font-medium mb-4">{t('campaigns.generatedPlan')}</h2>

            <div className="space-y-4">
              {/* Objectives */}
              <div>
                <h3 className="text-sm font-medium mb-3">{t('campaigns.objectives')}</h3>
                <ul className="space-y-2">
                  {plan.objectives.map((obj: string, i: number) => (
                    <li key={i} className="flex items-start">
                      <svg
                        className="w-4 h-4 flex-shrink-0 text-primary-600 mt-0.5"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Themes */}
              <div>
                <h3 className="text-sm font-medium mb-3">{t('campaigns.themes')}</h3>
                <ul className="space-y-2">
                  {plan.themes.map((theme: string, i: number) => (
                    <li key={i} className="flex items-start">
                      <svg
                        className="w-4 h-4 flex-shrink-0 text-primary-600 mt-0.5"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      <span>{theme}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Calendar */}
              <div>
                <h3 className="text-sm font-medium mb-3">{t('campaigns.calendar')}</h3>
                <p className="text-sm text-muted-foreground">
                  {plan.calendar?.length} weeks planned ·
                  {plan.calendar.reduce((w, w) => w.posts.length, 0)} total posts
                </p>
              </div>

              {/* Draft Posts Summary */}
              {plan.draftPosts && plan.draftPosts.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-3">
                    {t('campaigns.draftPosts', { count: plan.draftPosts.length })}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {plan.draftPosts.length} draft posts ready for review
                  </p>
                </div>
              )}

              {/* Asset Gaps */}
              {plan.assetGaps && (
                <div>
                  <h3 className="text-sm font-medium mb-3">{t('campaigns.assetGaps')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {plan.assetGaps.missingImages} image(s) recommended,
                    {plan.assetGaps.missingLinks} link(s) suggested
                  </p>
                </div>
              )}

              {/* Flagged Posts */}
              {plan.flaggedPosts && plan.flaggedPosts.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-3">
                    {t('campaigns.flaggedPosts', { count: plan.flaggedPosts.length })}
                  </h3>
                  <p className="text-sm text-warning-600">
                    {plan.flaggedPosts.length} post(s) flagged for factual verification
                  </p>
                </div>
              )}

              {/* Next Steps */}
              <div>
                <h3 className="text-sm font-medium mb-3">{t('campaigns.nextSteps')}</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>{t('campaigns.reviewPlan')}</li>
                  <li>{t('campaigns.editPosts')}</li>
                  <li>{t('campaigns.submitApproval')}</li>
                  <li>{t('campaigns.schedulePosts')}</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* No plan yet section */}
        {!plan && !hasSubmitted && (
          <p className="text-muted-foreground text-center py-12">
            {t('campaigns.noPlanYet')}
          </p>
        )}

        {/* Plan loaded from cache */}
        {existingPlan && !plan && hasSubmitted && (
          <div className="rounded-border border-border bg-card p-6">
            <h2 className="text-xl font-medium mb-4">
              {t('campaigns.loadedExistingPlan')}
            </h2>
            <p>{t('campaigns.planLoadedFromCache')}</p>
          </div>
        )}
      </div>
    </div>
  );
}