<?php
// Email sign-up for Worth Going Out.
// Saves {email, topics, page, date} as one line of subscribers.csv in a PRIVATE GitHub repository (GitHub contents API).
// The key and repository name come from ../private/config.php, which the deploy workflow writes from GitHub Secrets.
// If GitHub cannot be reached, the line goes to ../private/pending.csv so no sign-up is lost (it is sent on the next sign-up).
// No IP addresses are stored; a hash of the IP is used only for a short-lived rate limit.

declare(strict_types=1);
header('X-Robots-Tag: noindex');
$dir = __DIR__ . '/../private';
$cfg = is_file("$dir/config.php") ? (require "$dir/config.php") : [];
$token = (string)($cfg['token'] ?? '');
$repo = (string)($cfg['repo'] ?? '');
$file = 'subscribers.csv';
$wantsJson = strpos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false;

function reply(bool $ok, string $msg, bool $json, int $code = 200): void {
  http_response_code($code);
  if ($json) { header('Content-Type: application/json'); echo json_encode(['ok' => $ok, 'message' => $msg]); exit; }
  header('Location: ' . ($ok ? '/thanks/' : '/thanks/?error=' . rawurlencode($msg)), true, 303); exit;
}

function gh(string $method, string $url, string $token, ?array $body = null): array {
  $headers = ["Authorization: Bearer $token", 'Accept: application/vnd.github+json', 'User-Agent: worthgoingout-signup', 'X-GitHub-Api-Version: 2022-11-28'];
  if (function_exists('curl_init')) {
    $c = curl_init($url);
    curl_setopt_array($c, [CURLOPT_CUSTOMREQUEST => $method, CURLOPT_HTTPHEADER => array_merge($headers, ['Content-Type: application/json']), CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15]);
    if ($body !== null) curl_setopt($c, CURLOPT_POSTFIELDS, json_encode($body));
    $out = curl_exec($c); $code = (int)curl_getinfo($c, CURLINFO_HTTP_CODE); curl_close($c);
  } else {
    $ctx = stream_context_create(['http' => ['method' => $method, 'header' => implode("\r\n", array_merge($headers, ['Content-Type: application/json'])), 'content' => $body === null ? '' : json_encode($body), 'ignore_errors' => true, 'timeout' => 15]]);
    $out = @file_get_contents($url, false, $ctx); $code = 0;
    foreach ($http_response_header ?? [] as $h) if (preg_match('#^HTTP/\S+ (\d{3})#', $h, $m)) $code = (int)$m[1];
  }
  return [$code, is_string($out) ? (json_decode($out, true) ?? []) : []];
}

// Health check used by the deploy workflow: reports only yes/no facts, never the key.
if (($_GET['ping'] ?? '') === '1') {
  header('Content-Type: application/json');
  $repoOk = false;
  if ($token && $repo) { [$code] = gh('GET', "https://api.github.com/repos/$repo", $token); $repoOk = $code === 200; }
  echo json_encode(['php' => PHP_VERSION, 'curl' => function_exists('curl_init'), 'configured' => $token !== '' && $repo !== '', 'repoReachable' => $repoOk, 'privateWritable' => is_writable($dir)]);
  exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') reply(false, 'Use the form on the site.', $wantsJson, 405);

// Bots: a hidden field people never fill, and a form that was submitted too fast.
if (trim((string)($_POST['website'] ?? '')) !== '') reply(true, 'Thanks.', $wantsJson);
$started = (int)($_POST['t'] ?? 0);
if ($started > 0 && time() - intdiv($started, 1000) < 2) reply(false, 'That was very fast. Please try again.', $wantsJson, 429);

$email = strtolower(trim((string)($_POST['email'] ?? '')));
if (strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL)) reply(false, 'Please enter a valid email address.', $wantsJson, 400);
if (($_POST['consent'] ?? '') !== 'yes') reply(false, 'Please tick the box to agree to receive our emails.', $wantsJson, 400);
$allowed = ['eclipses', 'meteors', 'aurora', 'stargazing'];
$topics = array_values(array_intersect($allowed, (array)($_POST['topics'] ?? [])));
if (!$topics) $topics = $allowed;
$page = substr(preg_replace('#[^a-z0-9/_-]#i', '', (string)($_POST['page'] ?? '')), 0, 80);

// Rate limit: at most 5 sign-ups per hour from one address (stored as a salted hash, deleted after an hour).
$rl = "$dir/ratelimit.json";
$now = time();
$hits = is_file($rl) ? (json_decode((string)file_get_contents($rl), true) ?: []) : [];
$hits = array_filter($hits, function ($t) use ($now) { return is_array($t) && $t && $now - (int)end($t) < 3600; });
$key = hash('sha256', ($cfg['salt'] ?? 'wgo') . ($_SERVER['REMOTE_ADDR'] ?? ''));
$mine = array_values(array_filter($hits[$key] ?? [], function ($t) use ($now) { return $now - (int)$t < 3600; }));
if (count($mine) >= 5) reply(false, 'Too many sign-ups from here. Please try again later.', $wantsJson, 429);
$mine[] = $now; $hits[$key] = $mine;
@file_put_contents($rl, json_encode($hits), LOCK_EX);

$csvField = function (string $s) { return '"' . str_replace('"', '""', $s) . '"'; };
$line = implode(',', [$csvField($email), $csvField(implode(' ', $topics)), $csvField($page), gmdate('Y-m-d\TH:i:s\Z')]);
$pendingFile = "$dir/pending.csv";
$pending = is_file($pendingFile) ? trim((string)file_get_contents($pendingFile)) : '';
$lines = array_filter(array_merge($pending === '' ? [] : explode("\n", $pending), [$line]));

$saved = false;
if ($token && $repo) {
  $url = "https://api.github.com/repos/$repo/contents/$file";
  for ($try = 0; $try < 3 && !$saved; $try++) {
    [$code, $cur] = gh('GET', $url, $token);
    $sha = $code === 200 ? ($cur['sha'] ?? null) : null;
    $text = $code === 200 ? base64_decode(str_replace("\n", '', (string)($cur['content'] ?? ''))) : "email,topics,page,date\n";
    $add = [];
    foreach ($lines as $l) {
      $addr = strtolower(trim(explode(',', $l)[0], '"'));
      if (strpos($text, '"' . $addr . '"') === false) $add[] = $l; // already subscribed: keep the first sign-up only
    }
    if (!$add) { $saved = true; break; }
    $body = ['message' => 'New sign-up', 'content' => base64_encode(rtrim($text, "\n") . "\n" . implode("\n", $add) . "\n")];
    if ($sha) $body['sha'] = $sha;
    [$put] = gh('PUT', $url, $token, $body);
    $saved = in_array($put, [200, 201], true);
    if (!$saved) usleep(400000); // 409 = someone else wrote at the same moment: read again and retry
  }
}
if ($saved) { @unlink($pendingFile); reply(true, 'Thanks, you are on the list.', $wantsJson); }
if (@file_put_contents($pendingFile, implode("\n", $lines) . "\n", LOCK_EX) !== false) reply(true, 'Thanks, you are on the list.', $wantsJson);
reply(false, 'Sorry, something went wrong on our side. Please try again later.', $wantsJson, 500);
