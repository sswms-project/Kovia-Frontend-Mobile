const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function fixture(os, environment, unavailable = false) {
  let imports = 0, handlers = 0, posts = 0;
  const module = { exports: {} };
  const notifications = { setNotificationHandler() { handlers++; }, AndroidImportance: { HIGH: 4 },
    setNotificationChannelAsync: async () => {}, getPermissionsAsync: async () => ({status:'granted'}), getExpoPushTokenAsync: async () => ({data:'fixture-token'}) };
  const requireSource = name => {
    if (name === 'expo-constants') return { __esModule: true, default: { executionEnvironment: environment, expoConfig: {extra:{eas:{projectId:'fixture'}}} } };
    if (name === 'expo-device') return {isDevice:true};
    if (name === 'react-native') return {Platform:{OS:os}};
    if (name === '@/lib/api') return {api:{post:async()=>{posts++;}}};
    if (name === '@/lib/logger') return {logger:{warn(){}}};
    if (name === 'expo-notifications') { imports++; if (unavailable) throw new Error('Native module missing'); return notifications; }
    throw new Error(name);
  };
  const code=ts.transpileModule(readFileSync('src/features/notifications/push-registration.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(requireSource,module,module.exports);
  return {...module.exports,stats:()=>({imports,handlers,posts})};
}
test('auth import and Expo Go/web push setup never evaluate notifications native module',async()=>{
  for(const [os,environment] of [['android','storeClient'],['ios','storeClient'],['web','bare']]){
    const app=fixture(os,environment);
    assert.equal(app.stats().imports,0);
    assert.equal(await app.getPushNotifications(),null);
    assert.equal(await app.registerForPush(),null);
    assert.equal(app.stats().posts,0); assert.equal(app.stats().imports,0);
  }
});
test('supported build loads push once, while unavailable native module cannot prevent app startup',async()=>{
  const app=fixture('android','bare');
  assert.equal(app.stats().imports,0);
  await Promise.all([app.getPushNotifications(),app.getPushNotifications()]);
  assert.equal(await app.registerForPush(),'fixture-token');
  assert.deepEqual(app.stats(),{imports:1,handlers:1,posts:1});
  const missing=fixture('android','bare',true);
  assert.equal(await missing.getPushNotifications(),null);
  assert.equal(await missing.registerForPush(),null);
  assert.equal(missing.stats().posts,0);
});
