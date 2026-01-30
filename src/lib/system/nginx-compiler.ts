/**
 * Nginx 自定义编译模块
 * 支持用户选择模块进行源码编译安装
 */

export interface NginxModule {
  id: string;
  name: string;
  description: string;
  category: string;
  flag: string;                    // 编译参数
  repo?: string;                   // 第三方模块 Git 仓库
  branch?: string;                 // Git 分支
  submodules?: boolean;            // 是否需要 --recursive
  dependencies?: string[];         // 系统依赖包
  requires?: string[];             // 依赖其他模块
  conflicts?: string[];            // 冲突模块
  default?: boolean;               // 是否默认选中
  warning?: string;                // 警告信息
  compileTime?: 'fast' | 'medium' | 'slow';  // 编译耗时
}

export interface NginxVersion {
  version: string;
  type: 'stable' | 'mainline' | 'legacy';
  releaseDate: string;
  recommended?: boolean;
}

// 可用的 Nginx 版本
export const NGINX_VERSIONS: NginxVersion[] = [
  { version: '1.26.3', type: 'stable', releaseDate: '2025-01', recommended: true },
  { version: '1.27.4', type: 'mainline', releaseDate: '2025-01' },
  { version: '1.24.0', type: 'legacy', releaseDate: '2023-04' },
];

// 模块分类
export const MODULE_CATEGORIES = {
  core: '核心模块',
  performance: '性能优化',
  security: '安全防护',
  compression: '压缩算法',
  cache: '缓存管理',
  headers: '头部/内容处理',
  lua: 'Lua 脚本',
  monitoring: '监控统计',
  upstream: '负载均衡',
  media: '流媒体',
  webdav: 'WebDAV',
  misc: '功能扩展',
};

