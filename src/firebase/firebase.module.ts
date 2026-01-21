import { Module } from '@nestjs/common';
import { FirebaseSender } from './firebase.sender';

@Module({
    providers: [FirebaseSender],
    exports: [FirebaseSender],   // 👈 important
})
export class FirebaseModule { }
