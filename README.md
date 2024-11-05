# rss2bsky

`rss2bsky` is a tool that auto-posts RSS feed updates to a Bluesky, using Cloudflare Workers.

## Setup 

```bash
git clone https://github.com/icealtria/rss2bsky.git
cd rss2bsky
pnpm i
```

```bash
wrangler kv namespace create KV
```

Take note of the `id` provided after creating the namespace.

Rename `wrangler.example.toml` to `wrangler.toml` and update the configuration:

```toml
[triggers]
crons = ["*/15 * * * *"]

[[kv_namespaces]]
binding = "KV"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

[vars]
BSKY_USERNAME = "xxx.bsky.social"
BSKY_PASSWORD = "xxxx-xxxx-xxxx-xxxx"
FEED_URL = "https://example.com/feed.xml"
```

Deploy the worker to Cloudflare using `wrangler`:

```bash
wrangler deploy
```
