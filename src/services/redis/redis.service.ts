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

  async get(key: string): Promise<string | null> {
    return await this.redis.get<string>(key);
  }

  async checkIfItemExpired(
    key: string,
  ): Promise<{ expired: boolean; secondsLeft: number }> {
    const remainingTime = await this.redis.ttl(key);
    const exists = await this.redis.exists(key);

    if (remainingTime === -2) {
      return { expired: true, secondsLeft: 0 };
    }

    if (remainingTime === -1) {
      return { expired: false, secondsLeft: 0 };
    }

    return { expired: false, secondsLeft: remainingTime };
  }
}
