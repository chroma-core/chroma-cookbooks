import { v4 as uuidv4 } from "uuid";
import { Email } from "../types";
import { Collection, GetResult } from "chromadb";
import { AgentError, getCollection } from "@chroma-cookbooks/agent-framework";
import { InboxServiceError } from "../../errors";
import { InboxService } from "../inbox-service";

export type EmailRecordMetadata = {
  from: string;
  date: string;
  threadId: string;
  flagged?: boolean;
  labels?: string;
  unread?: boolean;
  draft?: boolean;
  to?: string;
};

function uuid4char() {
  return Math.random().toString(36).slice(2, 6);
}

export class MockInboxService extends InboxService {
  private static COLLECTION_NAME = "personal-inbox";
  private _collection: Collection | undefined;

  constructor() {
    super();
    this._collection = undefined;
  }

  private get collection(): Collection {
    if (!this._collection) {
      throw new InboxServiceError("Mock Inbox Service not authenticated");
    }
    return this._collection;
  }

  private recordsToEmails(records: GetResult<EmailRecordMetadata>): Email[] {
    return records.rows().map((record) => {
      if (!record.document) {
        throw new InboxServiceError(
          `Corrupted Email record: ${record.id} missing document`,
        );
      }

      const [firstLine, ...rest] = record.document.split("\n");
      const subject = firstLine.replace(/^Subject:\s*/, "");
      const content = rest.join("\n").trimStart();

      const { from, date, threadId, flagged, labels } = record.metadata || {};
      if (!from || !date || !threadId) {
        throw new AgentError(
          `Corrupted Email record: ${record.id} missing required metadata`,
        );
      }

      return {
        id: record.id,
        subject,
        from,
        date,
        threadId,
        content,
        flagged,
        labels: labels ? JSON.parse(labels) : undefined,
      };
    });
  }

  async authenticate(): Promise<void> {
    this._collection = await getCollection({
      name: MockInboxService.COLLECTION_NAME,
    });
  }

  async getUnread(): Promise<Email[]> {
    const cached = Object.values(this.emails);
    if (cached.length > 0) {
      return cached;
    }
    const records = await this.collection.get<EmailRecordMetadata>({
      where: { unread: true },
    });

    const emails = this.recordsToEmails(records);

    emails.forEach((email) => {
      this.emails[email.id] = email;
    });

    const labels = emails.map((email) => email.labels).flat();

    const labelIds = new Array(
      ...new Set(
        labels.map((label) => label?.id).filter((id) => id !== undefined),
      ),
    );

    this.labels = labelIds
      .map((labelId) => labels.find((label) => label?.id === labelId))
      .filter((label) => label !== undefined);

    return emails;
  }

  async markRead({ emailId }: { emailId: string }): Promise<void> {
    const email = this.getEmail({ emailId });
    await this.collection.update({
      ids: [email.id],
      metadatas: [{ unread: false }],
    });
  }

  async flag({ emailId }: { emailId: string }): Promise<void> {
    const email = this.getEmail({ emailId });
    await this.collection.update({
      ids: [emailId],
      metadatas: [{ flagged: true }],
    });
    email.flagged = true;
  }

  async archive({ emailId }: { emailId: string }): Promise<void> {
    const email = this.getEmail({ emailId });
    await this.collection.update({
      ids: [emailId],
      metadatas: [{ archived: true }],
    });
    email.archived = true;
  }

  async label({
    emailId,
    ...config
  }: {
    emailId: string;
    label: string;
  }): Promise<void> {
    const email = this.getEmail({ emailId });

    let label = this.labels.find(
      (label) => label.name.toLowerCase() === config.label.toLowerCase(),
    );

    if (!label) {
      label = { id: uuidv4().slice(0, 5), name: config.label };
    }

    if (email.labels?.find((emailLabel) => emailLabel.id === label?.id)) {
      return;
    }

    email.labels = [...(email.labels || []), label];

    await this.collection.update({
      ids: [email.id],
      metadatas: [{ labels: JSON.stringify(email.labels) }],
    });
  }

  async draftResponse({
    emailId,
    content,
  }: {
    emailId: string;
    content: string;
  }): Promise<void> {
    const email = this.getEmail({ emailId });
    await this.collection.add({
      ids: [uuidv4()],
      documents: [content],
      metadatas: [
        {
          from: "me",
          date: new Date().toISOString(),
          threadId: email.threadId,
          draft: true,
          to: email.from,
        },
      ],
    });
  }
}
