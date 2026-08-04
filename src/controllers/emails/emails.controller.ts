import { Body, Controller, Get, Headers, Post, Req } from '@nestjs/common';
import { gmail_v1 } from 'googleapis';
import { EmailsService } from 'src/services/emails/emails.service';

@Controller('emails')
export class EmailsController {
  constructor(private emailService: EmailsService) {}
  @Get()
  async getAllEmails(
    @Req() req: Request,
    @Headers() headers: Record<string, string>,
  ): Promise<{ status: string; id: string }> {
    return await this.emailService.getUserEmailS(req, headers);
  }

  @Post('store')
  async storeEmailData(
    @Body()
    body: {
      data: Record<string, unknown>[];
      userId: string;
      emails: {
        classificationLabelValues?:
          gmail_v1.Schema$ClassificationLabelValue[] | undefined;
        historyId?: string | null;
        id?: string | null;
        internalDate?: string | null;
        labelIds?: string[] | null;
        payload?: gmail_v1.Schema$MessagePart;
        raw?: string | null;
        sizeEstimate?: number | null;
        snippet?: string | null;
        threadId?: string | null;
        body: {
          text: string;
          html: string;
        };
        attachments: {
          filename: string;
          mimeType: string;
          attachmentId: string;
        }[];
        headers: {
          subject: gmail_v1.Schema$MessagePartHeader | undefined;
          deliveredTo: gmail_v1.Schema$MessagePartHeader | undefined;
          from: gmail_v1.Schema$MessagePartHeader | undefined;
          recievedAt: gmail_v1.Schema$MessagePartHeader | undefined;
        };
        myGivenId: string;
        categories: (
          | {
              name: string;
              desc?: string | undefined;
            }
          | {
              name: string;
              desc: string;
            }
        )[];
      }[];
    },
  ): Promise<any> {
    return await this.emailService.storeEmailDataToDatabase(
      body.emails,
      body.data,
      body.userId,
    );
  }
}
