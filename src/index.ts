/**
 * Welcome to Cloudflare Workers!
 *
 * This is a template for a Scheduled Worker: a Worker that can run on a
 * configurable interval:
 * https://developers.cloudflare.com/workers/platform/triggers/cron-triggers/
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Run `curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"` to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import { postToBsky, retryFailedPosts } from './bsky';
import { extract, FeedEntry } from '@extractus/feed-extractor';


export default {
	// The scheduled handler is invoked at the interval set in our wrangler.toml's
	// [[triggers]] configuration.
	async scheduled(event, env, ctx): Promise<void> {

		switch (event.cron) {
			case '1-59/5 * * * *':
				await handleCron(env);
				break;
			case '2-59/15 * * * *':
				await retryFailedPosts(env);
				break;
			default:
				console.log('Unknown cron schedule:', event.cron);
				break;
		}
		console.log(`trigger fired at ${event.cron}`);
	},
} satisfies ExportedHandler<Env>;


async function saveLastGuids(items: FeedEntry[], env: Env) {
	await env.KV.put('last_items', JSON.stringify(items));
}

async function handleCron(env: Env) {
	const rssData = await extract(env.FEED_URL, {
		getExtraEntryFields: (feedEntry: any) => {
			const { 'content:encoded': contentEncoded, description } = feedEntry
			return {
				description: description
			}
		}
	},);

	const currentItems = rssData.entries || [];

	const lastItems = await env.KV.get('last_items', 'json');
	if (!lastItems) {
		await saveLastGuids(currentItems, env);
	}
	const lastItemSet = new Set(Array.isArray(lastItems) ? lastItems : []);

	const newItems = currentItems.filter((item) => !lastItemSet.has(item.id));

	if (newItems.length > 0) {
		await postToBsky(newItems, env);
		await saveLastGuids(currentItems, env);
	} else {
		console.log('No new items found.');
	}
}