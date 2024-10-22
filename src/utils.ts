import AtpAgent from "@atproto/api";
import { Post } from "./types";
import { FeedEntry } from "@extractus/feed-extractor";

export const buildDescription = (val: string) => {
    const stripped = stripTags(String(val).trim().replace(/^<!\[CDATA\[|\]\]>$/g, ''))
    return stripped.replace(/\n+/g, ' ')
}

const stripTags = (s: string): string => {
    return toString(s).replace(/(<([^>]+)>)/ig, "").trim();
};

const toString = (input: any): string => {
    return !isString(input) ? String(input) : input;
};

const isString = (val: any): boolean => {
    return String(val) === val;
};

export function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function splitTextIntoParts(text: string, maxLength: number = 300): string[] {
    const parts: string[] = [];
    let currentPart = '';

    for (const char of text) {
        if (currentPart.length + char.length > maxLength) {
            parts.push(currentPart);
            currentPart = '';
        }
        currentPart += char;
    }

    if (currentPart.length > 0) {
        parts.push(currentPart);
    }

    return parts;
}

export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        result.push(array.slice(i, i + chunkSize));
    }
    return result;
}

export async function fetchImageAsBlob(url: string): Promise<Blob> {
    const response = await fetch(url);
    return response.blob();
}

export function extractImageUrls(html: string): string[] {
    const imageUrls: string[] = [];
    const regex = /<img[^>]+src="([^">]+)"/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
        imageUrls.push(match[1]);
    }
    return imageUrls;
}

export async function buildPost(item: FeedEntry, agent: AtpAgent): Promise<Post[]> {

    function helper(
        texts: string[],
        images: any[][],
        createdAt: string,
        index: number = 0,
        posts: Post[] = []
    ): Post[] {
        if (index >= texts.length && index >= images.length) {
            return posts;
        }

        const post: Post = {
            text: texts[index] || undefined,
            createdAt
        };

        if (images[index]) {
            post.embed = {
                $type: 'app.bsky.embed.images',
                images: images[index]
            };
        }

        posts.push(post);

        return helper(texts, images, createdAt, index + 1, posts);
    }

    const imageUrls = extractImageUrls(item.description || '');
    const images = await uploadImagesToBluesky(agent, imageUrls);

    const createdAt = item.published || new Date().toISOString();

    const text = buildDescription(item.description || '');
    const splitText = splitTextIntoParts(text);
    console.log(`Split text length: ${splitText.length}`);

    const imageGroups = chunkArray(images, 4);

    console.log(`Image groups: ${imageGroups.length}`);

    return helper(splitText, imageGroups, createdAt);
}

export async function uploadImagesToBluesky(agent: AtpAgent, imageUrls: string[]) {
    const images = [];

    for (const url of imageUrls) {
        const blob = await fetchImageAsBlob(url);
        const { data } = await agent.uploadBlob(blob);
        images.push({
            image: data.blob,
        });
    }

    return images;
}
