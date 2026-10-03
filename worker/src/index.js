const TELEGRAM_API = "https://api.telegram.org";
const GITHUB_API = "https://api.github.com";
const MAX_MESSAGE_LENGTH = 3900;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "madix-telegram-bot" });
    }

    if (request.method === "POST" && url.pathname === "/setup") {
      return setupWebhook(request, env, url);
    }

    if (request.method === "POST" && url.pathname === "/telegram/webhook") {
      return receiveUpdate(request, env);
    }

    return json({ error: "Not found" }, 404);
  },
};

async function setupWebhook(request, env, url) {
  if (!env.SETUP_SECRET || !hasBearerSecret(request, env.SETUP_SECRET)) {
    return json({ error: "Unauthorized" }, 401);
  }
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_WEBHOOK_SECRET) {
    return json({ error: "Bot secrets are not configured" }, 503);
  }

  const webhookUrl = new URL("/telegram/webhook", url.origin).toString();
  const result = await telegramRequest(env, "setWebhook", {
    url: webhookUrl,
    secret_token: env.TELEGRAM_WEBHOOK_SECRET,
    allowed_updates: ["message"],
  });

  if (!result.ok) return json({ error: "Telegram rejected the webhook setup" }, 502);
  return json({ ok: true, webhook: webhookUrl });
}

async function receiveUpdate(request, env) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_WEBHOOK_SECRET) {
    return json({ error: "Bot is not configured" }, 503);
  }
  if (!constantTimeEqual(request.headers.get("X-Telegram-Bot-Api-Secret-Token") || "", env.TELEGRAM_WEBHOOK_SECRET)) {
    return json({ error: "Unauthorized" }, 401);
  }

  let update;
  try {
    update = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const message = update?.message;
  const chatId = message?.chat?.id;
  const userId = message?.from?.id;
  if (!chatId || !userId || typeof message?.text !== "string") return json({ ok: true });

  try {
    const response = await handleMessage(message, env);
    if (response) await sendMessage(env, chatId, response);
  } catch (error) {
    console.error("Command failed", error instanceof Error ? error.message : "unknown error");
    await sendMessage(env, chatId, "در دریافت اطلاعات GitHub مشکلی پیش آمد. کمی بعد دوباره تلاش کنید.");
  }

  return json({ ok: true });
}

async function handleMessage(message, env) {
  const text = message.text.trim();
  const [rawCommand = "", ...args] = text.split(/\s+/);
  const command = rawCommand.split("@")[0].toLowerCase();
  const userId = String(message.from.id);
  const chatId = String(message.chat.id);

  if (message.chat.type !== "private") {
    return "برای محافظت از اطلاعات مخزن، لطفاً ربات را در گفت‌وگوی خصوصی استفاده کنید.";
  }

  if (command === "/id") {
    return `شناسه کاربری تلگرام شما: ${userId}\nبرای فعال‌کردن فرمان‌ها، این شناسه را در Secret با نام ALLOWED_TELEGRAM_USER_IDS ذخیره کنید.`;
  }

  const allowedUsers = new Set((env.ALLOWED_TELEGRAM_USER_IDS || "").split(",").map((id) => id.trim()).filter(Boolean));
  if (!allowedUsers.has(userId) || chatId !== userId) {
    return "دسترسی این حساب هنوز فعال نشده است. فرمان /id را اجرا کنید و شناسه را فقط مالک ربات به تنظیمات دسترسی اضافه کند.";
  }

  if (command === "/start" || command === "/help") return helpMessage(env);
  if (command === "/repos") return listRepositories(env);
  if (command === "/repo") return repositorySummary(env, args[0]);
  if (command === "/issues") return listIssues(env, args[0]);
  if (command === "/prs") return listPullRequests(env, args[0]);
  if (command === "/commits") return listCommits(env, args[0]);

  return "این فرمان را نمی‌شناسم. برای فهرست فرمان‌ها /help را بفرستید.";
}

function helpMessage(env) {
  const owner = env.GITHUB_OWNER || "SheykhEmi061";
  const repo = env.GITHUB_REPO || "Madix";
  return [
    "🤖 ربات مادیکس به GitHub متصل است.",
    "",
    "فرمان‌ها:",
    "/repos — مخازن عمومی کاربر",
    `/repo — خلاصه ${owner}/${repo}`,
    "/issues — مسئله‌های باز مخزن پیش‌فرض",
    "/prs — درخواست‌های ادغام باز",
    "/commits — پنج commit اخیر",
    "/id — شناسه تلگرام برای تنظیم دسترسی",
    "",
    "برای مخزن دیگر، نام کامل آن را بعد از فرمان بنویسید؛ نمونه: /issues owner/repo",
  ].join("\n");
}

