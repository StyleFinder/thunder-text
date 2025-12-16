/**
 * Hot Takes API Tests
 * Following TDD - these tests are written BEFORE implementation
 */

import { describe, it, expect } from '@jest/globals';
import { GET, POST } from '@/app/api/hot-takes/route';
import { PATCH } from '@/app/api/hot-takes/[id]/route';
import { NextRequest } from 'next/server';

describe('GET /api/hot-takes', () => {
  it('should return active hot takes sorted by published_at DESC', async () => {
    const request = new NextRequest('http://localhost:3050/api/hot-takes');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);

    // Should be sorted by published_at descending (newest first)
    if (data.data.length > 1) {
      const firstDate = new Date(data.data[0].published_at);
      const secondDate = new Date(data.data[1].published_at);
      expect(firstDate.getTime()).toBeGreaterThanOrEqual(secondDate.getTime());
    }
  });

  it('should limit results when limit parameter is provided', async () => {
    const request = new NextRequest('http://localhost:3050/api/hot-takes?limit=3');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.length).toBeLessThanOrEqual(3);
  });

  it('should return hot take with required fields', async () => {
    const request = new NextRequest('http://localhost:3050/api/hot-takes?limit=1');
    const response = await GET(request);
    const data = await response.json();

    if (data.data.length > 0) {
      const hotTake = data.data[0];
      expect(hotTake).toHaveProperty('id');
      expect(hotTake).toHaveProperty('title');
      expect(hotTake).toHaveProperty('content');
      expect(hotTake).toHaveProperty('published_at');
      expect(hotTake).toHaveProperty('created_at');
    }
  });
});

describe('POST /api/hot-takes', () => {
  it('should require authentication', async () => {
    const request = new NextRequest('http://localhost:3050/api/hot-takes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test Tip',
        content: 'Test content',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('should require coach role', async () => {
    // Test with store owner authorization (should fail)
    const request = new NextRequest('http://localhost:3050/api/hot-takes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-store.myshopify.com',
      },
      body: JSON.stringify({
        title: 'Test Tip',
        content: 'Test content',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain('coach');
  });

  it('should validate required fields', async () => {
    const request = new NextRequest('http://localhost:3050/api/hot-takes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer coach-token', // Mock coach auth
      },
      body: JSON.stringify({
        title: '',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it('should create hot take successfully with valid coach auth', async () => {
    const newHotTake = {
      title: 'New Ad Strategy Tip',
      content: 'Focus on mobile-first creative for better engagement',
    };

    const request = new NextRequest('http://localhost:3050/api/hot-takes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer coach-token', // Mock coach auth
      },
      body: JSON.stringify(newHotTake),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('id');
    expect(data.data.title).toBe(newHotTake.title);
    expect(data.data.content).toBe(newHotTake.content);
    expect(data.data.is_active).toBe(true);
  });
});

describe('PATCH /api/hot-takes/:id', () => {
  // Use valid UUID format for test IDs
  const TEST_UUID = '00000000-0000-0000-0000-000000000001';

  it('should require coach authentication', async () => {
    const request = new NextRequest(`http://localhost:3050/api/hot-takes/${TEST_UUID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: false }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: TEST_UUID }) });
    expect(response.status).toBe(401);
  });

  it('should allow coaches to deactivate hot takes', async () => {
    const request = new NextRequest(`http://localhost:3050/api/hot-takes/${TEST_UUID}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer coach-token',
      },
      body: JSON.stringify({ is_active: false }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: TEST_UUID }) });
    // Will be 200 or 404 depending on if test UUID exists in database
    expect([200, 404]).toContain(response.status);
  });
});
