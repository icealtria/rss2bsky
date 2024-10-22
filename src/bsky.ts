import { AtpAgent } from '@atproto/api';
import { FeedEntry } from '@extractus/feed-extractor';
import { buildPost, delay } from './utils';
import { Post } from './types';

export async function postToBsky(items: FeedEntry[], env: Env) {
    const agent = new AtpAgent({ service: 'https://bsky.social' });
    await agent.login({ identifier: env.BSKY_USERNAME, password: env.BSKY_PASSWORD });
    
    for (const item of items) {
        try {
            const post = await buildPost(item, agent);
            await postParts(agent, post, env);
        } catch (error: any) {
            console.error(`Failed to post to Bluesky: ${error.message}`);
            const failedPostKey = `failed_post_${item.id}`;
            await env.KV.put(failedPostKey, JSON.stringify(item));
        }
    }
}

async function postPart(
    agent: AtpAgent,
    part: Post,
    env: Env,
    previousUri?: string | undefined,
    previousCid?: string | undefined,
    rootUri?: string | undefined,
    rootCid?: string | undefined,
    delayMs: number = 5000
): Promise<any> {
    const post: any = {
        text: part.text,
        createdAt: part.createdAt,
    };

    if (previousUri && rootUri && previousCid && rootCid) {
        post.reply = {
            root: { uri: rootUri, cid: rootCid },
            parent: { uri: previousUri, cid: previousCid }
        };
    }

    console.log(`Posting to Bluesky: ${JSON.stringify(post)}`);

    try {
        const resp = await agent.post(post);
        
        await delay(delayMs);
        return resp;

    } catch (error: any) {
        console.error(`Error posting: ${error.message}`);
        throw error;
    }
}



async function postParts(
    agent: AtpAgent,
    parts: Post[],
    env: Env,
    previousUri?: string | undefined,
    previousCid?: string | undefined,
    rootUri?: string | undefined,
    rootCid?: string | undefined,
    delayMs: number = 5000,
    keyForRetry?: string // optional key if retrying failed posts
): Promise<void> {
    if (parts.length === 0) return;

    const currentPart = parts[0];
    const remainingParts = parts.slice(1);

    try {
        const resp = await postPart(agent, currentPart, env, previousUri, previousCid, rootUri, rootCid, delayMs);
        console.log(`Successfully posted part: ${resp}`);

        const updatedRootUri = rootUri || resp.uri;
        const updatedRootCid = rootCid || resp.cid;

        await postParts(agent, remainingParts, env, resp.uri, resp.cid, updatedRootUri, updatedRootCid, delayMs);

        if (keyForRetry) {
            await env.KV.delete(keyForRetry);
        }
    } catch (error: any) {
        console.error(`Failed to post part: ${error.message}. Saving for retry.`);

        const failedKey = keyForRetry || `failed_post_${new Date().getTime()}`;
        await env.KV.put(failedKey, JSON.stringify({
            previousUri,
            previousCid,
            rootUri,
            rootCid,
            parts,
        }));
    }
}


export async function retryFailedPosts(env: Env, delayMs: number = 5000): Promise<void> {
    const agent = new AtpAgent({ service: 'https://bsky.social' });
    await agent.login({ identifier: env.BSKY_USERNAME, password: env.BSKY_PASSWORD });


    const failedPostKeys = await env.KV.list({ prefix: 'failed_post_' });

    if (failedPostKeys.keys.length === 0) {
        console.log('No failed posts to retry.');
        return;
    }

    for (const key of failedPostKeys.keys) {
        try {
            const failedData = JSON.parse(await env.KV.get(key.name) || '{}');

            const { previousUri, previousCid, rootUri, rootCid, remainingParts } = failedData;
            if (!remainingParts || remainingParts.length === 0) {
                console.error(`Invalid or empty remaining parts for failed post: ${key.name}. Skipping.`);
                continue;
            }

            console.log(`Retrying remaining parts: ${remainingParts.length} with previousUri: ${previousUri || 'none'}, rootUri: ${rootUri || 'none'}`);

            await postParts(agent, remainingParts, env, previousUri, previousCid, rootUri, rootCid, delayMs, key.name);

        } catch (error: any) {
            console.error(`Failed to retry post: ${key.name}. Error: ${error.message}`);
        }
    }
}
