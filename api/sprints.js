// Side Hustle Sprints: GET lists the member's sprints and unused credits;
// POST { action: "start", days, goal, target } uses one credit of that length;
// POST { action: "checkin", id, day, done, amount, note } records one day.

import { currentUser, json, readJson } from "./_lib/http.js";
import { SPRINT_LENGTHS, sprintCredits } from "./_lib/catalog.js";
import { saveUser } from "./_lib/users.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const text = (v, max) => String(v ?? "").trim().slice(0, max);
const money = (v) => {
  const n = Math.round(Number(v) * 100) / 100;
  return Number.isFinite(n) && n >= 0 && n <= 10_000_000 ? n : 0;
};

const view = (user) => ({ credits: sprintCredits(user), sprints: user.sprints || [] });

export async function GET(request) {
  const user = await currentUser(request);
  if (!user) return json({ error: "Not logged in." }, 401);
  return json(view(user));
}

export async function POST(request) {
  const user = await currentUser(request);
  if (!user) return json({ error: "Not logged in." }, 401);
  const body = await readJson(request);
  user.sprints ||= [];

  if (body.action === "start") {
    const days = Number(body.days);
    if (!SPRINT_LENGTHS.includes(days)) return json({ error: "Unknown sprint length." }, 400);
    if (sprintCredits(user)[days] < 1) return json({ error: "You don't have an unused " + days + "-day sprint. Buy one to start." }, 402);
    const goal = text(body.goal, 200);
    if (!goal) return json({ error: "Write the goal for this sprint." }, 400);
    user.sprints.push({
      id: "spr_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      days,
      goal,
      target: money(body.target),
      startedAt: new Date().toISOString(),
      checkins: {},
    });
    await saveUser(user);
    return json(view(user));
  }

  if (body.action === "checkin") {
    const sprint = user.sprints.find((s) => s.id === body.id);
    if (!sprint) return json({ error: "Sprint not found." }, 404);
    const day = Number(body.day);
    // One day of slack so a member ahead of UTC can log "today" on their side.
    const reachable = Math.floor((Date.now() - Date.parse(sprint.startedAt)) / DAY_MS) + 2;
    if (!Number.isInteger(day) || day < 1 || day > sprint.days || day > reachable) return json({ error: "That day isn't open yet." }, 400);
    sprint.checkins[day] = { done: !!body.done, amount: money(body.amount), note: text(body.note, 500), at: new Date().toISOString() };
    await saveUser(user);
    return json(view(user));
  }

  return json({ error: "Unknown action." }, 400);
}
