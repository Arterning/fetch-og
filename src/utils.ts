import axios from 'axios';
import * as cheerio from 'cheerio';

export const userAgents = [
  // ios (golden standard for publishers)
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1', // iphone safari (best overall)
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/123.0.6312.87 Mobile/15E148 Safari/604.1', // iphone chrome

  // android (good alternatives)
  'Mozilla/5.0 (Linux; Android 14; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36', // samsung flagship
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36', // pixel
];



// Helper function to convert ArrayBuffer to Base64 in a web-compatible way
export function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function crawlMetaData(url: string) {
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
