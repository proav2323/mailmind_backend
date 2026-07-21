import { BadRequestException, Injectable } from '@nestjs/common';
import { gmail_v1, google } from 'googleapis';

@Injectable()
export class GoogleService {
  googleClient = new google.auth.OAuth2({
    client_id: process.env.GOOGLE_CLIENT_ID,
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
  });

  async getEmails(
    accessToken: string,
    idToken: string,
    refreshToken: string,
    scope: string,
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

      do {
        const response = await gmail.users.messages.list({
          userId: 'me', // 'me' indicates the authenticated user
          maxResults: 10, // Maximum per page allowed by Google is 100 but taking to long time... so make it 10 for now and stop for next page token also,
          pageToken: nextPageToken,
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
        // nextPageToken = response.data.nextPageToken;
      } while (nextPageToken);

      const emailDetail = await gmail.users.messages.get({
        userId: 'me',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        id: userEmails[0].id,
        access_token: accessToken,
        auth: this.googleClient,
        key: process.env.GMAIL_API_KEY,
      });

      return [emailDetail.data];
    } catch (err) {
      console.log(err);
      throw new BadRequestException(String(err));
    }
  }
}
