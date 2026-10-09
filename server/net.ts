import { Express } from 'express';

// Cloudflare edge IP ranges (https://www.cloudflare.com/ips/).
// Requests arriving directly from these addresses may have their
// X-Forwarded-For / CF-Connecting-IP headers trusted.
const CF_IPV4_RANGES = [
  '173.245.48.0/20',
  '103.21.244.0/22',
  '103.22.200.0/22',
  '103.31.4.0/22',
  '141.101.64.0/18',
  '108.162.192.0/18',
  '190.93.240.0/20',
  '188.114.96.0/20',
  '197.234.240.0/22',
  '198.41.128.0/17',
  '162.158.0.0/15',
  '104.16.0.0/13',
  '104.24.0.0/14',
  '172.64.0.0/13',
  '131.0.72.0/22',
];

const CF_IPV6_RANGES = [
  '2400:cb00::/32',
  '2606:4700::/32',
  '2803:f800::/32',
  '2405:b500::/32',
  '2405:8100::/32',
  '2a06:98c0::/29',
  '2c0f:f248::/32',
];

// Locally reachable addresses (Nginx runs on the same host / loopback).
const LOCAL_RANGES = ['127.0.0.0/8', '::1/128', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', 'fc00::/7'];

function ipv4ToLong(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    const octet = Number(part);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) return null;
    value = (value << 8) + octet;
  }
  return value >>> 0;
}

function ipv6ToBytes(ip: string): Uint8Array | null {
  if (!ip.includes(':')) return null;
  const [head, tail = ''] = ip.split('::');
  const headParts = head ? head.split(':') : [];
  const tailParts = tail ? tail.split(':') : [];
  const missing = 8 - headParts.length - tailParts.length;
  const groups = [...headParts, ...Array(Math.max(0, missing)).fill('0'), ...tailParts];
  if (groups.length !== 8) return null;
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 8; i++) {
    const value = parseInt(groups[i] || '0', 16);
    if (!Number.isInteger(value) || value < 0 || value > 0xffff) return null;
    bytes[i * 2] = value >> 8;
    bytes[i * 2 + 1] = value & 0xff;
  }
  return bytes;
}

function sameFamily(a: string, b: string): boolean {
  return a.includes(':') === b.includes(':');
}

// Node reports IPv4 peers on dual-stack sockets as IPv4-mapped IPv6
// (::ffff:a.b.c.d). Collapse those to plain IPv4 so CIDR checks and the
// per-IP rate-limit keys behave consistently.
function normalizeIp(ip: string): string {
  const trimmed = (ip || '').trim();
  const mapped = trimmed.match(/^::ffff:((?:\d{1,3}\.){3}\d{1,3})$/i);
  return mapped ? mapped[1] : trimmed;
}

// Returns true when `ip` falls inside the given CIDR block.
export function ipInCidr(ip: string, cidr: string): boolean {
  const address = normalizeIp(ip);
  const [rangeRaw, prefixRaw] = cidr.split('/');
  const range = normalizeIp(rangeRaw);
  const prefix = Number(prefixRaw);
  if (!sameFamily(address, range)) return false;

  if (!address.includes(':')) {
    const ipLong = ipv4ToLong(address);
    const rangeLong = ipv4ToLong(range);
    if (ipLong === null || rangeLong === null) return false;
    if (prefix <= 0) return true;
    if (prefix > 32) return false;
    const mask = prefix === 32 ? 0xffffffff : (0xffffffff << (32 - prefix)) >>> 0;
    return (ipLong & mask) === (rangeLong & mask);
  }

  const ipBytes = ipv6ToBytes(address);
  const rangeBytes = ipv6ToBytes(range);
  if (!ipBytes || !rangeBytes) return false;
  const fullBytes = Math.floor(prefix / 8);
  const restBits = prefix % 8;
  for (let i = 0; i < fullBytes; i++) {
    if (ipBytes[i] !== rangeBytes[i]) return false;
  }
  if (restBits > 0) {
    const mask = (0xff << (8 - restBits)) & 0xff;
    if ((ipBytes[fullBytes] & mask) !== (rangeBytes[fullBytes] & mask)) return false;
  }
  return true;
}

function buildTrustedRanges(): string[] {
  // Allow operators to override/extend the trusted proxy set.
  const extra = (process.env.TRUSTED_PROXIES || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return [...LOCAL_RANGES, ...CF_IPV4_RANGES, ...CF_IPV6_RANGES, ...extra];
}

let trustedRanges: string[] | null = null;

export function isTrustedProxy(ip: string): boolean {
  if (!ip) return false;
  if (!trustedRanges) trustedRanges = buildTrustedRanges();
  return trustedRanges.some((cidr) => ipInCidr(ip, cidr));
}

// Configure Express to resolve req.ip from X-Forwarded-For only through
// proxies we actually control (loopback Nginx and/or Cloudflare edge IPs).
// A naive numeric `trust proxy` would let clients spoof their IP and bypass
// per-IP brute-force lockouts, so we validate each hop explicitly instead.
export function configureTrustProxy(app: Express): void {
  trustedRanges = buildTrustedRanges();
  app.set('trust proxy', (ip: string) => isTrustedProxy(ip));
}
