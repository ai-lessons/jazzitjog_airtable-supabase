import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
      return NextResponse.json(
        { error: 'Missing url parameter' },
        { status: 400 }
      );
    }

    // Validate URL
    let url: URL;
    try {
      url = new URL(targetUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL' },
        { status: 400 }
      );
    }

    // Fetch the target page
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type');

    // Only proxy HTML content
    if (!contentType?.includes('text/html')) {
      return NextResponse.json(
        { error: 'Target URL is not HTML content' },
        { status: 400 }
      );
    }

    const html = await response.text();

    // Parse HTML and extract text content
    const $ = cheerio.load(html);

    // Remove script, style, and other non-content tags
    $('script, style, noscript, iframe, svg').remove();

    // Get text content with basic structure
    const title = $('title').text() || $('h1').first().text() || 'Page Content';

    // Extract main content (try common content selectors)
    let mainContent = $('main, article, .content, .post-content, .article-content, #content').text();

    // Fallback to body if no main content found
    if (!mainContent || mainContent.trim().length < 100) {
      mainContent = $('body').text();
    }

    // Clean up whitespace
    const cleanedContent = mainContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');

    // Return as JSON
    return NextResponse.json({
      url: targetUrl,
      title: title.trim(),
      content: cleanedContent
    });

  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal proxy error' },
      { status: 500 }
    );
  }
}
