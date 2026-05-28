import { Router } from "express";
import { run_harness } from "../lib/harness.js";

const router = Router();

// ---------------------------------------------------------------------------
// Web UI
// ---------------------------------------------------------------------------

router.get("/", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(UI_HTML);
});

// ---------------------------------------------------------------------------
// SSE stream
// ---------------------------------------------------------------------------

router.get("/review/stream", async (req, res) => {
  const prUrl = String(req.query["pr_url"] ?? "").trim();

  if (!prUrl) {
    res.status(400).json({ error: "pr_url query parameter is required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  let closed = false;
  req.on("close", () => { closed = true; });

  const send = (event: object): void => {
    if (!closed) res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  try {
    await run_harness(prUrl, send);
  } catch (err) {
    send({ type: "error", message: String(err) });
  } finally {
    res.end();
  }
});

// ---------------------------------------------------------------------------
// UI HTML (embedded — no static file server needed)
// ---------------------------------------------------------------------------

const UI_HTML = /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PR Code Review Agent</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚙</text></svg>">
  <style>
    :root {
      --bg:      #0d1117;
      --surface: #161b22;
      --border:  #30363d;
      --text:    #e6edf3;
      --muted:   #8b949e;
      --green:   #3fb950;
      --yellow:  #d29922;
      --red:     #f85149;
      --blue:    #58a6ff;
      --purple:  #bc8cff;
      --mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--mono);
      font-size: 14px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px 16px 80px;
    }
    .wrap { width: 100%; max-width: 740px; }

    /* Header */
    .header { margin-bottom: 32px; }
    .header h1 { font-size: 20px; font-weight: 600; color: var(--text); letter-spacing: -0.3px; }
    .header p  { margin-top: 4px; color: var(--muted); font-size: 13px; }

    /* Form */
    .form { display: flex; gap: 8px; margin-bottom: 28px; }
    .form input {
      flex: 1;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text);
      font-family: var(--mono);
      font-size: 13px;
      padding: 10px 14px;
      outline: none;
      transition: border-color 0.15s;
    }
    .form input:focus { border-color: var(--blue); }
    .form input::placeholder { color: var(--muted); }
    .form button {
      background: var(--blue);
      border: none;
      border-radius: 6px;
      color: #0d1117;
      cursor: pointer;
      font-family: var(--mono);
      font-size: 13px;
      font-weight: 600;
      padding: 10px 20px;
      white-space: nowrap;
      transition: opacity 0.15s;
    }
    .form button:disabled { opacity: 0.45; cursor: not-allowed; }
    .form button:not(:disabled):hover { opacity: 0.85; }

    /* Feed */
    .feed-label { color: var(--muted); font-size: 11px; letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 8px; }
    .feed {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      min-height: 64px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .feed:empty::after { content: 'Waiting for review to start…'; color: var(--muted); }
    .line { display: flex; align-items: flex-start; gap: 8px; line-height: 1.5; }
    .line .icon { flex-shrink: 0; width: 16px; text-align: center; }
    .line .msg  { color: var(--text); }
    .line.dim .msg   { color: var(--muted); }
    .line.ok  .icon  { color: var(--green); }
    .line.warn .icon { color: var(--yellow); }
    .line.bad  .icon { color: var(--red); }
    .line.info .icon { color: var(--blue); }
    .line.posted .icon { color: var(--purple); }
    .badge {
      display: inline-block;
      font-size: 11px;
      padding: 1px 6px;
      border-radius: 4px;
      font-weight: 600;
      margin-left: 4px;
    }
    .badge.high   { background: #3a1010; color: var(--red); }
    .badge.medium { background: #2d2208; color: var(--yellow); }
    .badge.low    { background: #0c2112; color: var(--green); }

    /* Divider */
    .divider {
      border: none;
      border-top: 1px solid var(--border);
      margin: 6px 0;
    }

    /* Summary card */
    .summary {
      margin-top: 24px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 20px;
    }
    .summary h2 { font-size: 14px; font-weight: 600; margin-bottom: 14px; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; }
    .stat { background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 12px 14px; }
    .stat .val { font-size: 24px; font-weight: 700; line-height: 1; }
    .stat .lbl { font-size: 11px; color: var(--muted); margin-top: 4px; }
    .stat.green .val { color: var(--green); }
    .stat.yellow .val { color: var(--yellow); }
    .stat.red .val   { color: var(--red); }
    .stat.blue .val  { color: var(--blue); }

    /* Spinner */
    @keyframes spin { to { transform: rotate(360deg); } }
    .spinner {
      display: inline-block;
      width: 12px; height: 12px;
      border: 2px solid var(--border);
      border-top-color: var(--blue);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      vertical-align: middle;
    }
  </style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>⚙ PR Code Review Agent</h1>
    <p>Enter a GitHub pull request URL and click Run Review to start the automated analysis.</p>
  </div>

  <form class="form" id="form">
    <input id="pr-url" type="url" placeholder="https://github.com/owner/repo/pull/42" autocomplete="off" required />
    <button type="submit" id="run-btn">Run Review</button>
  </form>

  <div class="feed-label">Progress</div>
  <div class="feed" id="feed"></div>

  <div class="summary" id="summary" hidden>
    <h2>Review Summary</h2>
    <div class="stats" id="stats"></div>
  </div>
</div>

<script>
  const form    = document.getElementById('form');
  const prInput = document.getElementById('pr-url');
  const runBtn  = document.getElementById('run-btn');
  const feed    = document.getElementById('feed');
  const summary = document.getElementById('summary');
  const stats   = document.getElementById('stats');

  let totalIssues = 0;
  let evalData = null;

  function line(cls, icon, html) {
    const el = document.createElement('div');
    el.className = 'line ' + cls;
    el.innerHTML = '<span class="icon">' + icon + '</span><span class="msg">' + html + '</span>';
    feed.appendChild(el);
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return el;
  }

  function divider() {
    const el = document.createElement('hr');
    el.className = 'divider';
    feed.appendChild(el);
  }

  function spinnerLine(text) {
    return line('dim', '<span class="spinner"></span>', text);
  }

  function stat(val, lbl, cls) {
    return '<div class="stat ' + cls + '"><div class="val">' + val + '</div><div class="lbl">' + lbl + '</div></div>';
  }

  function handle(event) {
    if (event.type === 'memory_loaded') {
      line('ok', '✓', 'Memory loaded &mdash; <strong>' + event.highlightsLoaded + '</strong> style rules, <strong>' + event.errorsLoaded + '</strong> past errors');

    } else if (event.type === 'files_fetched') {
      line('ok', '✓', 'PR diff fetched &mdash; <strong>' + event.total + '</strong> file(s), <strong>' + event.patchable + '</strong> with patches');
      divider();
      line('dim', '›', '<em>Planning phase — reviewing each file…</em>');

    } else if (event.type === 'file_reviewed') {
      const count = event.issueCount;
      if (count === 0) {
        line('dim', '·', event.filename + ' &mdash; clean');
      } else {
        line('warn', '!', event.filename + ' &mdash; <strong>' + count + '</strong> issue(s)');
      }

    } else if (event.type === 'plan_complete') {
      totalIssues = event.issues.length;
      divider();
      line('ok', '✓', 'Planning complete &mdash; <strong>' + totalIssues + '</strong> issue(s) found');
      if (totalIssues > 0) {
        line('dim', '›', '<em>Evaluation phase — auditing for gaps &amp; quality…</em>');
      }

    } else if (event.type === 'evaluation_complete') {
      evalData = event;
      const parts = [];
      if (event.kept)     parts.push('<strong>' + event.kept     + '</strong> kept');
      if (event.modified) parts.push('<strong>' + event.modified + '</strong> modified');
      if (event.deleted)  parts.push('<strong>' + event.deleted  + '</strong> removed');
      if (event.added)    parts.push('<strong>' + event.added    + '</strong> added');
      line('ok', '✓', 'Evaluation complete &mdash; ' + (parts.join(', ') || 'no changes'));
      divider();
      line('dim', '›', '<em>Execution phase — posting comments…</em>');

    } else if (event.type === 'comment_posted') {
      const label = event.action.toUpperCase();
      line('posted', '↑',
        '<a href="' + event.url + '" target="_blank" style="color:var(--blue);text-decoration:none;">' +
        event.file + ':' + event.line + '</a>' +
        ' <span class="badge medium">' + label + '</span>');

    } else if (event.type === 'done') {
      divider();
      line('ok', '✓', 'Review complete &mdash; <strong>' + event.totalPosted + '</strong> comment(s) posted');
      showSummary(event.totalPosted);

    } else if (event.type === 'error') {
      line('bad', '✗', event.message);
    }
  }

  function showSummary(posted) {
    if (!evalData) return;
    stats.innerHTML =
      stat(totalIssues,       'Issues found',    'yellow') +
      stat(evalData.deleted,  'False positives',  'red')   +
      stat(evalData.modified + evalData.added, 'Improved',  'blue') +
      stat(posted,            'Comments posted',  'green');
    summary.hidden = false;
    summary.scrollIntoView({ behavior: 'smooth' });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const prUrl = prInput.value.trim();
    if (!prUrl) return;

    feed.innerHTML = '';
    summary.hidden = true;
    stats.innerHTML = '';
    totalIssues = 0;
    evalData = null;
    runBtn.disabled = true;
    runBtn.textContent = 'Running…';

    const qs = new URLSearchParams({ pr_url: prUrl });
    const es = new EventSource('/api/review/stream?' + qs);

    es.onmessage = (e) => {
      let event;
      try { event = JSON.parse(e.data); } catch { return; }
      handle(event);
      if (event.type === 'done' || event.type === 'error') {
        es.close();
        runBtn.disabled = false;
        runBtn.textContent = 'Run Review';
      }
    };

    es.onerror = () => {
      line('bad', '✗', 'Connection lost. Please try again.');
      es.close();
      runBtn.disabled = false;
      runBtn.textContent = 'Run Review';
    };

    spinnerLine('Starting…');
  });
</script>
</body>
</html>`;

export default router;
