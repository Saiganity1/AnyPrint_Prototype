const { test, expect } = require('@playwright/test');

const mockUser = {
  id: 1,
  username: 'buyer',
  email: 'buyer@example.com',
  role: 'USER',
  role_label: 'User',
  is_staff: false,
  is_superuser: false,
};

const mockProduct = {
  id: 101,
  slug: 'classic-tee',
  name: 'Classic Tee',
  description: 'A premium test shirt.',
  price: '499.00',
  category: 'Essentials',
  print_style: 'Classic',
  stock_quantity: 20,
  image_url: '',
  is_featured: true,
  average_rating: 4.5,
  review_count: 3,
  variants: [
    { id: 201, size: 'M', color: 'Black', stock_quantity: 10, is_active: true },
    { id: 202, size: 'L', color: 'White', stock_quantity: 8, is_active: true },
  ],
  available_sizes: ['M', 'L'],
  available_colors: ['Black', 'White'],
  wishlist_saved: false,
};

function buildApiResponse(route, url) {
  if (url.endsWith('/auth/me/')) {
    return { ok: true, is_authenticated: true, user: mockUser };
  }

  if (url.endsWith('/categories/')) {
    return { ok: true, categories: [{ id: 1, name: 'Essentials', slug: 'essentials' }] };
  }

  if (url.includes('/products/?')) {
    return {
      ok: true,
      products: [mockProduct],
      pagination: { page: 1, page_size: 12, total_pages: 1, total_items: 1, has_next: false, has_previous: false },
    };
  }

  if (url.includes('/products/classic-tee/')) {
    return {
      ok: true,
      product: {
        ...mockProduct,
        reviews: [],
        related_products: [],
        frequently_bought_together: [],
      },
    };
  }

  if (url.endsWith('/wishlist/toggle/')) {
    return { ok: true, product_id: mockProduct.id, saved: true, count: 1 };
  }

  if (url.endsWith('/checkout/quote/')) {
    return {
      ok: true,
      quote: {
        subtotal_amount: '499.00',
        shipping_fee: '85.00',
        discount_amount: '0.00',
        bundle_discount_amount: '0.00',
        promo_discount_amount: '0.00',
        total_amount: '584.00',
        estimated_delivery_days: 3,
        delivery_eta_text: '2-4 days',
        estimated_delivery_date: '2026-04-30',
      },
    };
  }

  if (url.endsWith('/orders/')) {
    return {
      ok: true,
      order_id: 5001,
      tracking_number: 'AP-005001',
      payment_status: 'PENDING',
      payment_method: 'COD',
      status: 'PENDING',
      redirect_url: '',
      quote: {
        subtotal_amount: '499.00',
        shipping_fee: '85.00',
        discount_amount: '0.00',
        bundle_discount_amount: '0.00',
        total_amount: '584.00',
        estimated_delivery_days: 3,
        estimated_delivery_date: '2026-04-30',
      },
    };
  }

  return { ok: true };
}

async function mockApi(page, overrides = {}) {
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    const response = overrides[url] || buildApiResponse(route, url);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

test('product listing renders and add to cart works', async ({ page }) => {
  await mockApi(page);
  await page.goto('/shop.html');

  await expect(page.getByText('Classic Tee')).toBeVisible();
  await page.getByRole('button', { name: 'Add to Cart' }).click();
  await expect(page.getByText(/added to cart/i)).toBeVisible();
  await expect(page.locator('#cartCount')).toHaveText('1');
});

test('product detail can add item and open checkout', async ({ page }) => {
  await mockApi(page);
  await page.goto('/product.html?slug=classic-tee');

  await expect(page.getByText('Classic Tee')).toBeVisible();
  await page.getByRole('button', { name: 'Add to Cart' }).click();
  await expect(page.getByText(/added to cart/i)).toBeVisible();
  await page.getByRole('link', { name: /cart/i }).click();
  await expect(page).toHaveURL(/checkout\.html/);
});

test('checkout submit creates order', async ({ page }) => {
  await mockApi(page);
  await page.addInitScript((product) => {
    localStorage.setItem('tt_cart_v2', JSON.stringify([
      {
        key: 'variant:201',
        product_id: product.id,
        variant_id: 201,
        quantity: 1,
        size: 'M',
        color: 'Black',
        product_name: product.name,
        unit_price: product.price,
        image_url: '',
      },
    ]));
  }, mockProduct);

  await page.goto('/checkout.html');
  await expect(page.getByText('Cart Review')).toBeVisible();

  await page.locator('#toStep2').click();
  await page.locator('#checkoutFullName').fill('Buyer One');
  await page.locator('#checkoutEmail').fill('buyer@example.com');
  await page.locator('#checkoutPhone').fill('09171234567');
  await page.locator('#checkoutAddress').fill('123 Test Street, Quezon City');
  await page.locator('#addressForm button[type="submit"]').click();

  await page.locator('#paymentMethod').selectOption('COD');
  await page.locator('#paymentForm button[type="submit"]').click();
  await page.getByRole('button', { name: 'Place Order' }).click();

  await expect(page.getByText(/Order #5001 created successfully/i)).toBeVisible();
});
