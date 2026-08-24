# EdgeOne Makers deployment

This directory is the China-accessible deployment target for `font.evainc.cn`.
It keeps the public UI and authentication proxy close to Tencent COS while the
root repository remains the source of truth for FontTools/FontBakery builds.

Required production environment variable:

- `EVA_SESSION_SECRET`: a random secret used to sign 12-hour HttpOnly sessions.

Optional variables (defaults shown):

- `EVA_AUTH_BASE_URL=https://design.evainc.cn`
- `EVA_OTP_APPLICATION=penpot`

Deploy with EdgeOne CLI:

```sh
edgeone makers deploy makers-site -n eva-font-registry -e production -a global
```

Only `wxd` (owner) and `lyn` (editor) are accepted. The OTP is verified by the
existing Eva ID service; the session contains no upstream access token.
