# Auth API

## `POST /auth/register`

Creates a new user. Requires valid invite code.

```json
{ "email": "user@example.com", "password": "min8chars", "birth_date": "2000-01-15", "invite_code": "BETA2026" }
```

Response (201): `{ "access_token": "eyJ...", "token_type": "bearer" }`
Sets `refresh_token` cookie. Errors: 409 (email taken), 400 (bad invite code), 422 (short password).

## `POST /auth/login`

```json
{ "email": "user@example.com", "password": "min8chars" }
```

Response (200): `{ "access_token": "eyJ...", "token_type": "bearer" }`
Sets `refresh_token` cookie. Errors: 401 (bad credentials).

## `POST /auth/refresh`

No body. Reads `refresh_token` cookie. Rotates token (old revoked).

Response (200): `{ "access_token": "eyJ...", "token_type": "bearer" }`
Errors: 401 (missing/invalid/expired/revoked token).

## `POST /auth/logout`

Requires Bearer token. Revokes refresh token, clears cookie.
Response: 204 No Content.

## `POST /auth/forgot-password`

```json
{ "email": "user@example.com" }
```

Response (200): `{ "detail": "If that email exists, a reset link has been sent" }`
Always 200 (prevents enumeration). Sends email with reset link. Token expires in 60 min.

## `POST /auth/reset-password`

```json
{ "token": "raw-token-from-email-link", "new_password": "min8chars" }
```

Response (200): `{ "detail": "Password has been reset" }`
Errors: 400 (invalid/expired/used token), 422 (short password). Single-use.

## `GET /auth/me`

Requires Bearer token.

```json
{ "id": 1, "email": "user@example.com", "birth_date": "2000-01-15", "is_admin": true, "created_at": "2026-04-27T05:22:33Z" }
```
