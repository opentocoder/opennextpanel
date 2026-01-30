import { generateCompileScript, NGINX_PRESETS } from './src/lib/system/nginx-compiler';

const fullModules = NGINX_PRESETS.full.modules;

const script = generateCompileScript({
  version: '1.26.3',
  modules: fullModules,
  customModules: [],
  installPath: '/opt/nginx',
  optimizationLevel: 'O2',
  withDebug: false,
  parallelJobs: 4,
});

console.log(script);
