import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { Attachment } from 'nodemailer/lib/mailer';

@Injectable()
export class MailService {
    constructor(private readonly mailer: MailerService) { }
    async sendMail(options: {
        to: string | string[];
        subject: string;

        /** One of the following is required */
        html?: string;
        template?: string;

        /** Required if template is used */
        context?: Record<string, any>;

        text?: string;
    }) {
        try {
            await this.mailer.sendMail({
                to: options.to,
                subject: options.subject,

                ...(options.template
                    ? {
                        template: options.template,
                        context: options.context,
                    }
                    : {
                        html: options.html,
                        text: options.text,
                    }),
            });
        } catch (error) {
            console.error('🔴 REAL MAIL ERROR ↓↓↓↓↓↓↓↓↓↓↓');
            console.error(error);
            console.error('🔴 REAL MAIL ERROR ↑↑↑↑↑↑↑↑↑↑↑');
        }
    }

    async sendMailWithAttachments(options: {
        to: string;
        subject: string;

        /** One of the following is required */
        html?: string;
        template?: string;

        /** Required if template is used */
        context?: Record<string, any>;

        text?: string;

        /** Attachments (PDF, images, etc.) */
        attachments: Attachment[];
    }) {
        try {
            await this.mailer.sendMail({
                to: options.to,
                subject: options.subject,
                attachments: options.attachments as any,

                ...(options.template
                    ? {
                        template: options.template,
                        context: options.context,
                    }
                    : {
                        html: options.html,
                        text: options.text,
                    }),
            });
        } catch (error) {
            console.error('🔴 REAL MAIL ERROR WITH ATTACHMENTS ↓↓↓↓↓↓↓↓↓↓↓');
            console.error(error);
            console.error('🔴 REAL MAIL ERROR WITH ATTACHMENTS ↑↑↑↑↑↑↑↑↑↑↑');
        }
    }
}
