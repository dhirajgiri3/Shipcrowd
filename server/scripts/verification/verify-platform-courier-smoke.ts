type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: Record<string, JsonValue>;
  includeCsrf?: boolean;
};

class CookieSession {
  private cookies = new Map<string, string>();
  private csrfToken = '';

  constructor(
    private readonly baseUrl: string,
    private readonly bearerToken?: string
  ) {}

  private updateCookies(setCookieHeaders: string[] | undefined): void {
    if (!setCookieHeaders?.length) return;
    for (const rawCookie of setCookieHeaders) {
      const [nameValue] = rawCookie.split(';');
      const separator = nameValue.indexOf('=');
      if (separator <= 0) continue;
      const name = nameValue.slice(0, separator).trim();
      const value = nameValue.slice(separator + 1).trim();
      if (!name) continue;
      this.cookies.set(name, value);
    }
  }

  private buildCookieHeader(): string | undefined {
    if (!this.cookies.size) return undefined;
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }

  async request(path: string, options: RequestOptions = {}): Promise<{ status: number; json: any }> {
    const method = options.method || 'GET';
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (this.bearerToken) {
      headers.Authorization = `Bearer ${this.bearerToken}`;
    }

    const cookieHeader = this.buildCookieHeader();
    if (cookieHeader) {
      headers.Cookie = cookieHeader;
    }

    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }

    if (options.includeCsrf && this.csrfToken) {
      headers['X-CSRF-Token'] = this.csrfToken;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    this.updateCookies(response.headers.getSetCookie?.() || undefined);

    let payload: any = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    return { status: response.status, json: payload };
  }

  async fetchCsrfToken(): Promise<void> {
    const response = await this.request('/auth/csrf-token');
    if (response.status !== 200) {
      throw new Error(`Failed to fetch CSRF token: HTTP ${response.status}`);
    }

    const token =
      response.json?.data?.csrfToken ||
      response.json?.csrfToken ||
      response.json?.data?.token;

    if (!token || typeof token !== 'string') {
      throw new Error('CSRF token not found in /auth/csrf-token response');
    }

    this.csrfToken = token;
  }

  async login(email: string, password: string): Promise<void> {
    await this.fetchCsrfToken();

    const loginResponse = await this.request('/auth/login', {
      method: 'POST',
      includeCsrf: true,
      body: {
        email,
        password,
      },
    });

    if (loginResponse.status !== 200) {
      const message = loginResponse.json?.error?.message || loginResponse.json?.message || 'Login failed';
      throw new Error(`Login failed for ${email}: HTTP ${loginResponse.status} - ${message}`);
    }

    // Refresh CSRF in authenticated context
    await this.fetchCsrfToken();
  }
}

const assertStatus = (
  failures: string[],
  label: string,
  actual: number,
  expected: number | number[]
): void => {
  const expectedValues = Array.isArray(expected) ? expected : [expected];
  if (!expectedValues.includes(actual)) {
    failures.push(`${label} expected ${expectedValues.join('/')} but got ${actual}`);
  }
};

const format = (value: unknown) => (typeof value === 'string' ? value : JSON.stringify(value));

async function main(): Promise<void> {
  const baseUrl = (process.env.SMOKE_BASE_URL || 'http://localhost:5005/api/v1').replace(/\/$/, '');

  const adminEmail = process.env.SMOKE_ADMIN_EMAIL || '';
  const adminPassword = process.env.SMOKE_ADMIN_PASSWORD || '';
  const adminBearer = process.env.SMOKE_ADMIN_BEARER || '';

  const sellerEmail = process.env.SMOKE_SELLER_EMAIL || '';
  const sellerPassword = process.env.SMOKE_SELLER_PASSWORD || '';
  const sellerBearer = process.env.SMOKE_SELLER_BEARER || '';

  const reverseQuoteEnabled = process.env.REVERSE_QUOTE_ENABLED === 'true';
  const failures: string[] = [];

  console.log(`[Smoke] Base URL: ${baseUrl}`);

  if (!adminBearer && (!adminEmail || !adminPassword)) {
    throw new Error('Missing admin auth: set SMOKE_ADMIN_BEARER or SMOKE_ADMIN_EMAIL + SMOKE_ADMIN_PASSWORD');
  }

  const adminSession = new CookieSession(baseUrl, adminBearer || undefined);
  if (!adminBearer) {
    await adminSession.login(adminEmail, adminPassword);
  } else {
    await adminSession.fetchCsrfToken();
  }

  const adminCouriers = await adminSession.request('/admin/couriers');
  assertStatus(failures, 'GET /admin/couriers', adminCouriers.status, 200);
  console.log(`[Smoke] GET /admin/couriers -> ${adminCouriers.status}`);

  const adminCourierServices = await adminSession.request('/admin/courier-services');
  assertStatus(failures, 'GET /admin/courier-services', adminCourierServices.status, 200);
  console.log(`[Smoke] GET /admin/courier-services -> ${adminCourierServices.status}`);

  const adminRateCards = await adminSession.request('/admin/service-ratecards');
  assertStatus(failures, 'GET /admin/service-ratecards', adminRateCards.status, 200);
  console.log(`[Smoke] GET /admin/service-ratecards -> ${adminRateCards.status}`);

  const hasSellerAuth =
    Boolean(sellerBearer) ||
    (Boolean(sellerEmail) && Boolean(sellerPassword));

  if (!hasSellerAuth) {
    console.log('[Smoke] Seller auth not provided. Skipping quote forward/reverse gate checks.');
  } else {
    const sellerSession = new CookieSession(baseUrl, sellerBearer || undefined);
    if (!sellerBearer) {
      await sellerSession.login(sellerEmail, sellerPassword);
    } else {
      await sellerSession.fetchCsrfToken();
    }

    const quotePayload = {
      fromPincode: '560001',
      toPincode: '110001',
      weight: 0.5,
      dimensions: {
        length: 10,
        width: 10,
        height: 10,
      },
      paymentMode: 'prepaid',
      orderValue: 1000,
      shipmentType: 'forward' as const,
    };

    const forward = await sellerSession.request('/quotes/courier-options', {
      method: 'POST',
      includeCsrf: true,
      body: quotePayload as unknown as Record<string, JsonValue>,
    });
    assertStatus(failures, 'POST /quotes/courier-options (forward)', forward.status, [201, 422, 503]);
    console.log(`[Smoke] POST /quotes/courier-options (forward) -> ${forward.status}`);

    const reverse = await sellerSession.request('/quotes/courier-options', {
      method: 'POST',
      includeCsrf: true,
      body: {
        ...quotePayload,
        shipmentType: 'reverse',
      } as unknown as Record<string, JsonValue>,
    });

    if (reverseQuoteEnabled) {
      assertStatus(failures, 'POST /quotes/courier-options (reverse)', reverse.status, [201, 422, 503]);
    } else {
      assertStatus(failures, 'POST /quotes/courier-options (reverse gate)', reverse.status, 422);
    }

    console.log(
      `[Smoke] POST /quotes/courier-options (reverse) -> ${reverse.status} | message=${format(
        reverse.json?.error?.message || reverse.json?.message
      )}`
    );
  }

  if (failures.length) {
    console.error('\n[Smoke] FAILED checks:');
    failures.forEach((failure) => console.error(` - ${failure}`));
    process.exit(1);
  }

  console.log('\n[Smoke] All checks passed.');
}

main().catch((error) => {
  console.error('[Smoke] Fatal error:', error instanceof Error ? error.message : error);
  process.exit(1);
});
