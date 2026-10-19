const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
const axios = require('axios');

function loadSource(relativePath, dependencies = {}) {
  const filename = path.join(path.dirname(require.resolve('../package.json')), relativePath);
  const source = ts.transpileModule(readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const module = { exports: {} };
  const localRequire = (name) =>
    Object.hasOwn(dependencies, name) ? dependencies[name] : require(name);
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`, { filename })(
    localRequire,
    module,
    module.exports,
  );
  return module.exports;
}

const schemas = loadSource('src/features/auth/auth.schema.ts');

test('login bounds, captcha answer and OTP validation follow the auth contract', () => {
  assert.equal(
    schemas.loginSchema.safeParse({
      email: 'user@example.com',
      password: '12345678',
      captchaId: 'challenge',
    }).success,
    false,
  );
  assert.equal(
    schemas.loginSchema.safeParse({
      email: 'user@example.com',
      password: '12345678',
      captchaId: 'challenge',
      captchaAnswer: 'abc',
    }).success,
    true,
  );
  assert.equal(
    schemas.loginSchema.safeParse({ email: `${'a'.repeat(250)}@example.com`, password: '12345678' })
      .success,
    false,
  );
  for (const otp of ['12345', '1234567', 'abcdef', '123 45'])
    assert.equal(schemas.otpSchema.safeParse({ otp }).success, false);
  assert.equal(schemas.otpSchema.safeParse({ otp: '012345' }).success, true);
});

test('reset password rejects missing complexity and profile rejects invalid phone numbers', () => {
  for (const newPassword of ['short', 'onlylowercase', 'NoDigits!', 'NoSymbol123', 'NOLOWER123!']) {
    assert.equal(
      schemas.resetPasswordRequestSchema.safeParse({ token: 'token', newPassword }).success,
      false,
    );
  }
  assert.equal(
    schemas.resetPasswordRequestSchema.safeParse({ token: 'token', newPassword: 'ValidPass123!' }).success,
    true,
  );
  assert.equal(
    schemas.profileSchema.safeParse({ fullName: 'Name', phone: '+84901234567' }).success,
    true,
  );
  assert.equal(schemas.profileSchema.safeParse({ fullName: 'Name', phone: '' }).success, true);
  assert.equal(
    schemas.profileSchema.safeParse({ fullName: 'Name', phone: '12345' }).success,
    false,
  );
});

test('email tokens accept scheme/web links, preserve encoding and reject links without a token', () => {
  const { extractEmailToken } = loadSource('src/features/auth/email-token.ts');
  assert.equal(
    extractEmailToken('koviafrontendmobile://auth/reset-password?token=a%2Bb%2F%3D'),
    'a+b/=',
  );
  assert.equal(extractEmailToken('https://example.com/auth/verify-email?token=abc'), 'abc');
  assert.equal(extractEmailToken('https://example.com/auth/verify-email'), '');
  assert.equal(extractEmailToken(['abc', 'def']), 'abc');
});

test('dev reset form keeps confirmation separate from the backend request contract', () => {
  assert.equal(schemas.resetPasswordSchema.safeParse({
    password: 'ValidPass123!', confirmPassword: 'Different123!',
  }).success, false);
  assert.equal(schemas.resetPasswordSchema.safeParse({
    password: 'ValidPass123!', confirmPassword: 'ValidPass123!',
  }).success, true);
  assert.equal(schemas.verifyTwoFactorSchema.safeParse({ otp: '012345' }).success, true);
  assert.equal(schemas.loginSchema.safeParse({ email: 'user@example.com', password: '12345678',
    captchaId: 'a'.repeat(37), captchaAnswer: 'answer' }).success, false);
});

test('merged API preserves dev auth messages and local profile/settings payloads', async () => {
  const calls = [];
  const response = { data: { isSuccess: true, statusCode: 200, message: 'Thông báo', data: { id: 'profile' } } };
  const { authApi } = loadSource('src/features/auth/auth.api.ts', {
    '@/lib/api': {
      api: {
        get: async (...args) => { calls.push(['get', ...args]); return response; },
        post: async (...args) => { calls.push(['post', ...args]); return response; },
        delete: async (...args) => { calls.push(['delete', ...args]); return response; },
      },
      unwrap: (value) => value.data.data,
    },
  });
  assert.equal(await authApi.forgotPassword({ email: 'user@example.com' }), 'Thông báo');
  const signal = new AbortController().signal;
  assert.deepEqual(await authApi.profile(signal), { id: 'profile' });
  await authApi.verify2FA({ tempToken: 'temporary', otp: '012345' });
  await authApi.disableTwoFactor({ otp: '012345' });
  assert.deepEqual(calls, [
    ['post', '/auth/forgot-password', { email: 'user@example.com' }],
    ['get', '/auth/me', { signal }],
    ['post', '/auth/verify-2fa', { tempToken: 'temporary', otp: '012345' }],
    ['delete', '/settings/2fa', { data: { otp: '012345' } }],
  ]);
});

function apiFixture(
  storage,
  refresh = async () => {
    throw new Error('Unexpected token refresh');
  },
) {
  return loadSource('src/lib/api.ts', {
    './token-storage': { tokenStorage: storage },
    axios: { create: axios.create, post: refresh },
  });
}

function unauthorized(config, errors) {
  return Promise.reject(
    new axios.AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, {
      status: 401,
      data: { statusCode: 401, message: 'Mã không đúng', errors },
      headers: {},
      config,
    }),
  );
}

test('business 403 notifies scope revalidation; auth 403 and unsubscribed handlers do not', async () => {
  const { api, subscribeAccessDenied } = apiFixture({ get: async () => null });
  let notifications = 0;
  const unsubscribe = subscribeAccessDenied(() => { notifications += 1; });
  api.defaults.adapter = (config) => Promise.reject(new axios.AxiosError('Forbidden', 'ERR_BAD_REQUEST', config, undefined, {
    status: 403, data: { message: 'Forbidden' }, headers: {}, config,
  }));
  await assert.rejects(api.get('/inventory'));
  assert.equal(notifications, 1);
  await assert.rejects(api.get('/auth/me'));
  assert.equal(notifications, 1);
  unsubscribe();
  await assert.rejects(api.get('/inventory'));
  assert.equal(notifications, 1);
});

test('public captcha/login requests do not require a saved session; metadata is preserved', async () => {
  const { api, ApiError } = apiFixture({
    get: async () => {
      throw new Error('SecureStore must not be read');
    },
  });
  api.defaults.adapter = (config) => unauthorized(config, { requiresCaptcha: ['true'] });
  await assert.rejects(
    api.post('/auth/login', { email: 'user@example.com', password: 'Invalid123!' }),
    (error) => {
      assert.ok(error instanceof ApiError);
      assert.deepEqual(error.errors.requiresCaptcha, ['true']);
      return true;
    },
  );
});

test('incorrect login or settings OTP never triggers refresh or expires the session', async () => {
  let expired = 0;
  const { api, setSessionExpiredHandler } = apiFixture({
    get: async () => ({ accessToken: 'old', refreshToken: 'refresh' }),
  });
  setSessionExpiredHandler(() => expired++);
  api.defaults.adapter = (config) => unauthorized(config);
  await assert.rejects(api.post('/auth/verify-2fa', { tempToken: 'temporary', otp: '000000' }));
  await assert.rejects(api.delete('/settings/2fa', { data: { otp: '000000' } }));
  assert.equal(expired, 0);
});

test('late refresh cannot overwrite a session cleared by logout', async () => {
  let current = { accessToken: 'old', refreshToken: 'old-refresh' };
  let startRefresh;
  let finishRefresh;
  const started = new Promise((resolve) => {
    startRefresh = resolve;
  });
  const response = new Promise((resolve) => {
    finishRefresh = resolve;
  });
  const { api } = apiFixture(
    {
      get: async () => current,
      clear: async () => {
        current = null;
      },
      replaceIfCurrent: async (expected, tokens) => {
        if (current?.refreshToken !== expected) return false;
        current = tokens;
        return true;
      },
    },
    async () => {
      startRefresh();
      return response;
    },
  );
  api.defaults.adapter = (config) => unauthorized(config);
  const request = assert.rejects(api.get('/auth/me'));
  await started;
  current = null;
  finishRefresh({ data: { data: { accessToken: 'new', refreshToken: 'new-refresh' } } });
  await request;
  assert.equal(current, null);
});

test('SecureStore serializes refresh and logout and rejects a stale refresh write', async () => {
  const saved = new Map();
  const { tokenStorage } = loadSource('src/lib/token-storage.ts', {
    'expo-secure-store': {
      getItemAsync: async (key) => saved.get(key) ?? null,
      setItemAsync: async (key, value) => {
        saved.set(key, value);
      },
      deleteItemAsync: async (key) => {
        saved.delete(key);
      },
    },
  });
  await tokenStorage.set({ accessToken: 'a', refreshToken: 'r' });
  await Promise.all([
    tokenStorage.replaceIfCurrent('r', { accessToken: 'b', refreshToken: 's' }),
    tokenStorage.clear(),
  ]);
  assert.equal(await tokenStorage.get(), null);
  assert.equal(
    await tokenStorage.replaceIfCurrent('s', { accessToken: 'c', refreshToken: 't' }),
    false,
  );
  await tokenStorage.set({ accessToken: 'new-account', refreshToken: 'new-account-refresh' });
  await tokenStorage.clearIfCurrent('old-account-refresh');
  assert.equal((await tokenStorage.get()).accessToken, 'new-account');
});

test('a failed refresh from the previous account cannot sign out a new account', async () => {
  let current = { accessToken: 'old', refreshToken: 'old-refresh' };
  let startRefresh;
  let failRefresh;
  const started = new Promise((resolve) => {
    startRefresh = resolve;
  });
  const response = new Promise((resolve, reject) => {
    failRefresh = reject;
  });
  let expired = 0;
  const { api, setSessionExpiredHandler } = apiFixture(
    {
      get: async () => current,
      clearIfCurrent: async (expected) => {
        if (current?.refreshToken === expected) current = null;
      },
    },
    async () => {
      startRefresh();
      return response;
    },
  );
  setSessionExpiredHandler(() => expired++);
  api.defaults.adapter = (config) => unauthorized(config);
  const request = assert.rejects(api.get('/auth/me'));
  await started;
  current = { accessToken: 'new-account', refreshToken: 'new-account-refresh' };
  failRefresh(new Error('Old refresh rejected'));
  await request;
  assert.equal(current.accessToken, 'new-account');
  assert.equal(expired, 0);
});

test('session cleanup removes cached data from the previous account', async () => {
  const { queryClient, clearSessionQueries } = loadSource('src/providers/query-provider.tsx', {
    '@/features/warehouse-access/warehouse-access.store': loadSource('src/features/warehouse-access/warehouse-access.store.ts'),
  });
  queryClient.setQueryData(['auth', 'profile'], { fullName: 'Previous account' });
  queryClient.setQueryData(['warehouse', 'balances'], [{ quantity: 42 }]);
  await clearSessionQueries();
  assert.equal(queryClient.getQueryData(['auth', 'profile']), undefined);
  assert.equal(queryClient.getQueryCache().getAll().length, 0);
});

test('offline logout still clears credentials, cached queries and pending 2FA', async () => {
  const events = [];
  const { useAuth } = loadSource('src/features/auth/auth.store.ts', {
    '@/lib/api': { setSessionExpiredHandler: () => undefined },
    '@/lib/token-storage': { tokenStorage: { clear: async () => events.push('tokens') } },
    '@/providers/query-provider': { clearSessionQueries: async () => events.push('queries') },
    './auth.api': {
      authApi: {
        logout: async () => {
          throw new Error('offline');
        },
      },
    },
  });
  useAuth.setState({ signedIn: true });
  useAuth.getState().beginTwoFactor('temporary');
  await useAuth.getState().signOut();
  assert.deepEqual(events, ['tokens', 'queries']);
  assert.equal(useAuth.getState().signedIn, false);
  assert.equal(useAuth.getState().twoFactor, null);
  assert.match(useAuth.getState().notice, /Không kết nối/);
});

test('scoped write is blocked if scope changes while SecureStore is being read', async () => {
  let finishRead;
  let readStarted;
  let scopeValid = true;
  let dispatched = false;
  const started = new Promise((resolve) => { readStarted = resolve; });
  const pending = new Promise((resolve) => { finishRead = resolve; });
  const { api } = apiFixture({ get: async () => { readStarted(); await pending; return { accessToken: 'old', refreshToken: 'r' }; } });
  api.defaults.adapter = async (config) => { dispatched = true; return { status: 200, data: {}, headers: {}, config }; };
  const request = assert.rejects(api.post('/my-warehouse-tasks/Receiving/task/actions', { action: 'Start' }, {
    assertCurrentContext: () => { if (!scopeValid) throw new Error('Kho đã thay đổi'); },
  }), (error) => error.statusCode === 409 && error.message === 'Kho đã thay đổi');
  await started;
  scopeValid = false;
  finishRead();
  await request;
  assert.equal(dispatched, false);
});
