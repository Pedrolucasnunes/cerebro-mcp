/**
 * The token in a request's `Authorization: Bearer <token>` header, or undefined when there isn't one.
 * As HTTP defines it, the scheme's case doesn't matter ("bearer" works too) and one or more spaces
 * come before the token. The whole value must be just that: anything after the token, or two
 * Authorization headers (which arrive joined by a comma), gives undefined.
 */
export function bearerToken(request: Request): string | undefined {
	return /^Bearer +(\S+)$/i.exec(request.headers.get("Authorization") ?? "")?.[1];
}

/**
 * Compares what a request sent with a secret, in constant time: how long it takes doesn't depend on
 * how many leading characters match, so the secret can't be guessed one character at a time.
 * This is the pattern from Cloudflare's docs ("Protect against timing attacks").
 */
export function isSameSecret(sent: string, secret: string): boolean {
	const encoder = new TextEncoder();
	const sentBytes = encoder.encode(sent);
	const secretBytes = encoder.encode(secret);
	// timingSafeEqual throws when the lengths differ. Comparing `sent` with itself in that case takes
	// about as long as a real comparison, so the answer comes back just as fast; negated, it's false.
	return sentBytes.byteLength === secretBytes.byteLength
		? crypto.subtle.timingSafeEqual(sentBytes, secretBytes)
		: !crypto.subtle.timingSafeEqual(sentBytes, sentBytes);
}
