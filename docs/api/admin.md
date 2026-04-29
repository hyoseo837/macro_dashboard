# Admin API

All endpoints require `Authorization: Bearer <token>` with an admin user. Returns 403 for non-admins.

## `GET /admin/invite-codes`

```json
[{
  "id": 1, "code": "BETA2026", "created_by": 1,
  "max_uses": 10, "use_count": 3,
  "expires_at": null, "created_at": "2026-04-27T05:00:00Z"
}]
```

## `POST /admin/invite-codes`

```json
{ "code": "BETA2026", "max_uses": 10, "expires_at": "2026-12-31T23:59:59Z" }
```

`max_uses` and `expires_at` optional (null = unlimited). Returns 201. Errors: 409 (duplicate).

## `DELETE /admin/invite-codes/{id}`

Response: 204. Errors: 404.

## `GET /admin/users`

```json
[{
  "id": 1, "email": "user@example.com", "birth_date": "2000-01-15",
  "is_admin": false, "created_at": "2026-04-27T05:00:00Z", "widget_count": 4
}]
```

Read-only. Ordered by most recently created.
