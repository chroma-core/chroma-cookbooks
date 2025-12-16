import { Tool } from "@chroma-cookbooks/agent-framework";
import { z, ZodObject, ZodTypeAny } from "zod";
import { InboxInputHandler } from "../input-handler";
import { InboxService } from "./inbox-service";

export type InboxServiceToolConfig = {
  inputHandler: InboxInputHandler;
  inboxService: InboxService;
  id: string;
  description: string;
  name: string;
  parametersSchema: ZodObject<any>;
  resultSchema: ZodTypeAny;
};

export const inboxToolParamsSchema = z.object({ emailId: z.string() });
export type InboxToolParams = z.infer<typeof inboxToolParamsSchema>;

export abstract class InboxTool<
  P extends InboxToolParams = InboxToolParams,
  R = unknown,
> implements Tool<P, R> {
  protected inboxService: InboxService;
  protected inputHandler: InboxInputHandler;
  id: string;
  description: string;
  name: string;
  parametersSchema: ZodObject<any>;
  resultSchema: ZodTypeAny;

  protected constructor(config: InboxServiceToolConfig) {
    const {
      id,
      description,
      name,
      parametersSchema,
      resultSchema,
      inputHandler,
      inboxService,
    } = config;
    this.id = id;
    this.name = name;
    this.description = description;
    this.parametersSchema = parametersSchema;
    this.resultSchema = resultSchema;
    this.inboxService = inboxService;
    this.inputHandler = inputHandler;
  }

  abstract format(result: R): string | undefined;
  abstract execute(parameters: P): Promise<R>;
}

export class MarkReadTool extends InboxTool {
  constructor(config: {
    inputHandler: InboxInputHandler;
    inboxService: InboxService;
  }) {
    super({
      ...config,
      id: "mark_read",
      name: "Mark Read",
      description: "Mark an unread email as read",
      parametersSchema: inboxToolParamsSchema,
      resultSchema: z.any(),
    });
  }

  async execute({ emailId }: InboxToolParams): Promise<unknown> {
    return await this.inboxService.markRead({ emailId });
  }

  format(result: unknown): undefined {
    return undefined;
  }
}

export class FlagTool extends InboxTool {
  constructor(config: {
    inputHandler: InboxInputHandler;
    inboxService: InboxService;
  }) {
    super({
      ...config,
      id: "flag",
      name: "Flag Email",
      description: "Flag an email",
      parametersSchema: inboxToolParamsSchema,
      resultSchema: z.any(),
    });
  }

  async execute({ emailId }: InboxToolParams): Promise<unknown> {
    return await this.inboxService.flag({ emailId });
  }

  format(result: unknown): undefined {
    return undefined;
  }
}

export class ArchiveTool extends InboxTool {
  constructor(config: {
    inputHandler: InboxInputHandler;
    inboxService: InboxService;
  }) {
    super({
      ...config,
      id: "archive",
      name: "Archive Email",
      description: "Archive an email",
      parametersSchema: inboxToolParamsSchema,
      resultSchema: z.any(),
    });
  }

  async execute({ emailId }: InboxToolParams): Promise<unknown> {
    return await this.inboxService.archive({ emailId });
  }

  format(result: unknown): undefined {
    return undefined;
  }
}

const labelToolParamsSchema = inboxToolParamsSchema.extend({
  name: z.string().describe("The name of the label"),
});

type LabelToolParams = z.infer<typeof labelToolParamsSchema>;

export class LabelTool extends InboxTool<LabelToolParams> {
  constructor(config: {
    inputHandler: InboxInputHandler;
    inboxService: InboxService;
  }) {
    super({
      ...config,
      id: "label",
      name: "Label Email",
      description: "Label an email",
      parametersSchema: labelToolParamsSchema,
      resultSchema: z.any(),
    });
  }

  async execute({ emailId, name }: LabelToolParams): Promise<unknown> {
    return await this.inboxService.label({ emailId, label: name });
  }

  format(result: unknown): undefined {
    return undefined;
  }
}

const draftResponseToolParams = inboxToolParamsSchema.extend({
  content: z.string().describe("The content of the draft"),
});

type DraftResponseToolParams = z.infer<typeof draftResponseToolParams>;

export class DraftResponseTool extends InboxTool<DraftResponseToolParams> {
  constructor(config: {
    inputHandler: InboxInputHandler;
    inboxService: InboxService;
  }) {
    super({
      ...config,
      id: "draft_response",
      name: "Draft Response",
      description: "Create a draft to respond to an email",
      parametersSchema: draftResponseToolParams,
      resultSchema: z.any(),
    });
  }

  async execute({
    emailId,
    content,
  }: DraftResponseToolParams): Promise<unknown> {
    return await this.inboxService.draftResponse({ emailId, content });
  }

  format(result: unknown): undefined {
    return undefined;
  }
}

export const inboxToolsFactory = (config: {
  inputHandler: InboxInputHandler;
  inboxService: InboxService;
}) => [
  new MarkReadTool(config),
  new FlagTool(config),
  new ArchiveTool(config),
  new LabelTool(config),
  new DraftResponseTool(config),
];
