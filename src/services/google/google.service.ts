import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { gmail_v1, google } from 'googleapis';

@Injectable()
export class GoogleService {
  googleClient = new google.auth.OAuth2({
    client_id: process.env.GOOGLE_CLIENT_ID,
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
  });
  workKeywords = [
    'assignment',
    'project',
    'deadline',
    'syllabus',
    'task',
    'meeting',
    'review',
    'interview',
    'course',
    'exam',
    'submission',
    'invoice',
    'report',
    'schedule',
    'urgent',
    'education',
    'work',
    'school',
  ];

  async getEmails(
    accessToken: string,
    idToken: string,
    refreshToken: string,
    scope: string,
    year: string,
  ): Promise<gmail_v1.Schema$Message[]> {
    this.googleClient.setCredentials({
      access_token: accessToken,
      id_token: idToken,
      refresh_token: refreshToken,
      scope: scope,
    });

    const gmail = google.gmail({
      version: 'v1',
      auth: this.googleClient,
      key: process.env.GMAIL_API_KEY,
    });
    const userEmails: any[] = [];
    try {
      let nextPageToken: string | undefined = undefined;
      const keywordQuery = `(${this.workKeywords.join(' OR ')})`;
      const exclusions =
        '-category:promotions -category:social -category:updates';
      const finalQuery = `(category:primary OR is:important) ${exclusions} ${keywordQuery} after:${year}/1/1 `;

      do {
        const response = await gmail.users.messages.list({
          userId: 'me', // 'me' indicates the authenticated user
          maxResults: 100, // Maximum per page allowed by Google is 100 but taking to long time
          pageToken: nextPageToken,
          q: finalQuery,
        });

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (!response.ok || response.status === 500) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          const error = await response.text();
          throw new BadRequestException('something went wrong: ' + error);
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (response.data.messages) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          userEmails.push(...(response.data.messages as any[]));
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        nextPageToken = response.data.nextPageToken;
      } while (nextPageToken);

      const emailDetail = userEmails.map(async (email) => {
        const res = await gmail.users.messages.get({
          userId: 'me',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          id: email.id,
          access_token: accessToken,
          auth: this.googleClient,
          key: process.env.GMAIL_API_KEY,
        });
        return res.data;
      });
      console.log(userEmails.length);
      return Promise.all(emailDetail);
    } catch (err) {
      console.log(err);
      throw new BadRequestException(String(err));
    }
  }

  // message id is parent email id
  async downloadAttachment(messageId: string, attachmentId: string) {
    const gmail = google.gmail({ version: 'v1', auth: this.googleClient });

    try {
      // 1. Fetch the raw attachment payload from Google
      const response = await gmail.users.messages.attachments.get({
        userId: 'me',
        messageId: messageId,
        id: attachmentId,
      });

      const base64UrlData = response.data.data;
      if (!base64UrlData) {
        throw new NotFoundException('Attachment data is empty or missing');
      }

      // 2. Convert Base64URL string back to standard Base64 characters
      let base64 = base64UrlData.replace(/-/g, '+').replace(/_/g, '/');

      // 3. Complete structural padding if missing
      while (base64.length % 4) {
        base64 += '=';
      }

      // 4. Return as a standard Node.js binary Buffer
      return Buffer.from(base64, 'base64');
    } catch (error: any) {
      throw new InternalServerErrorException(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        `Failed downloading file: ${error.message}`,
      );
    }
  }

  public extractAttachmentMetadata(
    payload: gmail_v1.Schema$MessagePart | undefined,
  ): Array<{ filename: string; mimeType: string; attachmentId: string }> {
    if (!payload) return [];

    const attachments: {
      filename: string;
      mimeType: string;
      attachmentId: string;
    }[] = [];

    const findParts = (partsList: gmail_v1.Schema$MessagePart[]) => {
      if (!partsList) return;
      for (const part of partsList) {
        if (part.filename && part.body?.attachmentId) {
          attachments.push({
            filename: part.filename,
            mimeType: part.mimeType!,
            attachmentId: part.body.attachmentId,
          });
        }
        // Recurse into deeper parts if structural arrays exist
        if (part.parts) {
          findParts(part.parts);
        }
      }
    };

    if (payload.parts) {
      findParts(payload.parts);
    }
    return attachments;
  }

  extractEmailBody(payload: gmail_v1.Schema$MessagePart | undefined) {
    let text = '';
    let html = '';

    if (!payload) return { text, html };

    const parsePart = (part: gmail_v1.Schema$MessagePart) => {
      if (!part) return;

      // Case 1: The current part has the data directly
      if (part.body && part.body.data) {
        const decodedData = this.decodeBase64Url(part.body.data);
        if (part.mimeType === 'text/plain') {
          text = decodedData;
        } else if (part.mimeType === 'text/html') {
          html = decodedData;
        }
      }

      // Case 2: The email has nested sub-parts (Common in complex multipart emails)
      if (part.parts && part.parts.length > 0) {
        for (const subPart of part.parts) {
          parsePart(subPart);
        }
      }
    };

    if (payload.body && payload.body.data) {
      parsePart(payload);
    } else if (payload.parts) {
      for (const part of payload.parts) {
        parsePart(part);
      }
    }

    return { text, html };
  }

  private decodeBase64Url(base64UrlStr: string): string {
    // Replace URL-safe characters back to standard Base64 characters
    let base64 = base64UrlStr.replace(/-/g, '+').replace(/_/g, '/');

    // Add necessary padding if missing
    while (base64.length % 4) {
      base64 += '=';
    }

    // Decode via Node.js Buffer
    return Buffer.from(base64, 'base64').toString('utf-8');
  }

  extractImporantDetailsFromEmailHeaders(value: gmail_v1.Schema$Message) {
    const subject = value.payload?.headers?.find(
      (value) => value.name === 'Subject',
    );
    const deliveredTo = value.payload?.headers?.find(
      (value) => value.name === 'To',
    );
    const from = value.payload?.headers?.find((value) => value.name === 'From');
    const recievedAt = value.payload?.headers?.find(
      (value) => value.name === 'Date',
    );

    return { subject, deliveredTo, from, recievedAt };
  }
}
