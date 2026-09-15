import { Inject, Injectable, Logger } from '@nestjs/common';
import { ContentJobStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import {
  GenerationProviderError,
  TEXT_GENERATION_PROVIDER,
  type BrandContext,
  type TextGenerationProvider,
} from './text-generation.types';

export type GenerationJobExecutionInput = {
  jobId: string;
  workspaceId: string;
  contentRequestId: string;
  topic: string;
  audience?: string;
  format?: string;
  brand?: BrandContext | null;
};

export interface ContentGenerationExecutor {
  execute(input: GenerationJobExecutionInput): Promise<{
    status: ContentJobStatus;
    draftId?: string;
    errorCode?: string;
    errorMessage?: string;
  }>;
}

export const CONTENT_GENERATION_EXECUTOR = Symbol(
  'CONTENT_GENERATION_EXECUTOR',
);

@Injectable()
export class DefaultContentGenerationExecutor implements ContentGenerationExecutor {
  private readonly logger = new Logger(DefaultContentGenerationExecutor.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(TEXT_GENERATION_PROVIDER)
    private readonly provider: TextGenerationProvider,
  ) {}

  async execute(input: GenerationJobExecutionInput) {
    const claimed = await this.prisma.db.generationJob.updateMany({
      where: {
        id: input.jobId,
        workspaceId: input.workspaceId,
        status: ContentJobStatus.requested,
      },
      data: {
        status: ContentJobStatus.running,
        startedAt: new Date(),
        errorCode: null,
        errorMessage: null,
      },
    });

    if (claimed.count === 0) {
      const existing = await this.prisma.db.generationJob.findFirst({
        where: { id: input.jobId, workspaceId: input.workspaceId },
        include: { draft: true },
      });
      return {
        status: existing?.status ?? ContentJobStatus.failed,
        draftId: existing?.draft?.id,
        errorCode: existing?.errorCode ?? undefined,
        errorMessage: existing?.errorMessage ?? undefined,
      };
    }

    await this.prisma.db.contentRequest.updateMany({
      where: { id: input.contentRequestId, workspaceId: input.workspaceId },
      data: { status: ContentJobStatus.running },
    });

    try {
      const result = await this.provider.generate({
        topic: input.topic,
        audience: input.audience,
        format: input.format,
        brand: input.brand,
        workspaceId: input.workspaceId,
        contentRequestId: input.contentRequestId,
      });

      const draft = await this.prisma.db.$transaction(async (tx) => {
        const created = await tx.contentDraft.upsert({
          where: { contentRequestId: input.contentRequestId },
          create: {
            workspaceId: input.workspaceId,
            contentRequestId: input.contentRequestId,
            generationJobId: input.jobId,
            title: result.title,
            body: result.body,
            version: 1,
            provider: result.provider,
            promptVersion: result.promptVersion,
            metadata: (result.metadata ?? {}) as Prisma.InputJsonValue,
          },
          update: {
            generationJobId: input.jobId,
            title: result.title,
            body: result.body,
            provider: result.provider,
            promptVersion: result.promptVersion,
            metadata: (result.metadata ?? {}) as Prisma.InputJsonValue,
          },
        });

        await tx.generationJob.update({
          where: { id: input.jobId },
          data: {
            status: ContentJobStatus.succeeded,
            completedAt: new Date(),
            usageMetadata: (result.usage ??
              Prisma.JsonNull) as Prisma.InputJsonValue,
            errorCode: null,
            errorMessage: null,
          },
        });

        await tx.contentRequest.update({
          where: { id: input.contentRequestId },
          data: { status: ContentJobStatus.succeeded },
        });

        return created;
      });

      return {
        status: ContentJobStatus.succeeded,
        draftId: draft.id,
      };
    } catch (error) {
      const safe =
        error instanceof GenerationProviderError
          ? error.toSafeError()
          : {
              code: 'generation_failed',
              message: 'Content generation failed.',
            };

      this.logger.warn(
        `Generation job ${input.jobId} failed with code ${safe.code}`,
      );

      await this.prisma.db.$transaction(async (tx) => {
        await tx.generationJob.update({
          where: { id: input.jobId },
          data: {
            status: ContentJobStatus.failed,
            completedAt: new Date(),
            errorCode: safe.code,
            errorMessage: safe.message,
          },
        });
        await tx.contentRequest.update({
          where: { id: input.contentRequestId },
          data: { status: ContentJobStatus.failed },
        });
      });

      return {
        status: ContentJobStatus.failed,
        errorCode: safe.code,
        errorMessage: safe.message,
      };
    }
  }
}
