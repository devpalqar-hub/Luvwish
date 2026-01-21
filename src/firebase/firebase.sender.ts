import { Injectable } from '@nestjs/common';
import { admin } from './firebase.config';  // or import { getMessaging } from 'firebase-admin/messaging';

@Injectable()
export class FirebaseSender {
    async sendPush(token: string, title: string, body: string) {
        const message = {
            token,
            notification: {
                title,
                body,
            },
        };
        return admin.messaging().send(message);
    }

    async sendPushMultiple(tokens: string[], title: string, body: string) {
        if (tokens.length === 0) return;
        const multicast = {
            tokens,
            notification: {
                title,
                body,
            },
        };
        return admin.messaging().sendEachForMulticast(multicast);
    }
}
