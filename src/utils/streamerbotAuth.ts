import crypto from 'crypto';

export function calculateStreamerBotAuth(password: string, salt: string, challenge: string): string {
    // 1. Secret = base64( SHA256_bin( password + salt ) )
    const secretHash = crypto.createHash('sha256');
    secretHash.update(password + salt);
    const secret = secretHash.digest('base64');

    // 2. Auth = base64( SHA256_bin( secret + challenge ) )
    const authHash = crypto.createHash('sha256');
    authHash.update(secret + challenge);
    const auth = authHash.digest('base64');

    return auth;
}
