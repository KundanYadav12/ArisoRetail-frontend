/**
 * Public Storefront API Client
 * 
 * Communicates with /api/store endpoints for customer browsing, cart, checkout,
 * and order status tracking.
 */

import { getApiUrl, resolveImageUrl } from '../utils/api';

export { resolveImageUrl };

export async function resolveStorefront(subdomain) {
  const url = getApiUrl(`/api/store/resolve/${encodeURIComponent(subdomain)}`);
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || data.error || 'Storefront not found or offline.');
  }
  return await res.json();
}

export async function fetchStoreCatalog(subdomain, params = {}) {
  const q = new URLSearchParams();
  if (params.category_id) q.set('category_id', params.category_id);
  if (params.search) q.set('search', params.search);
  if (params.featured) q.set('featured', 'true');

  const url = getApiUrl(`/api/store/${encodeURIComponent(subdomain)}/catalog?${q.toString()}`);
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch catalog.');
  }
  return await res.json();
}

export async function fetchStoreProduct(subdomain, productId) {
  const url = getApiUrl(`/api/store/${encodeURIComponent(subdomain)}/product/${encodeURIComponent(productId)}`);
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Product not found.');
  }
  return await res.json();
}

export async function validateStoreCart(subdomain, { items, delivery_preference = 'delivery' }) {
  const url = getApiUrl(`/api/store/${encodeURIComponent(subdomain)}/cart/validate`);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, delivery_preference })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Cart validation failed.');
  }
  return data;
}

export async function submitStoreCheckout(subdomain, orderData) {
  const url = getApiUrl(`/api/store/${encodeURIComponent(subdomain)}/checkout`);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Failed to submit order.');
  }
  return data;
}

export async function verifyStorePayment(subdomain, paymentData) {
  const url = getApiUrl(`/api/store/${encodeURIComponent(subdomain)}/verify-payment`);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paymentData)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Payment verification failed.');
  }
  return data;
}

export async function trackStoreOrder(subdomain, orderNumber, { token, phone }) {
  const q = new URLSearchParams();
  if (token) q.set('token', token);
  if (phone) q.set('phone', phone);

  const url = getApiUrl(`/api/store/${encodeURIComponent(subdomain)}/order-status/${encodeURIComponent(orderNumber)}?${q.toString()}`);
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Order tracking not found.');
  }
  return data;
}
