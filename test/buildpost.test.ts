import { AtpAgent } from '@atproto/api';
import { buildPost, splitTextIntoParts } from '../src/utils';
import { FeedEntry } from '@extractus/feed-extractor';
import { expect, test } from 'vitest'


test('should handle empty description gracefully', async () => {
    const agent = new AtpAgent({ service: 'https://bsky.social' });

    const item: FeedEntry = {
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam sed pellentesque enim. Morbi egestas sapien at lacus sollicitudin feugiat. Donec tincidunt porta quam ut ornare. Proin consectetur blandit ex quis sagittis. Quisque faucibus porta malesuada. Nulla porta arcu sed tortor congue, cursus iaculis odio luctus. Vivamus volutpat sapien in tincidunt ullamcorper. ',
        published: new Date().toISOString(),
        id: 'abc123'
    };

    const posts = await buildPost(item, agent);

    expect(posts).toHaveLength(2);
});

test('should split text into parts', () => {
    const text = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam sed pellentesque enim. Morbi egestas sapien at lacus sollicitudin feugiat. Donec tincidunt porta quam ut ornare. Proin consectetur blandit ex quis sagittis. Quisque faucibus porta malesuada. Nulla porta arcu sed tortor congue, cursus iaculis odio luctus. Vivamus volutpat sapien in tincidunt ullamcorper. ';
    const parts = splitTextIntoParts(text);

    expect(parts).toHaveLength(2);
    expect(parts).toEqual([
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam sed pellentesque enim. Morbi egestas sapien at lacus sollicitudin feugiat. Donec tincidunt porta quam ut ornare. Proin consectetur blandit ex quis sagittis. Quisque faucibus porta malesuada. Nulla porta arcu sed tortor congue, cursus iac',
        'ulis odio luctus. Vivamus volutpat sapien in tincidunt ullamcorper. ',
    ]);
});

test('should return a single part if text is short enough', () => {
    const text = 'Short text';
    const parts = splitTextIntoParts(text, 50);

    expect(parts).toHaveLength(1);
    expect(parts[0]).toBe(text);
});
