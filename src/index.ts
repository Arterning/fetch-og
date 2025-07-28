import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import axios from 'axios'
import * as cheerio from 'cheerio'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono ok!')
})




export async function crawlMetaData(url :string) {
  try {
    // 1. 获取网页内容
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MetadataScraper/1.0)',
      },
    })
    const html = response.data

    // 2. 解析 Open Graph 元数据
    const $ = cheerio.load(html)
    const metadata: Record<string, string> = {}

    // 提取所有 og: 标签
    $('meta[property^="og:"]').each((_, element) => {
      const property = $(element).attr('property')?.replace('og:', '')
      const content = $(element).attr('content')
      if (property && content) {
        metadata[property] = content
      }
    })

    // 3. 处理图片（如果存在）
    if (metadata.image) {
      try {
        const imageResponse = await axios.get(metadata.image, {
          responseType: 'arraybuffer',
        })
        const base64Image = Buffer.from(imageResponse.data, 'binary').toString('base64')
        metadata.image_base64 = `data:${imageResponse.headers['content-type']};base64,${base64Image}`
      } catch (error) {
        console.error('Failed to download image:', error)
        metadata.image_error = 'Image download failed'
        metadata.error = 'Failed to fetch image'
        metadata.image_base64 = ''
      }
    }

    return metadata
  } catch (error) {
    console.error('Error:', error)
    return {
      image_base64: '',
      error: 'Failed to fetch metadata',
    }
  }
}


app.get('/crawl', async (c) => {
  console.log('Received request to /crawl')
  const url = c.req.query('url')
  console.log('URL:', url)
  if (!url) {
    return c.json({ error: 'URL parameter is required' }, 400)
  }

  try {
    const metadata = await crawlMetaData(url)
    console.log('Metadata:', metadata)
    return c.json(metadata)
  } catch (error) {
    console.error('Error:', error)
    return c.json({ error: 'Failed to fetch metadata' }, 500)
  }

})

serve({
  fetch: app.fetch,
  port: 8088
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
