import { createRemoteJWKSet, jwtVerify } from "jose";

// Verifies Firebase ID tokens using Google's public keys. Needs only the project ID, no service account.
const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

export async function verifyIdToken(token: string) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!;
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });
  if (!payload.sub) throw new Error("no sub");
  return {
    uid: payload.sub,
    email: payload.email as string | undefined,
    emailVerified: payload.email_verified as boolean | undefined,
    name: payload.name as string | undefined,
    picture: payload.picture as string | undefined,
  };
}
