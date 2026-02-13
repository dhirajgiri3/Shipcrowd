import crypto from 'crypto';
import type Test from 'supertest/lib/test';

const TEST_RUN_ID = crypto.randomBytes(3).toString('hex');

const toOctet = (value: string): number => {
    const digest = crypto.createHash('sha256').update(value).digest();
    return (digest[0] % 254) + 1;
};

export const createRateLimitIdentity = (suite: string, testCase: string): string => {
    const a = toOctet(`${TEST_RUN_ID}:${suite}:${testCase}:a`);
    const b = toOctet(`${TEST_RUN_ID}:${suite}:${testCase}:b`);
    return `10.255.${a}.${b}`;
};

export const withRateLimitHeaders = (req: Test, identity: string): Test => {
    return req
        .set('X-Test-Rate-Limit', 'enforce')
        .set('X-Forwarded-For', identity);
};
