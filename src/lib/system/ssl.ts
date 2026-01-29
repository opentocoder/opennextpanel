import { executeCommand } from "./executor";
import * as fs from "fs/promises";
import * as path from "path";

const LETSENCRYPT_DIR = "/etc/letsencrypt/live";
const CERTBOT_LOG = "/var/log/letsencrypt/letsencrypt.log";

export interface SSLCertificate {
  domain: string;
  issuer: string;
  validFrom: Date;
  validTo: Date;
  daysRemaining: number;
  autoRenew: boolean;
  certPath: string;
  keyPath: string;
}

export interface CertbotResult {
  success: boolean;
  message: string;
  certPath?: string;
  keyPath?: string;
}

/**
 * 申请 Let's Encrypt SSL 证书
 */
export async function requestCertificate(
  domain: string,
  email: string,
  webroot?: string
): Promise<CertbotResult> {
  // 验证域名格式
  if (!/^[a-zA-Z0-9][a-zA-Z0-9-_.]+\.[a-zA-Z]{2,}$/.test(domain)) {
    return { success: false, message: "Invalid domain format" };
  }

  const args = [
    "certonly",
    "--non-interactive",
    "--agree-tos",
    "--email", email,
    "-d", domain,
  ];

  // 如果提供了 webroot，使用 webroot 模式，否则使用 standalone
  if (webroot) {
    args.push("--webroot", "-w", webroot);
  } else {
    args.push("--standalone");
  }

  const result = await executeCommand("certbot", args);

  if (result.code !== 0) {
    return {
      success: false,
      message: result.stderr || "Certificate request failed",
    };
  }

  const certPath = path.join(LETSENCRYPT_DIR, domain, "fullchain.pem");
  const keyPath = path.join(LETSENCRYPT_DIR, domain, "privkey.pem");

  return {
    success: true,
    message: "Certificate issued successfully",
    certPath,
    keyPath,
  };
}

/**
 * 申请通配符证书（需要 DNS 验证）
 */
export async function requestWildcardCertificate(
  domain: string,
  email: string
): Promise<CertbotResult> {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9-_.]+\.[a-zA-Z]{2,}$/.test(domain)) {
    return { success: false, message: "Invalid domain format" };
  }

  const args = [
    "certonly",
    "--manual",
    "--preferred-challenges", "dns",
    "--non-interactive",
    "--agree-tos",
    "--email", email,
    "-d", domain,
    "-d", `*.${domain}`,
  ];

  const result = await executeCommand("certbot", args);

  if (result.code !== 0) {
    return {
      success: false,
      message: result.stderr || "Wildcard certificate request failed. DNS challenge required.",
    };
  }

  const certPath = path.join(LETSENCRYPT_DIR, domain, "fullchain.pem");
  const keyPath = path.join(LETSENCRYPT_DIR, domain, "privkey.pem");

  return {
    success: true,
    message: "Wildcard certificate issued successfully",
    certPath,
    keyPath,
  };
}

/**
 * 续期所有证书
 */
export async function renewAllCertificates(): Promise<{
  success: boolean;
  renewed: string[];
  failed: string[];
  message: string;
}> {
  const result = await executeCommand("certbot", ["renew", "--non-interactive"]);

  const renewed: string[] = [];
  const failed: string[] = [];

  // 解析输出
  const lines = result.stdout.split("\n");
  for (const line of lines) {
    if (line.includes("renewed successfully")) {
      const match = line.match(/\/etc\/letsencrypt\/live\/([^/]+)/);
      if (match) {
        renewed.push(match[1]);
      }
    } else if (line.includes("failed")) {
      const match = line.match(/\/etc\/letsencrypt\/live\/([^/]+)/);
      if (match) {
        failed.push(match[1]);
      }
    }
  }

  return {
    success: result.code === 0,
    renewed,
    failed,
    message: result.code === 0 ? "Renewal check completed" : result.stderr,
  };
}

/**
 * 续期指定证书
 */
export async function renewCertificate(domain: string): Promise<CertbotResult> {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9-_.]+\.[a-zA-Z]{2,}$/.test(domain)) {
    return { success: false, message: "Invalid domain format" };
  }

  const result = await executeCommand("certbot", [
    "renew",
    "--cert-name", domain,
    "--non-interactive",
    "--force-renewal",
  ]);

  if (result.code !== 0) {
    return { success: false, message: result.stderr };
  }

  return { success: true, message: "Certificate renewed successfully" };
}

/**
 * 撤销证书
 */
export async function revokeCertificate(domain: string): Promise<CertbotResult> {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9-_.]+\.[a-zA-Z]{2,}$/.test(domain)) {
    return { success: false, message: "Invalid domain format" };
  }

  const certPath = path.join(LETSENCRYPT_DIR, domain, "cert.pem");

  const result = await executeCommand("certbot", [
    "revoke",
    "--cert-path", certPath,
    "--non-interactive",
  ]);

  if (result.code !== 0) {
    return { success: false, message: result.stderr };
  }

  return { success: true, message: "Certificate revoked successfully" };
}

/**
 * 删除证书
 */
export async function deleteCertificate(domain: string): Promise<CertbotResult> {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9-_.]+\.[a-zA-Z]{2,}$/.test(domain)) {
    return { success: false, message: "Invalid domain format" };
  }

  const result = await executeCommand("certbot", [
    "delete",
    "--cert-name", domain,
    "--non-interactive",
  ]);

  if (result.code !== 0) {
    return { success: false, message: result.stderr };
  }

  return { success: true, message: "Certificate deleted successfully" };
}

