// Helpers for the member pages (login, account, reset, welcome, admin).

const ElevMember = {
  // GET when no body, POST JSON otherwise. Rejects with the API's error message.
  async api(path, body) {
    const res = await fetch(path, body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
    return data;
  },

  // Wires a form: disables the submit button while `action` runs and shows errors in `msgId`.
  form(formId, msgId, action) {
    const form = document.getElementById(formId);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = form.querySelector("button[type=submit]");
      ElevMember.note(msgId, "");
      button.disabled = true;
      try {
        await action();
      } catch (err) {
        ElevMember.note(msgId, err.message);
      } finally {
        button.disabled = false;
      }
    });
  },

  note(id, text, ok = false) {
    const el = document.getElementById(id);
    el.textContent = text;
    el.classList.toggle("is-ok", ok);
  },

  esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  },

  date(iso, withTime = false) {
    if (!iso) return "";
    const d = new Date(iso);
    const opts = { year: "numeric", month: "short", day: "numeric" };
    if (withTime) Object.assign(opts, { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleString("en-US", opts);
  },
};

document.addEventListener("click", (event) => {
  const link = event.target.closest("[data-logout]");
  if (!link) return;
  event.preventDefault();
  fetch("/api/logout", { method: "POST" }).finally(() => {
    window.location.href = "/login.html";
  });
});
