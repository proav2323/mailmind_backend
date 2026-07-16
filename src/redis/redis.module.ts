import 'dotenv/config';
import { Module, Global } from '@nestjs/common';
import { Redis } from '@upstash/redis';
export const UPSTASH_REDIS_CLIENT = 'UPSTASH_REDIS_CLIENT';
@Global()
@Module({
  providers: [
    {
      provide: UPSTASH_REDIS_CLIENT,
      useFactory: () => {
        return new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
      },
    },
  ],
  exports: [UPSTASH_REDIS_CLIENT],
})
export class RedisModule {}
