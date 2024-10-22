import { extractImageUrls } from '../src/utils';

import { expect, test } from 'vitest'

test('extractImageUrls', () => {
  const html = `
  <p>Some text</p>
  <img src="https://example.com/image1.jpg" />
  <img src="https://example.com/image2.png" />
  <img src="https://example.com/image3.gif" />
  <img src="https://example.com/image4.webp" />
  <img src="https://example.com/image5.jpg" />
`;

  const expectedUrls = [
    'https://example.com/image1.jpg',
    'https://example.com/image2.png',
    'https://example.com/image3.gif',
    'https://example.com/image4.webp',
    'https://example.com/image5.jpg',
  ];

  const result = extractImageUrls(html);
  expect(result).toEqual(expectedUrls);
})

test("no image", () => {
  const html = `
  <p>Some text</p>
`;
  const expectedUrls: string[] = [];
  const result = extractImageUrls(html);
  expect(result).toEqual(expectedUrls);
})