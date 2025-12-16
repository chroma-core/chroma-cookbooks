import { Email, Label } from "./types";
import { InboxServiceError } from "../errors";

export abstract class InboxService {
  protected readonly emails: Record<string, Email>;
  protected labels: Label[];

  protected constructor() {
    this.emails = {};
    this.labels = [];
  }

  getEmail({ emailId }: { emailId: string }): Email {
    const email = this.emails[emailId];
    if (!email) {
      throw new InboxServiceError(`Email ${emailId} not found`);
    }
    return email;
  }

  formatEmail({ emailId }: { emailId: string }): string {
    const email = this.getEmail({ emailId });
    return `Subject: ${email.subject}
From: ${email.from}
Flagged: ${email.flagged === true}${email.labels ? `\nLabels: ${email.labels.map((label) => label.name).join(", ")}` : ""}

${email.content}
`;
  }

  abstract label(config: { emailId: string; label: string }): Promise<void>;

  abstract draftResponse(config: {
    emailId: string;
    content: string;
  }): Promise<void>;

  abstract authenticate(): Promise<void>;
  abstract getUnread(): Promise<Email[]>;
  abstract markRead(config: { emailId: string }): Promise<void>;
  abstract flag({ emailId }: { emailId: string }): Promise<void>;
  abstract archive({ emailId }: { emailId: string }): Promise<void>;
}
