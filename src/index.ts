import { Hono } from 'hono';
import { crawlMetaData } from './utils';
import { getArticleWithBrowser } from './articleFetchers';

/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

// 定义环境变量类型
type Bindings = {
	CLOUDFLARE_ACCOUNT_ID: string;
	CLOUDFLARE_API_TOKEN: string;
	// 添加其他环境变量...
};


const app = new Hono<{ Bindings: Bindings }>();

app.get('/', (c) => {
	return c.text('Hello World!');
});

app.get('/crawlOpenGraph', async (c) => {
	const url = c.req.query('url');
	if (!url) {
		return c.json({ error: 'URL parameter is required' }, 400);
	}

	try {
		const metadata = await crawlMetaData(url);
		return c.json(metadata);
	} catch (error: any) {
		console.error('Error in /crawl handler:', error);
		return c.json({ error: error.message || 'Failed to fetch metadata' }, 500);
	}
});

app.get('/crawlArticle', async (c) => {
	const url = c.req.query('url');
	if (!url) {
		return c.json({ error: 'URL parameter is required' }, 400);
	}
	try {
		// 通过 c.env 访问环境变量
		const env = {
			CLOUDFLARE_ACCOUNT_ID: c.env.CLOUDFLARE_ACCOUNT_ID,
			CLOUDFLARE_API_TOKEN: c.env.CLOUDFLARE_API_TOKEN,
		};
		const article = await getArticleWithBrowser(env, url);
		if (article.isErr()) {
			return c.json({ error: article.error }, 500);
		}
		return c.json(article.value);
	}
	catch (error: any) {
		console.error('Error in /crawlArticle handler:', error);
		return c.json({ error: error.message || 'Failed to fetch article' }, 500);
	}
});


export default app;