/**
 * 列出所有证书
 */
export async function listCertificates(): Promise<SSLCertificate[]> {
  const result = await executeCommand("certbot", ["certificates"], { useSudo: false });

  if (result.code !== 0) {
    return [];
  }

  const certificates: SSLCertificate[] = [];
  const blocks = result.stdout.split("Certificate Name:");

  for (const block of blocks.slice(1)) {
    const lines = block.split("\n");
    const cert: Partial<SSLCertificate> = {};

    for (const line of lines) {
      const trimmed = line.trim();

      if (lines.indexOf(line) === 0) {
        cert.domain = trimmed;
      } else if (trimmed.startsWith("Domains:")) {
        // 已有 domain
      } else if (trimmed.startsWith("Expiry Date:")) {
        const match = trimmed.match(/Expiry Date: (.+) \(/);
        if (match) {
          cert.validTo = new Date(match[1]);
          cert.daysRemaining = Math.floor(
            (cert.validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
        }
      } else if (trimmed.startsWith("Certificate Path:")) {
        cert.certPath = trimmed.replace("Certificate Path:", "").trim();
      } else if (trimmed.startsWith("Private Key Path:")) {
        cert.keyPath = trimmed.replace("Private Key Path:", "").trim();
      }
    }

    if (cert.domain) {
      certificates.push({
        domain: cert.domain,
        issuer: "Let's Encrypt",
        validFrom: new Date(), // certbot 不直接显示
        validTo: cert.validTo || new Date(),
        daysRemaining: cert.daysRemaining || 0,
        autoRenew: true,
        certPath: cert.certPath || "",
        keyPath: cert.keyPath || "",
      });
    }
  }

  return certificates;
}

/**
 * 获取证书详情
 */
export async function getCertificateInfo(domain: string): Promise<SSLCertificate | null> {
  const certPath = path.join(LETSENCRYPT_DIR, domain, "cert.pem");

  try {
    await fs.access(certPath);
  } catch {
    return null;
  }

  // 使用 openssl 获取证书信息
  const result = await executeCommand(
    "openssl",
    ["x509", "-in", certPath, "-noout", "-dates", "-issuer", "-subject"],
    { useSudo: false }
  );

  if (result.code !== 0) {
    return null;
  }

  const lines = result.stdout.split("\n");
  let validFrom = new Date();
  let validTo = new Date();
  let issuer = "Unknown";

  for (const line of lines) {
    if (line.startsWith("notBefore=")) {
      validFrom = new Date(line.replace("notBefore=", ""));
    } else if (line.startsWith("notAfter=")) {
      validTo = new Date(line.replace("notAfter=", ""));
    } else if (line.startsWith("issuer=")) {
      const match = line.match(/O\s*=\s*([^,]+)/);
      if (match) {
        issuer = match[1];
      }
    }
  }

  const daysRemaining = Math.floor(
    (validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return {
    domain,
    issuer,
    validFrom,
    validTo,
    daysRemaining,
    autoRenew: true,
    certPath: path.join(LETSENCRYPT_DIR, domain, "fullchain.pem"),
    keyPath: path.join(LETSENCRYPT_DIR, domain, "privkey.pem"),
  };
}

/**
 * 检查证书是否即将过期
 */
export async function checkExpiringCertificates(
  daysThreshold: number = 30
): Promise<SSLCertificate[]> {
  const certificates = await listCertificates();
  return certificates.filter((cert) => cert.daysRemaining <= daysThreshold);
}

/**
 * 设置自动续期定时任务
 */
export async function setupAutoRenewal(): Promise<{ success: boolean; message: string }> {
  // 检查是否已有 certbot 定时任务
  const result = await executeCommand("systemctl", ["is-enabled", "certbot.timer"], {
    useSudo: false,
  });

  if (result.stdout.trim() === "enabled") {
    return { success: true, message: "Auto-renewal is already enabled" };
  }

  // 启用 certbot timer
  const enableResult = await executeCommand("systemctl", ["enable", "--now", "certbot.timer"]);

  if (enableResult.code !== 0) {
    return { success: false, message: enableResult.stderr };
  }

  return { success: true, message: "Auto-renewal enabled successfully" };
}

/**
 * 生成自签名证书（用于测试）
 */
export async function generateSelfSignedCertificate(
  domain: string,
  outputDir: string,
  days: number = 365
): Promise<CertbotResult> {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9-_.]+\.[a-zA-Z]{2,}$/.test(domain)) {
    return { success: false, message: "Invalid domain format" };
  }

  await fs.mkdir(outputDir, { recursive: true });

  const keyPath = path.join(outputDir, "privkey.pem");
  const certPath = path.join(outputDir, "fullchain.pem");

  const result = await executeCommand(
    "openssl",
    [
      "req",
      "-x509",
      "-nodes",
      "-days", days.toString(),
      "-newkey", "rsa:2048",
      "-keyout", keyPath,
      "-out", certPath,
      "-subj", `/CN=${domain}`,
    ],
    { useSudo: false }
  );

  if (result.code !== 0) {
    return { success: false, message: result.stderr };
  }

  return {
    success: true,
    message: "Self-signed certificate generated",
    certPath,
    keyPath,
  };
}