// 完整模块列表
export const NGINX_MODULES: NginxModule[] = [
  // ==================== 核心模块 ====================
  {
    id: 'http_ssl_module',
    name: 'SSL/HTTPS',
    description: '启用 HTTPS 支持，必选模块',
    category: 'core',
    flag: '--with-http_ssl_module',
    dependencies: ['libssl-dev'],
    default: true,
    compileTime: 'fast',
  },
  {
    id: 'http_v2_module',
    name: 'HTTP/2',
    description: '启用 HTTP/2 协议支持，提升并发性能',
    category: 'core',
    flag: '--with-http_v2_module',
    requires: ['http_ssl_module'],
    default: true,
    compileTime: 'fast',
  },
  {
    id: 'http_v3_module',
    name: 'HTTP/3 (QUIC)',
    description: '启用 HTTP/3 和 QUIC 协议，需要 BoringSSL/quictls',
    category: 'core',
    flag: '--with-http_v3_module',
    requires: ['http_ssl_module'],
    warning: '需要特殊 SSL 库支持，可能增加编译复杂度',
    default: false,
    compileTime: 'slow',
  },
  {
    id: 'http_realip_module',
    name: '真实 IP',
    description: '从代理/CDN 头部获取客户端真实 IP',
    category: 'core',
    flag: '--with-http_realip_module',
    default: true,
    compileTime: 'fast',
  },
  {
    id: 'http_gzip_static_module',
    name: '静态 Gzip',
    description: '直接发送预压缩的 .gz 文件，减少 CPU 消耗',
    category: 'core',
    flag: '--with-http_gzip_static_module',
    default: true,
    compileTime: 'fast',
  },
  {
    id: 'http_gunzip_module',
    name: 'Gunzip 解压',
    description: '为不支持 gzip 的客户端解压响应',
    category: 'core',
    flag: '--with-http_gunzip_module',
    default: false,
    compileTime: 'fast',
  },
  {
    id: 'http_stub_status_module',
    name: '状态监控',
    description: '提供基本状态信息页面 (连接数、请求数等)',
    category: 'core',
    flag: '--with-http_stub_status_module',
    default: true,
    compileTime: 'fast',
  },
  {
    id: 'http_sub_module',
    name: '内容替换',
    description: '替换响应内容中的字符串',
    category: 'core',
    flag: '--with-http_sub_module',
    default: true,
    compileTime: 'fast',
  },
  {
    id: 'http_addition_module',
    name: '内容追加',
    description: '在响应前后追加内容',
    category: 'core',
    flag: '--with-http_addition_module',
    default: false,
    compileTime: 'fast',
  },
  {
    id: 'http_auth_request_module',
    name: '认证请求',
    description: '基于子请求结果进行认证',
    category: 'core',
    flag: '--with-http_auth_request_module',
    default: true,
    compileTime: 'fast',
  },
  {
    id: 'http_secure_link_module',
    name: '安全链接',
    description: '验证请求链接的真实性，防盗链',
    category: 'core',
    flag: '--with-http_secure_link_module',
    default: true,
    compileTime: 'fast',
  },
  {
    id: 'http_slice_module',
    name: '分片请求',
    description: '将大文件请求分割为小块，用于缓存优化',
    category: 'core',
    flag: '--with-http_slice_module',
    default: false,
    compileTime: 'fast',
  },
  {
    id: 'http_image_filter_module',
    name: '图片处理',
    description: '实时裁剪、缩放、旋转图片',
    category: 'core',
    flag: '--with-http_image_filter_module',
    dependencies: ['libgd-dev'],
    default: false,
    compileTime: 'fast',
  },
  {
    id: 'http_xslt_module',
    name: 'XSLT 转换',
    description: '使用 XSLT 转换 XML 响应',
    category: 'core',
    flag: '--with-http_xslt_module',
    dependencies: ['libxslt1-dev'],
    default: false,
    compileTime: 'fast',
  },
  {
    id: 'http_dav_module',
    name: 'WebDAV 基础',
    description: 'WebDAV 基础支持 (PUT/DELETE/MKCOL/COPY/MOVE)',
    category: 'webdav',
    flag: '--with-http_dav_module',
    default: false,
    compileTime: 'fast',
  },
  {
    id: 'http_flv_module',
    name: 'FLV 流媒体',
    description: 'FLV 文件伪流媒体支持',
    category: 'media',
    flag: '--with-http_flv_module',
    default: false,
    compileTime: 'fast',
  },
  {
    id: 'http_mp4_module',
    name: 'MP4 流媒体',
    description: 'MP4 文件伪流媒体支持，支持拖动播放',
    category: 'media',
    flag: '--with-http_mp4_module',
    default: true,
    compileTime: 'fast',
  },
  {
    id: 'stream',
    name: 'TCP/UDP 代理',
    description: '四层代理，支持 TCP/UDP 负载均衡',
    category: 'core',
    flag: '--with-stream',
    default: true,
    compileTime: 'fast',
  },
  {
    id: 'stream_ssl_module',
    name: 'Stream SSL',
    description: 'TCP/UDP 代理的 SSL 支持',
    category: 'core',
    flag: '--with-stream_ssl_module',
    requires: ['stream', 'http_ssl_module'],
    default: true,
    compileTime: 'fast',
  },
  {
    id: 'stream_realip_module',
    name: 'Stream 真实 IP',
    description: 'TCP/UDP 代理获取真实 IP',
    category: 'core',
    flag: '--with-stream_realip_module',
    requires: ['stream'],
    default: false,
    compileTime: 'fast',
  },
  {
    id: 'stream_ssl_preread_module',
    name: 'Stream SNI 预读',
    description: '无需解密即可读取 SSL 握手中的 SNI',
    category: 'core',
    flag: '--with-stream_ssl_preread_module',
    requires: ['stream'],
    default: true,
    compileTime: 'fast',
  },
  {
    id: 'mail',
    name: '邮件代理',
    description: 'IMAP/POP3/SMTP 代理',
    category: 'core',
    flag: '--with-mail',
    default: false,
    compileTime: 'fast',
  },
  {
    id: 'mail_ssl_module',
    name: '邮件 SSL',
    description: '邮件代理 SSL 支持',
    category: 'core',
    flag: '--with-mail_ssl_module',
    requires: ['mail', 'http_ssl_module'],
    default: false,
    compileTime: 'fast',
  },

  // ==================== 性能优化 ====================
  {
    id: 'pcre_jit',
    name: 'PCRE JIT',
    description: '正则表达式 JIT 编译加速',
    category: 'performance',
    flag: '--with-pcre-jit',
    dependencies: ['libpcre3-dev'],
    default: true,
    compileTime: 'fast',
  },
  {
    id: 'threads',
    name: '线程池',
    description: '多线程处理阻塞操作，提升并发',
    category: 'performance',
    flag: '--with-threads',
    default: true,
    compileTime: 'fast',
  },
  {
    id: 'file_aio',
    name: '异步文件 IO',
    description: 'Linux 异步文件 IO 支持',
    category: 'performance',
    flag: '--with-file-aio',
    default: true,
    compileTime: 'fast',
  },

  // ==================== 压缩算法 ====================
  {
    id: 'ngx_brotli',
    name: 'Brotli 压缩',
    description: 'Google Brotli 压缩，比 Gzip 更高效',
    category: 'compression',
    flag: '--add-module=/tmp/nginx-modules/ngx_brotli',
    repo: 'https://github.com/google/ngx_brotli.git',
    submodules: true,
    dependencies: ['libbrotli-dev'],
    default: true,
    compileTime: 'medium',
  },
  {
    id: 'zstd_nginx_module',
    name: 'Zstd 压缩',
    description: 'Facebook Zstd 压缩算法，高速高压缩比',
    category: 'compression',
    flag: '--add-module=/tmp/nginx-modules/zstd-nginx-module',
    repo: 'https://github.com/tokers/zstd-nginx-module.git',
    dependencies: ['libzstd-dev'],
    default: false,
    compileTime: 'medium',
  },

  // ==================== 缓存管理 ====================
  {
    id: 'ngx_cache_purge',
    name: '缓存清理',
    description: '清除 FastCGI/Proxy/SCGI/uWSGI 缓存',
    category: 'cache',
    flag: '--add-module=/tmp/nginx-modules/ngx_cache_purge',
    repo: 'https://github.com/nginx-modules/ngx_cache_purge.git',
    default: true,
    compileTime: 'fast',
  },
  {
    id: 'srcache_nginx_module',
    name: '子请求缓存',
    description: '透明子请求缓存，支持 Redis/Memcached 后端',
    category: 'cache',
    flag: '--add-module=/tmp/nginx-modules/srcache-nginx-module',
    repo: 'https://github.com/openresty/srcache-nginx-module.git',
    default: false,
    compileTime: 'fast',
  },

  // ==================== 头部/内容处理 ====================
  {
    id: 'headers_more',
    name: '更多头部控制',
    description: '添加、修改、清除请求/响应头部',
    category: 'headers',
    flag: '--add-module=/tmp/nginx-modules/headers-more-nginx-module',
    repo: 'https://github.com/openresty/headers-more-nginx-module.git',
    default: true,
    compileTime: 'fast',
  },
  {
    id: 'ngx_http_substitutions_filter',
    name: '高级内容替换',
    description: '支持正则表达式的响应内容替换',
    category: 'headers',
    flag: '--add-module=/tmp/nginx-modules/ngx_http_substitutions_filter_module',
    repo: 'https://github.com/yaoweibin/ngx_http_substitutions_filter_module.git',
    default: true,
    compileTime: 'fast',
  },
  {
    id: 'echo_nginx_module',
    name: 'Echo 调试',
    description: 'echo、sleep、time 等调试指令',
    category: 'headers',
    flag: '--add-module=/tmp/nginx-modules/echo-nginx-module',
    repo: 'https://github.com/openresty/echo-nginx-module.git',
    default: false,
    compileTime: 'fast',
  },
  {
    id: 'set_misc_nginx_module',
    name: 'Set Misc',
    description: '扩展 set 指令，支持 MD5、Base64 等',
    category: 'headers',
    flag: '--add-module=/tmp/nginx-modules/set-misc-nginx-module',
    repo: 'https://github.com/openresty/set-misc-nginx-module.git',
    requires: ['ngx_devel_kit'],
    default: false,
    compileTime: 'fast',
  },
  {
    id: 'ngx_devel_kit',
    name: 'NDK 开发套件',
    description: '第三方模块开发基础库',
    category: 'misc',
    flag: '--add-module=/tmp/nginx-modules/ngx_devel_kit',
    repo: 'https://github.com/vision5/ngx_devel_kit.git',
    default: false,
    compileTime: 'fast',
  },

  // ==================== 安全防护 ====================
  {
    id: 'naxsi',
    name: 'NAXSI WAF',
    description: '轻量级 WAF，低维护成本，白名单模式',
    category: 'security',
    flag: '--add-module=/tmp/nginx-modules/naxsi/naxsi_src',
    repo: 'https://github.com/warber/naxsi.git',
    default: false,
    warning: '需要配置规则才能正常使用',
    compileTime: 'medium',
  },
  {
    id: 'modsecurity_nginx',
    name: 'ModSecurity WAF',
    description: '功能强大的 WAF，支持 OWASP CRS 规则集',
    category: 'security',
    flag: '--add-module=/tmp/nginx-modules/ModSecurity-nginx',
    repo: 'https://github.com/owasp-modsecurity/ModSecurity-nginx.git',
    dependencies: ['libmodsecurity-dev'],
    default: false,
    warning: '需要先安装 libmodsecurity3，编译较慢',
    compileTime: 'slow',
  },
  {
    id: 'testcookie_nginx_module',
    name: '机器人防护',
    description: '基于 Cookie 的机器人/爬虫防护',
    category: 'security',
    flag: '--add-module=/tmp/nginx-modules/testcookie-nginx-module',
    repo: 'https://github.com/kyprizel/testcookie-nginx-module.git',
    default: false,
    compileTime: 'fast',
  },

  // ==================== Lua 脚本 ====================
  {
    id: 'lua_nginx_module',
    name: 'Lua 脚本支持',
    description: '在 Nginx 中嵌入 Lua 脚本，功能强大',
    category: 'lua',
    flag: '--add-module=/tmp/nginx-modules/lua-nginx-module',
    repo: 'https://github.com/openresty/lua-nginx-module.git',
    requires: ['ngx_devel_kit'],
    dependencies: ['libluajit-5.1-dev'],
    default: false,
    warning: '推荐直接使用 OpenResty 替代',
    compileTime: 'medium',
  },
  {
    id: 'stream_lua_nginx_module',
    name: 'Stream Lua',
    description: 'TCP/UDP 代理中使用 Lua 脚本',
    category: 'lua',
    flag: '--add-module=/tmp/nginx-modules/stream-lua-nginx-module',
    repo: 'https://github.com/openresty/stream-lua-nginx-module.git',
    requires: ['stream', 'lua_nginx_module'],
    default: false,
    compileTime: 'medium',
  },

  // ==================== 监控统计 ====================
  {
    id: 'nginx_module_vts',
    name: 'VTS 流量统计',
    description: '虚拟主机流量状态监控，支持 Prometheus',
    category: 'monitoring',
    flag: '--add-module=/tmp/nginx-modules/nginx-module-vts',
    repo: 'https://github.com/vozlt/nginx-module-vts.git',
    default: true,
    compileTime: 'fast',
  },
  {
    id: 'nginx_module_sts',
    name: 'STS Stream 统计',
    description: 'TCP/UDP 代理流量统计',
    category: 'monitoring',
    flag: '--add-module=/tmp/nginx-modules/nginx-module-sts',
    repo: 'https://github.com/vozlt/nginx-module-sts.git',
    requires: ['stream'],
    default: false,
    compileTime: 'fast',
  },
  {
    id: 'ngx_http_geoip2_module',
    name: 'GeoIP2 地理位置',
    description: '基于 MaxMind GeoIP2 的地理位置识别',
    category: 'monitoring',
    flag: '--add-module=/tmp/nginx-modules/ngx_http_geoip2_module',
    repo: 'https://github.com/leev/ngx_http_geoip2_module.git',
    dependencies: ['libmaxminddb-dev'],
    default: false,
    compileTime: 'fast',
  },

  // ==================== 负载均衡 ====================
  {
    id: 'nginx_upstream_check_module',
    name: '上游健康检查',
    description: '主动检查后端服务器健康状态',
    category: 'upstream',
    flag: '--add-module=/tmp/nginx-modules/nginx_upstream_check_module',
    repo: 'https://github.com/yaoweibin/nginx_upstream_check_module.git',
    default: true,
    compileTime: 'fast',
  },
  {
    id: 'ngx_http_upstream_fair_module',
    name: '公平负载均衡',
    description: '根据响应时间分配请求，更智能',
    category: 'upstream',
    flag: '--add-module=/tmp/nginx-modules/nginx-upstream-fair',
    repo: 'https://github.com/gnosek/nginx-upstream-fair.git',
    default: false,
    compileTime: 'fast',
  },

  // ==================== WebDAV ====================
  {
    id: 'nginx_dav_ext_module',
    name: 'WebDAV 完整支持',
    description: 'PROPFIND/OPTIONS/LOCK/UNLOCK 支持',
    category: 'webdav',
    flag: '--add-module=/tmp/nginx-modules/nginx-dav-ext-module',
    repo: 'https://github.com/arut/nginx-dav-ext-module.git',
    requires: ['http_dav_module'],
    dependencies: ['libexpat1-dev'],
    default: false,
    compileTime: 'fast',
  },

  // ==================== 流媒体 ====================
  {
    id: 'nginx_rtmp_module',
    name: 'RTMP 流媒体',
    description: 'RTMP/HLS/DASH 直播推流服务器',
    category: 'media',
    flag: '--add-module=/tmp/nginx-modules/nginx-rtmp-module',
    repo: 'https://github.com/arut/nginx-rtmp-module.git',
    default: false,
    compileTime: 'medium',
  },
  {
    id: 'nginx_vod_module',
    name: 'VOD 点播',
    description: 'HLS/DASH 点播服务，支持 MP4 分片',
    category: 'media',
    flag: '--add-module=/tmp/nginx-modules/nginx-vod-module',
    repo: 'https://github.com/kaltura/nginx-vod-module.git',
    default: false,
    compileTime: 'medium',
  },

  // ==================== 功能扩展 ====================
  {
    id: 'ngx_fancyindex',
    name: '漂亮目录列表',
    description: '美化 autoindex 目录列表',
    category: 'misc',
    flag: '--add-module=/tmp/nginx-modules/ngx-fancyindex',
    repo: 'https://github.com/aperezdc/ngx-fancyindex.git',
    default: false,
    compileTime: 'fast',
  },
  {
    id: 'nginx_upload_module',
    name: '大文件上传',
    description: '高效处理大文件上传，直接写入磁盘',
    category: 'misc',
    flag: '--add-module=/tmp/nginx-modules/nginx-upload-module',
    repo: 'https://github.com/fdintino/nginx-upload-module.git',
    default: false,
    compileTime: 'fast',
  },
  {
    id: 'nginx_upload_progress_module',
    name: '上传进度',
    description: '追踪文件上传进度',
    category: 'misc',
    flag: '--add-module=/tmp/nginx-modules/nginx-upload-progress-module',
    repo: 'https://github.com/masterzen/nginx-upload-progress-module.git',
    default: false,
    compileTime: 'fast',
  },
  {
    id: 'nginx_auth_ldap',
    name: 'LDAP 认证',
    description: '基于 LDAP/AD 的用户认证',
    category: 'misc',
    flag: '--add-module=/tmp/nginx-modules/nginx-auth-ldap',
    repo: 'https://github.com/kvspb/nginx-auth-ldap.git',
    dependencies: ['libldap2-dev'],
    default: false,
    compileTime: 'fast',
  },
  {
    id: 'ngx_http_redis_module',
    name: 'Redis 缓存',
    description: '从 Redis 获取缓存数据',
    category: 'misc',
    flag: '--add-module=/tmp/nginx-modules/ngx_http_redis',
    repo: 'https://github.com/onnimonni/ngx_http_redis.git',
    default: false,
    compileTime: 'fast',
  },
  {
    id: 'memc_nginx_module',
    name: 'Memcached 协议',
    description: 'Memcached 协议扩展，支持 set/add/delete',
    category: 'misc',
    flag: '--add-module=/tmp/nginx-modules/memc-nginx-module',
    repo: 'https://github.com/openresty/memc-nginx-module.git',
    default: false,
    compileTime: 'fast',
  },
  {
    id: 'ngx_pagespeed',
    name: 'PageSpeed 优化',
    description: 'Google PageSpeed 自动优化，压缩、缓存、图片优化',
    category: 'performance',
    flag: '--add-module=/tmp/nginx-modules/incubator-pagespeed-ngx',
    repo: 'https://github.com/apache/incubator-pagespeed-ngx.git',
    default: false,
    warning: '编译非常慢，需要下载额外依赖 (~100MB)',
    compileTime: 'slow',
  },
];

