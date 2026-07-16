import { Inject, Injectable } from '@nestjs/common';
import { UPSTASH_REDIS_CLIENT } from 'src/redis/redis.module';
import { Redis } from '@upstash/redis';

@Injectable()
export class RedisService {
  constructor(@Inject(UPSTASH_REDIS_CLIENT) private redis: Redis) {}

  async save(value: string, key: string, expireIn: number) {
    await this.redis.set(key, value, { ex: expireIn });
  }

  async delete(key: string) {
    await this.redis.del(key);
  }

  async get(key: string) {
    await this.redis.get(key);
  }
}