async function listRepositories(env) {
  const owner = env.GITHUB_OWNER || "SheykhEmi061";
  const repositories = await githubRequest(env, `/users/${encodeURIComponent(owner)}/repos?type=owner&sort=updated&per_page=8`);
  if (!Array.isArray(repositories) || repositories.length === 0) return "مخزنی برای نمایش پیدا نشد.";
  return ["📦 مخازن به‌روز GitHub:", ...repositories.map((repo) => `• ${repo.full_name} · ★ ${repo.stargazers_count}`)].join("\n");
}

async function repositorySummary(env, requestedRepo) {
  const { owner, repo } = parseRepository(env, requestedRepo);
  const data = await githubRequest(env, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
  return [
    `📁 ${data.full_name}`,
    data.description ? clip(data.description, 500) : "بدون توضیحات",
    `⭐ ستاره: ${data.stargazers_count}  ·  🍴 فورک: ${data.forks_count}`,
    `شاخه پیش‌فرض: ${data.default_branch}`,
    `وضعیت: ${data.private ? "خصوصی" : "عمومی"}`,
    data.html_url,
  ].join("\n");
}

async function listIssues(env, requestedRepo) {
  const { owner, repo } = parseRepository(env, requestedRepo);
  const issues = await githubRequest(env, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues?state=open&per_page=20&sort=updated`);
  const items = Array.isArray(issues) ? issues.filter((issue) => !issue.pull_request) : [];
  if (items.length === 0) return `✅ مسئله باز برای ${owner}/${repo} پیدا نشد.`;
  return [`🟠 مسئله‌های باز ${owner}/${repo}:`, ...items.slice(0, 10).map((issue) => `#${issue.number} ${clip(issue.title, 130)}\n${issue.html_url}`)].join("\n\n");
}

async function listPullRequests(env, requestedRepo) {
  const { owner, repo } = parseRepository(env, requestedRepo);
  const pulls = await githubRequest(env, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?state=open&per_page=10&sort=updated`);
  if (!Array.isArray(pulls) || pulls.length === 0) return `✅ درخواست ادغام بازی برای ${owner}/${repo} وجود ندارد.`;
  return [`🔀 درخواست‌های ادغام باز ${owner}/${repo}:`, ...pulls.map((pull) => `#${pull.number} ${clip(pull.title, 130)}\n${pull.html_url}`)].join("\n\n");
}

async function listCommits(env, requestedRepo) {
  const { owner, repo } = parseRepository(env, requestedRepo);
  const commits = await githubRequest(env, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?per_page=5`);
  if (!Array.isArray(commits) || commits.length === 0) return `Commitی برای ${owner}/${repo} پیدا نشد.`;
  return [`🧾 پنج commit اخیر ${owner}/${repo}:`, ...commits.map((commit) => {
    const shortSha = commit.sha.slice(0, 7);
    const title = commit.commit.message.split("\n")[0];
    return `• ${shortSha} ${clip(title, 140)}\n${commit.html_url}`;
  })].join("\n\n");
}

function parseRepository(env, requestedRepo) {
  const fullName = requestedRepo || `${env.GITHUB_OWNER || "SheykhEmi061"}/${env.GITHUB_REPO || "Madix"}`;
  const parts = fullName.split("/");
  if (parts.length !== 2 || parts.some((part) => !/^[A-Za-z0-9_.-]+$/.test(part))) {
    throw new Error("Invalid repository name");
  }
  return { owner: parts[0], repo: parts[1] };
}

async function githubRequest(env, path) {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "Madix-Telegram-Bot",
  };
  if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  const response = await fetch(`${GITHUB_API}${path}`, { headers });
  if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);
  return response.json();
}

async function telegramRequest(env, method, payload) {
  const response = await fetch(`${TELEGRAM_API}/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Telegram API returned ${response.status}`);
  const result = await response.json();
  if (!result.ok) throw new Error(`Telegram API rejected ${method}`);
  return result;
}

async function sendMessage(env, chatId, text) {
  return telegramRequest(env, "sendMessage", {
    chat_id: chatId,
    text: clip(text, MAX_MESSAGE_LENGTH),
    disable_web_page_preview: true,
  });
}

function hasBearerSecret(request, expected) {
  const authorization = request.headers.get("Authorization") || "";
  return constantTimeEqual(authorization, `Bearer ${expected}`);
}

function constantTimeEqual(actual, expected) {
  if (actual.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < actual.length; index += 1) mismatch |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  return mismatch === 0;
}

function clip(value, limit) {
  const normalized = String(value || "").replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  return normalized.length > limit ? `${normalized.slice(0, limit - 1)}…` : normalized;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