// 预设配置
export const NGINX_PRESETS = {
  minimal: {
    name: '最小化',
    description: '仅核心功能，体积最小',
    modules: ['http_ssl_module', 'http_v2_module', 'http_realip_module', 'http_stub_status_module', 'stream'],
  },
  standard: {
    name: '标准版',
    description: '推荐配置，平衡功能和性能',
    modules: [
      'http_ssl_module', 'http_v2_module', 'http_realip_module', 'http_gzip_static_module',
      'http_stub_status_module', 'http_sub_module', 'http_auth_request_module', 'http_secure_link_module',
      'http_mp4_module', 'stream', 'stream_ssl_module', 'stream_ssl_preread_module',
      'pcre_jit', 'threads', 'file_aio',
      'ngx_brotli', 'ngx_cache_purge', 'headers_more', 'ngx_http_substitutions_filter',
      'nginx_module_vts', 'nginx_upstream_check_module',
    ],
  },
  full: {
    name: '完整版',
    description: '包含大部分常用模块',
    modules: [
      // 核心
      'http_ssl_module', 'http_v2_module', 'http_realip_module', 'http_gzip_static_module',
      'http_gunzip_module', 'http_stub_status_module', 'http_sub_module', 'http_addition_module',
      'http_auth_request_module', 'http_secure_link_module', 'http_slice_module',
      'http_mp4_module', 'http_flv_module',
      'stream', 'stream_ssl_module', 'stream_realip_module', 'stream_ssl_preread_module',
      // 性能
      'pcre_jit', 'threads', 'file_aio',
      // 压缩
      'ngx_brotli', 'zstd_nginx_module',
      // 缓存
      'ngx_cache_purge',
      // 头部
      'headers_more', 'ngx_http_substitutions_filter', 'echo_nginx_module',
      // 监控
      'nginx_module_vts', 'ngx_http_geoip2_module',
      // 负载均衡
      'nginx_upstream_check_module',
      // WebDAV
      'http_dav_module', 'nginx_dav_ext_module',
      // 扩展
      'ngx_fancyindex',
    ],
  },
  security: {
    name: '安全加固版',
    description: '包含 WAF 和安全模块',
    modules: [
      'http_ssl_module', 'http_v2_module', 'http_realip_module', 'http_gzip_static_module',
      'http_stub_status_module', 'http_auth_request_module', 'http_secure_link_module',
      'stream', 'stream_ssl_module', 'stream_ssl_preread_module',
      'pcre_jit', 'threads', 'file_aio',
      'ngx_brotli', 'ngx_cache_purge', 'headers_more',
      'nginx_module_vts', 'nginx_upstream_check_module',
      'naxsi', 'testcookie_nginx_module',
    ],
  },
  streaming: {
    name: '流媒体版',
    description: '适合直播/点播场景',
    modules: [
      'http_ssl_module', 'http_v2_module', 'http_realip_module', 'http_gzip_static_module',
      'http_stub_status_module', 'http_mp4_module', 'http_flv_module', 'http_slice_module',
      'stream', 'stream_ssl_module',
      'pcre_jit', 'threads', 'file_aio',
      'ngx_brotli', 'ngx_cache_purge', 'headers_more',
      'nginx_module_vts',
      'nginx_rtmp_module', 'nginx_vod_module',
    ],
  },
};

