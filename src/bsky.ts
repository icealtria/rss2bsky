import { AtpAgent } from '@atproto/api';
import { FeedEntry } from '@extractus/feed-extractor';
import { buildPost, delay } from './utils';
import { Post } from './types';

export async function postToBsky(items: FeedEntry[], env: Env) {
    const agent = await getAgent(env);

    for (const item of items) {
        try {
            const post = await buildPost(item, agent);
            await postThread(agent, post, env);
        } catch (error) {
            console.error(`Failed to post to Bluesky:`, error);
            await saveFailedPost(env, item);
        }
    }
}

async function postThread(
    agent: AtpAgent,
    posts: Post[],
    env: Env,
    context = {
        previousUri: undefined as string | undefined,
        previousCid: undefined as string | undefined,
        rootUri: undefined as string | undefined,
        rootCid: undefined as string | undefined,
        retryKey: undefined as string | undefined
    },
    delayMs = 5000
): Promise<void> {
    if (posts.length === 0) {
        if (context.retryKey) await env.KV.delete(context.retryKey);
        return;
    }

    const [currentPost, ...remainingPosts] = posts;

    try {
        const post = createPostObject(currentPost, context);
        const response = await agent.post(post);
        await delay(delayMs);

        // Update context for next post in thread
        await postThread(
            agent,
            remainingPosts,
            env,
            {
                previousUri: response.uri,
                previousCid: response.cid,
                rootUri: context.rootUri || response.uri,
                rootCid: context.rootCid || response.cid,
                retryKey: context.retryKey
            },
            delayMs
        );
    } catch (error) {
        console.error(`Failed to post part:`, error);
        await saveFailedThread(env, posts, context);
    }
}

export async function retryFailedPosts(env: Env, delayMs = 5000): Promise<void> {
    const agent = await getAgent(env);
    const failedPosts = await getFailedPosts(env);

    if (failedPosts.length === 0) {
        console.log('No failed posts to retry.');
        return;
    }

    for (const { key, data } of failedPosts) {
        try {
            await postThread(agent, data.remainingParts, env, {
                previousUri: data.previousUri,
                previousCid: data.previousCid,
                rootUri: data.rootUri,
                rootCid: data.rootCid,
                retryKey: key
            }, delayMs);
        } catch (error) {
            console.error(`Failed to retry post ${key}:`, error);
        }
    }
}

async function getAgent(env: Env): Promise<AtpAgent> {
    const agent = new AtpAgent({ service: 'https://bsky.social' });
    await agent.login({ identifier: env.BSKY_USERNAME, password: env.BSKY_PASSWORD });
    return agent;
}

function createPostObject(post: Post, context: any) {
    const postObject: any = {
        ...post,
    };

    if (context.previousUri && context.rootUri && context.previousCid && context.rootCid) {
        postObject.reply = {
            root: { uri: context.rootUri, cid: context.rootCid },
            parent: { uri: context.previousUri, cid: context.previousCid }
        };
    }

    return postObject;
}

async function saveFailedPost(env: Env, item: FeedEntry) {
    const failedPostKey = `failed_post_${item.id}`;
    await env.KV.put(failedPostKey, JSON.stringify(item));
}

async function saveFailedThread(env: Env, posts: Post[], context: any) {
    const failedKey = context.retryKey || `failed_post_${new Date().getTime()}`;
    await env.KV.put(failedKey, JSON.stringify({
        previousUri: context.previousUri,
        previousCid: context.previousCid,
        rootUri: context.rootUri,
        rootCid: context.rootCid,
        remainingParts: posts,
    }));
}

async function getFailedPosts(env: Env) {
    const failedPostKeys = await env.KV.list({ prefix: 'failed_post_' });
    const failedPosts = [];

    for (const { name } of failedPostKeys.keys) {
        const data = JSON.parse(await env.KV.get(name) || '{}');
        if (data.remainingParts?.length > 0) {
            failedPosts.push({ key: name, data });
        }
    }

    return failedPosts;
}
