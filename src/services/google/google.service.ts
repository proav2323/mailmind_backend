import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { gmail_v1, google } from 'googleapis';
import { AuthService } from '../auth/auth.service';
import { GaxiosResponseWithHTTP2 } from 'googleapis-common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GoogleService {
  constructor(
    private authService: AuthService,
    private prisma: PrismaService,
  ) {}
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
    'office',
    'class',
    'annoucements',
    'billing',
    'placement',
    'reminder',
    'fees',
    'scholarship',
    'academic',
    'holiday',
    'club',
    'intership',
    'research',
    'Finace',
  ];

  async getEmails(
    accessToken: string,
    idToken: string,
    refreshToken: string,
    scope: string,
    year: string,
    isFirstTime: boolean,
    historyEmail: string,
    historyId: string | null,
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
    if (isFirstTime) {
      try {
        const userEmails: gmail_v1.Schema$Message[] = [];
        let nextPageToken: string | undefined | null = undefined;
        const keywordQuery = `(${this.workKeywords.join(' OR ')})`;
        const exclusions =
          '-category:promotions -category:social -category:updates';
        const finalQuery = `(category:primary OR is:important) ${exclusions} ${keywordQuery} after:${year}/1/1 `;

        do {
          const response: GaxiosResponseWithHTTP2<gmail_v1.Schema$ListMessagesResponse> =
            await gmail.users.messages.list({
              userId: 'me', // 'me' indicates the authenticated user
              maxResults: 100, // Maximum per page allowed by Google is 100 but taking to long time
              pageToken: nextPageToken,
              q: finalQuery,
            });

          if (!response.ok || response.status === 500) {
            const error = await response.text();
            throw new BadRequestException('something went wrong: ' + error);
          }

          const messages = response.data.messages || [];
          userEmails.push(...messages);

          nextPageToken = response.data.nextPageToken;
        } while (nextPageToken);

        const profileResponse = await gmail.users.getProfile({
          userId: 'me',
        });

        // This historyId represents the exact state of the mailbox right now
        const realTimeHistoryId = profileResponse.data.historyId;

        if (!realTimeHistoryId) {
          throw new Error(
            'Could not retrieve current history ID from profile.',
          );
        }

        await this.authService.chnageuserHistoryId(
          historyEmail,
          realTimeHistoryId,
        );

        const emailDetail = userEmails.map(async (email) => {
          const res: GaxiosResponseWithHTTP2<gmail_v1.Schema$Message> =
            await gmail.users.messages.get({
              userId: 'me',
              id: email.id ? email.id : undefined,
              access_token: accessToken,
              auth: this.googleClient,
              key: process.env.GMAIL_API_KEY,
            });

          return res.data;
        });
        return Promise.all(emailDetail);
      } catch (err) {
        console.log(err);
        throw new BadRequestException(String(err));
      }
    } else {
      try {
        console.log('redirect-working');
        let nextPageToken: string | undefined | null = undefined;
        const usersEmails: gmail_v1.Schema$HistoryMessageAdded[] = [];
        const historyRecords: gmail_v1.Schema$History[] = [];
        do {
          const response: GaxiosResponseWithHTTP2<gmail_v1.Schema$ListHistoryResponse> =
            await gmail.users.history.list({
              userId: 'me', // 'me' indicates the authenticated user
              maxResults: 100, // Maximum per page allowed by Google is 100 but taking to long time
              pageToken: nextPageToken,
              startHistoryId: historyId === null ? undefined : historyId,
              historyTypes: ['messageAdded', 'labelRemoved'],
              labelId: 'UNREAD',
            });

          if (!response.ok || response.status === 500) {
            const error = await response.text();
            throw new BadRequestException('something went wrong: ' + error);
          }

          if (response.data.history) {
            historyRecords.push(...response.data.history);
          }

          // This historyId represents the exact state of the mailbox right now
          const realTimeHistoryId = response.data.historyId;

          if (!realTimeHistoryId) {
            throw new Error(
              'Could not retrieve current history ID from profile.',
            );
          }

          await this.authService.chnageuserHistoryId(
            historyEmail,
            realTimeHistoryId,
          );

          nextPageToken = response.data.nextPageToken;
        } while (nextPageToken);
        historyRecords.forEach((record) => {
          usersEmails.push(...(record.messagesAdded ?? []));
          usersEmails.push(...(record.labelsRemoved ?? []));
        });

        const emailsData = await this.userGmail(usersEmails);
        const emails = emailsData.filter((value) => value.take === true);

        console.log(emails);

        const emailDetail = emails.map(async (email) => {
          const res = await gmail.users.messages.get({
            userId: 'me',
            id: email.value.message?.id ? email.value.message.id : undefined,
            access_token: accessToken,
            auth: this.googleClient,
            key: process.env.GMAIL_API_KEY,
          });
          return res.data;
        });
        return Promise.all(emailDetail);
      } catch (err) {
        console.log(err);
        throw new BadRequestException(String(err));
      }
    }
  }

  async userGmail(userEmails: gmail_v1.Schema$HistoryMessageAdded[]) {
    const emails = userEmails.map(async (value) => {
      const email = await this.prisma.eMAILS.findUnique({
        where: { gmailId: value.message!.id ? value.message!.id : '' },
        select: { id: true },
      });
      if (!email) {
        return { take: true, value: value };
      } else {
        await this.prisma.eMAILS.update({
          where: { id: email.id },
          data: {
            isRead:
              value.message?.labelIds?.find((value) => value === 'UNREAD') !==
              undefined
                ? false
                : true,
          },
          select: { id: true },
        });
        return { take: false, value: value };
      }
    });

    return Promise.all(emails);
  }

  // message id is parent email id
  async downloadAttachment(
    messageId: string,
    attachmentId: string,
    accessToken: string,
    refreshToken: string,
    idToken: string,
    scope: string,
  ) {
    this.googleClient.setCredentials({
      access_token: accessToken,
      id_token: idToken,
      refresh_token: refreshToken,
      scope: scope,
    });
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

  extractEmailBodyInOrder(payload: gmail_v1.Schema$MessagePart | undefined) {
    const body: { type: string; data: string; i: number }[] = [];

    if (!payload) return body;

    const parsePart = (part: gmail_v1.Schema$MessagePart, idx: number) => {
      if (!part) return;

      // Case 1: The current part has the data directly
      if (part.body && part.body.data) {
        const decodedData = this.decodeBase64Url(part.body.data);
        if (part.mimeType === 'text/plain') {
          body.push({ type: 'text/plain', data: decodedData, i: idx });
        } else if (part.mimeType === 'text/html') {
          body.push({ type: 'text/html', data: decodedData, i: idx });
        }
      }

      // Case 2: The email has nested sub-parts (Common in complex multipart emails)
      if (part.parts && part.parts.length > 0) {
        for (const subPart of part.parts) {
          const idx = part.parts.findIndex((value) => value === part);
          parsePart(subPart, idx);
        }
      }
    };

    if (payload.body && payload.body.data) {
      parsePart(payload, 0);
    } else if (payload.parts) {
      for (const part of payload.parts) {
        const idx = payload.parts.findIndex((value) => value === part);
        parsePart(part, idx);
      }
    }

    return body;
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
  async getEmailFromHistoryId(
    historyId: string,
    accessToken: string,
    refreshToken: string,
    idToken: string,
  ) {
    this.googleClient.setCredentials({
      access_token: accessToken,
      id_token: idToken,
      refresh_token: refreshToken,
    });

    const gmail = google.gmail({
      version: 'v1',
      auth: this.googleClient,
      key: process.env.GMAIL_API_KEY,
    });

    const listMsg = await gmail.users.history.list({
      userId: 'me',
      startHistoryId: historyId,
    });
    const newEmails: gmail_v1.Schema$Message[] = [];

    if (listMsg.data.history?.length === 0 || !listMsg.data.history) {
      return;
    }

    for (const historyItem of listMsg.data.history) {
      if (historyItem.messagesAdded) {
        for (const messageAddedItem of historyItem.messagesAdded) {
          const messageId = messageAddedItem.message?.id;
          const res = await gmail.users.messages.get({
            userId: 'me',
            access_token: accessToken,
            auth: this.googleClient,
            key: process.env.GMAIL_API_KEY,
            id: messageId!,
          });

          newEmails.push(res.data);
        }
      }
    }

    return newEmails;
  }

  async watch(
    accessToken: string,
    refreshToken: string,
    idToken: string,
    email: string,
  ) {
    this.googleClient.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      id_token: idToken,
    });

    const gmail = google.gmail({
      auth: this.googleClient,
      version: 'v1',
      key: process.env.GMAIL_API_KEY,
    });

    const res = await gmail.users.watch({
      auth: this.googleClient,
      key: process.env.GMAIL_API_KEY,
      userId: 'me',
      requestBody: {
        topicName: `projects/${process.env.GCP_PROJECT_ID}/topics/gmail-notification`,
        labelIds: ['INBOX'], // Optional: filter down to specific labels
        labelFilterAction: 'include',
      },
    });
    await this.prisma.uSER.update({
      where: { email: email },
      data: {
        isWatching: true,
        exp: res.data.expiration ? new Date(Number(res.data.expiration)) : null,
      },
      select: { id: true },
    });
    return res;
  }

  async getAttachmentFromId(
    id: string,
    messageId: string,
    accessToken: string,
    idToken: string,
    refreshToken: string,
  ) {
    this.googleClient.setCredentials({
      access_token: accessToken,
      id_token: idToken,
      refresh_token: refreshToken,
    });
    const gmail = google.gmail({
      key: process.env.GMAIL_API_KEY,
      auth: this.googleClient,
      version: 'v1',
    });

    const attachmentData = await gmail.users.messages.attachments.get({
      userId: 'me',
      id: id,
      messageId: messageId,
    });

    const base64Data = attachmentData.data.data
      ? attachmentData.data.data.replace(/-/g, '+').replace(/_/g, '/')
      : 'no attachment found';
    return { data: base64Data };
  }
}