export interface CompileOptions {
  version: string;
  modules: string[];
  customModules: string[];  // 用户自定义模块 (git url)
  installPath: string;
  optimizationLevel: 'O0' | 'O1' | 'O2' | 'O3' | 'Os';
  withDebug: boolean;
  parallelJobs: number;  // make -j
}

/**
 * 生成编译脚本
 */
export function generateCompileScript(options: CompileOptions): string {
  const selectedModules = NGINX_MODULES.filter(m => options.modules.includes(m.id));

  // 收集所有依赖
  const allDependencies = new Set<string>([
    'build-essential', 'git', 'wget', 'curl',
    'libpcre3-dev', 'zlib1g-dev', 'libssl-dev',
  ]);

  selectedModules.forEach(m => {
    if (m.dependencies) {
      m.dependencies.forEach(d => allDependencies.add(d));
    }
  });

  // 第三方模块
  const thirdPartyModules = selectedModules.filter(m => m.repo);

  // 官方模块 flags
  const officialFlags = selectedModules
    .filter(m => !m.repo)
    .map(m => m.flag);

  // 第三方模块 flags
  const thirdPartyFlags = thirdPartyModules.map(m => m.flag);

  // 用户自定义模块
  const customFlags = options.customModules.map((url, i) =>
    `--add-module=/tmp/nginx-modules/custom_${i}`
  );

  const allFlags = [...officialFlags, ...thirdPartyFlags, ...customFlags];

  const script = `#!/bin/bash
#############################################
# Nginx 自定义编译脚本
# 由 OpenNextPanel 自动生成
# 版本: ${options.version}
# 时间: $(date '+%Y-%m-%d %H:%M:%S')
#############################################

set -e

# 颜色输出
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
NC='\\033[0m'

log_info() { echo -e "\${BLUE}[INFO]\${NC} $1"; }
log_success() { echo -e "\${GREEN}[SUCCESS]\${NC} $1"; }
log_warning() { echo -e "\${YELLOW}[WARNING]\${NC} $1"; }
log_error() { echo -e "\${RED}[ERROR]\${NC} $1"; }

NGINX_VERSION="${options.version}"
INSTALL_PATH="${options.installPath}"
MODULES_DIR="/tmp/nginx-modules"
PARALLEL_JOBS=${options.parallelJobs || '$(nproc)'}

# 检查 root 权限
if [ "$(id -u)" != "0" ]; then
    log_error "请使用 root 权限运行此脚本"
    exit 1
fi

# 清理旧的编译目录
log_info "清理旧的编译目录..."
rm -rf /tmp/nginx-\${NGINX_VERSION}
rm -rf \${MODULES_DIR}
mkdir -p \${MODULES_DIR}

# 安装编译依赖
log_info "安装编译依赖..."
apt-get update
apt-get install -y ${Array.from(allDependencies).join(' ')}

# 下载 Nginx 源码
log_info "下载 Nginx \${NGINX_VERSION} 源码..."
cd /tmp
if [ ! -f "nginx-\${NGINX_VERSION}.tar.gz" ]; then
    wget -q https://nginx.org/download/nginx-\${NGINX_VERSION}.tar.gz
fi
tar xzf nginx-\${NGINX_VERSION}.tar.gz

# 下载第三方模块
log_info "下载第三方模块..."
cd \${MODULES_DIR}

${thirdPartyModules.map(m => {
    // 从 repo URL 提取目录名，例如 https://github.com/openresty/headers-more-nginx-module.git -> headers-more-nginx-module
    const repoDir = m.repo!.split('/').pop()?.replace('.git', '') || m.id;
    return `
# ${m.name} (${repoDir})
log_info "下载 ${m.name}..."
git clone ${m.submodules ? '--recursive' : ''} ${m.repo} ${repoDir}${m.branch ? ` -b ${m.branch}` : ''}
`;
  }).join('')}

${options.customModules.map((url, i) => `
# 自定义模块 ${i + 1}
log_info "下载自定义模块: ${url}..."
git clone --recursive ${url} custom_${i}
`).join('')}

# 编译 Nginx
log_info "开始编译 Nginx..."
cd /tmp/nginx-\${NGINX_VERSION}

./configure \\
    --prefix=\${INSTALL_PATH} \\
    --sbin-path=\${INSTALL_PATH}/sbin/nginx \\
    --modules-path=\${INSTALL_PATH}/modules \\
    --conf-path=\${INSTALL_PATH}/conf/nginx.conf \\
    --error-log-path=/var/log/nginx/error.log \\
    --http-log-path=/var/log/nginx/access.log \\
    --pid-path=/var/run/nginx.pid \\
    --lock-path=/var/run/nginx.lock \\
    --http-client-body-temp-path=/var/cache/nginx/client_temp \\
    --http-proxy-temp-path=/var/cache/nginx/proxy_temp \\
    --http-fastcgi-temp-path=/var/cache/nginx/fastcgi_temp \\
    --http-uwsgi-temp-path=/var/cache/nginx/uwsgi_temp \\
    --http-scgi-temp-path=/var/cache/nginx/scgi_temp \\
    --user=www-data \\
    --group=www-data \\
    ${allFlags.join(' \\\n    ')}${options.withDebug ? ' \\\n    --with-debug' : ''} \\
    --with-compat \\
    --with-cc-opt='-${options.optimizationLevel} -fPIC -pipe'

log_info "执行 make (使用 \${PARALLEL_JOBS} 个并行任务)..."
make -j\${PARALLEL_JOBS}

log_info "执行 make install..."
make install

# 创建必要目录
log_info "创建必要目录..."
mkdir -p /var/cache/nginx/{client_temp,proxy_temp,fastcgi_temp,uwsgi_temp,scgi_temp}
mkdir -p /var/log/nginx
mkdir -p \${INSTALL_PATH}/conf/conf.d
mkdir -p \${INSTALL_PATH}/conf/sites-available
mkdir -p \${INSTALL_PATH}/conf/sites-enabled

# 创建 systemd 服务
log_info "创建 systemd 服务..."
cat > /etc/systemd/system/nginx.service << 'EOF'
[Unit]
Description=Nginx HTTP Server (Compiled by OpenNextPanel)
Documentation=https://nginx.org/en/docs/
After=network-online.target remote-fs.target nss-lookup.target
Wants=network-online.target

[Service]
Type=forking
PIDFile=/var/run/nginx.pid
ExecStartPre=\${INSTALL_PATH}/sbin/nginx -t -q -g 'daemon on; master_process on;'
ExecStart=\${INSTALL_PATH}/sbin/nginx -g 'daemon on; master_process on;'
ExecReload=/bin/kill -s HUP \$MAINPID
ExecStop=/bin/kill -s QUIT \$MAINPID
TimeoutStopSec=5
KillMode=mixed
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

# 替换服务文件中的变量
sed -i "s|\\\${INSTALL_PATH}|\${INSTALL_PATH}|g" /etc/systemd/system/nginx.service

# 创建命令链接
log_info "创建命令链接..."
ln -sf \${INSTALL_PATH}/sbin/nginx /usr/local/bin/nginx
ln -sf \${INSTALL_PATH}/sbin/nginx /usr/sbin/nginx

# 创建优化配置
log_info "生成优化配置..."
cat > \${INSTALL_PATH}/conf/nginx.conf << 'NGINX_CONF'
# Nginx 优化配置 - OpenNextPanel 自动生成
user www-data;
worker_processes auto;
worker_rlimit_nofile 65535;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 65535;
    use epoll;
    multi_accept on;
    accept_mutex off;
}

http {
    include       mime.types;
    default_type  application/octet-stream;

    # 日志格式
    log_format main '\$remote_addr - \$remote_user [\$time_local] "\$request" '
                    '\$status \$body_bytes_sent "\$http_referer" '
                    '"\$http_user_agent" "\$http_x_forwarded_for" '
                    '\$request_time \$upstream_response_time';

    access_log /var/log/nginx/access.log main buffer=16k flush=2m;

    # 性能优化
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    keepalive_requests 10000;
    reset_timedout_connection on;

    # 缓冲区
    client_body_buffer_size 16k;
    client_max_body_size 100m;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 32k;

    # 超时
    client_body_timeout 60s;
    client_header_timeout 60s;
    send_timeout 60s;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 5;
    gzip_min_length 256;
    gzip_buffers 16 8k;
    gzip_types
        text/plain
        text/css
        text/javascript
        text/xml
        application/json
        application/javascript
        application/xml
        application/xml+rss
        application/xhtml+xml
        application/x-javascript
        application/x-font-ttf
        application/vnd.ms-fontobject
        font/opentype
        image/svg+xml
        image/x-icon;

${options.modules.includes('ngx_brotli') ? `
    # Brotli 压缩
    brotli on;
    brotli_comp_level 6;
    brotli_static on;
    brotli_types
        text/plain
        text/css
        text/javascript
        text/xml
        application/json
        application/javascript
        application/xml
        application/xml+rss
        application/xhtml+xml
        image/svg+xml;
` : ''}

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 隐藏版本号
    server_tokens off;

    # 包含站点配置
    include conf.d/*.conf;
    include sites-enabled/*;

    # 默认服务器
    server {
        listen 80 default_server;
        listen [::]:80 default_server;
        server_name _;

        location / {
            return 444;
        }
    }
}

${options.modules.includes('stream') ? `
# TCP/UDP 代理
stream {
    log_format proxy '\$remote_addr [\$time_local] '
                     '\$protocol \$status \$bytes_sent \$bytes_received '
                     '\$session_time "\$upstream_addr" '
                     '"\$upstream_bytes_sent" "\$upstream_bytes_received" '
                     '"\$upstream_connect_time"';

    access_log /var/log/nginx/stream-access.log proxy buffer=16k flush=2m;

    include conf.d/stream/*.conf;
}
` : ''}
NGINX_CONF

# 创建默认 index.html
mkdir -p \${INSTALL_PATH}/html
cat > \${INSTALL_PATH}/html/index.html << 'HTML'
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Welcome to Nginx</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            text-align: center;
            padding: 40px;
        }
        h1 { font-size: 3em; margin-bottom: 10px; }
        p { font-size: 1.2em; opacity: 0.9; }
        .version {
            margin-top: 30px;
            padding: 10px 20px;
            background: rgba(255,255,255,0.1);
            border-radius: 8px;
            font-family: monospace;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Nginx 运行中</h1>
        <p>由 OpenNextPanel 编译安装</p>
        <div class="version">Nginx ${options.version}</div>
    </div>
</body>
</html>
HTML

# 启动服务
log_info "启动 Nginx..."
systemctl daemon-reload
systemctl enable nginx
systemctl start nginx

# 验证安装
log_info "验证安装..."
\${INSTALL_PATH}/sbin/nginx -V

# 清理
log_info "清理临时文件..."
rm -rf /tmp/nginx-\${NGINX_VERSION}
rm -rf \${MODULES_DIR}

log_success "========================================"
log_success "Nginx \${NGINX_VERSION} 编译安装完成!"
log_success "========================================"
log_info "安装路径: \${INSTALL_PATH}"
log_info "配置文件: \${INSTALL_PATH}/conf/nginx.conf"
log_info "日志目录: /var/log/nginx/"
log_info ""
log_info "常用命令:"
log_info "  systemctl start nginx    # 启动"
log_info "  systemctl stop nginx     # 停止"
log_info "  systemctl reload nginx   # 重载配置"
log_info "  nginx -t                 # 测试配置"
log_info "  nginx -V                 # 查看编译参数"
`;

  return script;
}

/**
 * 估算编译时间 (分钟)
 */
export function estimateCompileTime(modules: string[]): number {
  let time = 3; // 基础时间

  const selectedModules = NGINX_MODULES.filter(m => modules.includes(m.id));

  for (const mod of selectedModules) {
    switch (mod.compileTime) {
      case 'fast': time += 0.2; break;
      case 'medium': time += 1; break;
      case 'slow': time += 5; break;
    }
  }

  return Math.ceil(time);
}

/**
 * 获取模块依赖
 */
export function getModuleDependencies(moduleId: string): string[] {
  const module = NGINX_MODULES.find(m => m.id === moduleId);
  if (!module || !module.requires) return [];

  const deps: string[] = [];
  for (const reqId of module.requires) {
    deps.push(reqId);
    deps.push(...getModuleDependencies(reqId));
  }

  return [...new Set(deps)];
}

/**
 * 验证模块选择
 */
export function validateModuleSelection(modules: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const modId of modules) {
    const module = NGINX_MODULES.find(m => m.id === modId);
    if (!module) {
      errors.push(`未知模块: ${modId}`);
      continue;
    }

    // 检查依赖
    if (module.requires) {
      for (const req of module.requires) {
        if (!modules.includes(req)) {
          const reqModule = NGINX_MODULES.find(m => m.id === req);
          errors.push(`模块 "${module.name}" 需要 "${reqModule?.name || req}"`);
        }
      }
    }

    // 检查冲突
    if (module.conflicts) {
      for (const conflict of module.conflicts) {
        if (modules.includes(conflict)) {
          const conflictModule = NGINX_MODULES.find(m => m.id === conflict);
          errors.push(`模块 "${module.name}" 与 "${conflictModule?.name || conflict}" 冲突`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
