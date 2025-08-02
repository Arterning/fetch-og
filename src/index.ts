import { Hono } from 'hono';
import axios from 'axios';
import * as cheerio from 'cheerio';

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

// Helper function to convert ArrayBuffer to Base64 in a web-compatible way
function arrayBufferToBase64(buffer: ArrayBuffer) {
	let binary = '';
	const bytes = new Uint8Array(buffer);
	const len = bytes.byteLength;
	for (let i = 0; i < len; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

async function crawlMetaData(url: string) {
	try {
		// 1. Get web page content
		const response = await axios.get(url, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (compatible; MetadataScraper/1.0)',
			},
		});
		const html = response.data;

		// 2. Parse Open Graph metadata
		const $ = cheerio.load(html);
		const metadata: Record<string, string> = {};

		// Extract all og: tags
		$('meta[property^="og:"]').each((_, element) => {
			const property = $(element).attr('property')?.replace('og:', '');
			const content = $(element).attr('content');
			if (property && content) {
				metadata[property] = content;
			}
		});

		// 3. Process image (if it exists)
		if (metadata.image) {
			try {
				const imageResponse = await axios.get(metadata.image, {
					responseType: 'arraybuffer',
				});
				const base64Image = arrayBufferToBase64(imageResponse.data);
				metadata.image_base64 = `data:${imageResponse.headers['content-type']};base64,${base64Image}`;
			} catch (error) {
				console.error('Failed to download image:', error);
				metadata.image_error = 'Image download failed';
				metadata.image_base64 = '';
			}
		}

		return metadata;
	} catch (error) {
		console.error('Error fetching metadata:', error);
		throw new Error('Failed to fetch metadata');
	}
}

const app = new Hono();

app.get('/', (c) => {
	return c.text('Hello World!');
});

app.get('/crawl', async (c) => {
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

export default app;