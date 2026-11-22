/**
 * The recruiter chat page script, served at `/admin/chat/page.js` (CSP `script-src 'self'`).
 * Every piece of text, model answers and names included, is written with `textContent`; the script
 * never builds HTML.
 */
export const CHAT_PAGE_JS = `(function () {
  "use strict";
  var root = document.getElementById("chat-page");
  var base = root.dataset.base;
  var token = encodeURIComponent(root.dataset.token);
  var apiUrl = base + "/api/r/" + token;
  var sessionUrl = base + "/admin/chat/" + token + "/session";
  var who = document.getElementById("who");
  var remaining = document.getElementById("remaining");
  var status = document.getElementById("status");
  var log = document.getElementById("log");
  var form = document.getElementById("ask");
  var question = document.getElementById("question");
  var send = document.getElementById("send");
  var history = [];
  var busy = false;
  var dead = false;

  var MESSAGES = {
    chat_revoked: "This link was revoked.",
    chat_expired: "This link has expired.",
    limit_reached: "The question quota for this link is used up.",
    llm_unavailable: "The model is unavailable. The question was not counted. Try again.",
    not_found: "This link does not exist.",
    unauthorized: "The chat session was not accepted."
  };

  function setStatus(text) { status.textContent = text; }

  function lock(on) {
    busy = on;
    send.disabled = on;
    question.disabled = on;
  }

  function addMessage(role, text) {
    var node = document.createElement("div");
    node.className = "msg " + role;
    node.textContent = text;
    log.appendChild(node);
    return node;
  }

  /** An Error whose message is safe to show, from a failed response. */
  function failure(res) {
    var done = function (code) {
      var text = MESSAGES[code];
      if (!text) text = res.status === 400 ? "The request was rejected." : "Request failed (" + res.status + ").";
      var error = new Error(text);
      error.status = res.status;
      return error;
    };
    return res.json().then(function (body) { return done(body && body.error); }, function () { return done(undefined); });
  }

  function startSession() {
    return fetch(sessionUrl, { method: "POST", credentials: "same-origin" }).then(function (res) {
      if (res.redirected) throw new Error("Your admin session ended. Sign in again.");
      if (res.status === 410) throw new Error("This link is revoked or expired.");
      if (res.status === 404) throw new Error(MESSAGES.not_found);
      if (!res.ok) throw new Error("Could not start the chat session (" + res.status + ").");
    });
  }

  function postChat(messages) {
    return fetch(apiUrl + "/chat", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: messages })
    });
  }

  function setRemaining(value) {
    if (value !== null && value !== undefined) remaining.textContent = String(value);
  }

  function open() {
    return fetch(apiUrl, { credentials: "same-origin" })
      .then(function (res) { return res.ok ? res.json() : failure(res).then(function (e) { throw e; }); })
      .then(function (info) {
        who.textContent = info.recruiterName + (info.company ? " (" + info.company + ")" : "");
        setRemaining(info.remaining);
        return startSession();
      })
      .catch(function (error) {
        setStatus(error.message);
        dead = true;
        lock(true);
      });
  }

  function readStream(res, node) {
    var reader = res.body.getReader();
    var decoder = new TextDecoder();
    var text = "";
    function pump() {
      return reader.read().then(function (chunk) {
        if (chunk.done) {
          text += decoder.decode();
          node.textContent = text;
          return text;
        }
        text += decoder.decode(chunk.value, { stream: true });
        node.textContent = text;
        return pump();
      });
    }
    return pump();
  }

  function ask(text) {
    var messages = history.concat([{ role: "user", content: text }]);
    var retried = false;
    function attempt() {
      return postChat(messages).then(function (res) {
        if (res.status === 401 && !retried) {
          retried = true;
          return startSession().then(attempt);
        }
        return res;
      });
    }
    var mine = addMessage("user", text);
    var reply = null;
    return attempt()
      .then(function (res) {
        if (!res.ok) return failure(res).then(function (e) { throw e; });
        setRemaining(res.headers.get("X-Remaining"));
        reply = addMessage("assistant", "");
        return readStream(res, reply);
      })
      .then(function (answer) {
        history.push({ role: "user", content: text }, { role: "assistant", content: answer });
        question.value = "";
        setStatus("");
      })
      .catch(function (error) {
        log.removeChild(mine);
        if (reply) log.removeChild(reply);
        setStatus(error.status ? error.message : "The connection was interrupted. " + error.message);
        if (error.status === 410) dead = true;
      });
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var text = question.value.trim();
    if (busy || text === "") return;
    setStatus("");
    lock(true);
    ask(text).then(function () {
      lock(dead);
      if (!dead) question.focus();
    });
  });

  setStatus("Loading...");
  open().then(function () { if (status.textContent === "Loading...") setStatus(""); });
})();
`;
