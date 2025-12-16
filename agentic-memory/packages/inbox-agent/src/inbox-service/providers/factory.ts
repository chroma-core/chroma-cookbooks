import { InboxServiceProvider } from "../types";
import { InboxService } from "../inbox-service";
import { MockInboxService } from "./mock";
import { InboxServiceError } from "../../errors";

export class InboxServiceFactory {
  static create(config: { provider: InboxServiceProvider }): InboxService {
    switch (config.provider) {
      case InboxServiceProvider.Chroma:
        return new MockInboxService();
      default:
        throw new InboxServiceError(
          `Invalid Inbox Service provider: ${config.provider}`,
        );
    }
  }
}
