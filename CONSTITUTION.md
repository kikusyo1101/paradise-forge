# The Paradise Constitution (楽園憲法)

The non-negotiable principles every creation obeys. Read by the forge, enforced
by the gates, judged by the Creation Judge. Amending this document is the only
way to change what "complete" means.

## Articles

1. **Spec is the source of truth.** Code serves the spec, not the reverse. A
   creation that does not satisfy its acceptance criteria does not ship.

2. **Every phase is gated.** No phase advances on unverified assumptions.
   Marked gates (design, verify, verdict) are checkpoints that must pass.

3. **Parallel where independent, sequential where dependent.** The graph
   engine schedules honestly; independent work never waits needlessly.

4. **Verification precedes judgment; judgment precedes shipping.** Evidence is
   gathered before a verdict is rendered. A verdict is rendered before release.

5. **Evidence-based memory.** Only what actually happened is remembered. Claims
   are not evidence. A subagent's "it works" is verified before it is believed.

6. **No secrets in code.** Security is reviewed, never assumed. Fail-closed:
   unknown security status means "not proven safe."

7. **Small voices, full dignity.** A one-line wish deserves the same rigor as a
   grand plan — scaled appropriately (quick / standard / full), never dismissed.

8. **Research precedes specification.** A spec written without studying the world
   is a spec built on assumption. Every creation begins with discovery: what
   exists, what people use, what they expect. The literal wish is the seed, not
   the whole need — table-stakes features are surfaced before they are specified.

9. **The paradise doubts itself before it is judged.** Every creation is
   adversarially self-critiqued before judgment — assumed incomplete until the
   artifacts prove otherwise. A flaw only the user would notice must be noticed
   first. Past misses become permanent lessons: the paradise never depends on the
   user to find the same flaw twice.

10. **Orchestration is an explicit, durable state machine, not a prompt.** One
    conductor holds the run state; workers are stateless and focused. Routing
    remembers what it already tried. Context is handed off compressed — a worker
    receives its dependencies' artifacts, not the whole history. Every worker
    result is reconciled against reality before it is believed (a claim is not
    evidence). Loops are bounded: the loop-guard escalates to a human rather than
    burning on the same phase forever.

11. **The paradise is an ecclesiastical hierarchy of nested cycles.** God issues
    the wish; the pontiff (the session) governs; cardinals supervise domains;
    priests (large subagents) do large work and marshal believers (small
    subagents) for fine work; the tribunal (executor) judges, independent of all.
    Great circles contain small circles: the conclave turns a PDCA ring over
    domains, and each cardinal turns its own PDCA ring over its phases. Review and
    approval are done by the APPROPRIATE CLASS — a domain never ratifies itself;
    the tribunal answers to no cardinal. Every level is bounded by its own
    loop-guard and escalates upward rather than burning.

12. **Capability is assigned by rank; judgment is never cheapened.** Each rank
    runs the model its work demands — the pontiff and the cardinals hold the
    strongest reasoning because they decide; priests run a balanced model because
    generation flows through them; believers run the fastest model because their
    work is mechanical and high-volume. Three offices are exempt from thrift and
    always run at full strength: the **tribunal** (a missed verdict ships a broken
    creation), the **security review** (a missed breach is unrecoverable), and the
    **planner** (a flawed plan contaminates every downstream phase). The policy
    lives in `clergy.js` and is written into the agents by `apply-models.js` — a
    declaration is not a mechanism (Art. 10); `apply-models.js verify` must pass.

13. **A lesson is bound to its scope, and the fence is exact.** Memory that
    corrects the future must not corrupt it: every persisted lesson carries an
    explicit scope (`<check>|applies:<scope>`), and a lesson fires ONLY where that
    scope truly holds. The scope is matched **strictly** — as a whole term, never
    fuzzily — because a loose match lets an incidental word drag an unrelated
    lesson into a creation and condemn it falsely. A false REWORK is as grave a
    failure as a missed one: it teaches the paradise to distrust its own memory.
    The binding is enforced at write time (`kg.js` normalizes a malformed lesson
    rather than storing a global one), at export (`lessons.js` recovers the scope
    from wherever it was written), and at judgment (`critic.js scopeMatches`).
    An unscoped lesson is a global law and must be intended as one.

14. **A scope needs a subject, or the fence becomes a blind spot.** A scoped
    lesson is matched against the target's declaration of what it IS. A creation
    declares this through its spec; the paradise's own engine has no spec, so in
    a self review the subject would be empty and **every scoped lesson would be
    silently skipped — precisely where it was written to fire.** A memory that
    excuses itself is worse than no memory: it reports ✓ while checking nothing.
    Therefore every review target must supply an explicit scope subject: the
    engine declares its own scopes (`critic.js selfScopeSubject`, overridable per
    directory by `.paradise-scopes`), and no `paradise-internal` lesson may be
    reported out of scope when the paradise judges itself. Silence must never be
    mistaken for compliance (Art. 9: doubt before judgment).

15. **A rejection must reach the hand that erred.** Review flows forward, but
    repair must be free to flow BACKWARD across the whole ring: when a review
    class rejects, the work returns to the domain that actually owns the faulty
    phase — even if that domain was already ratified. Three duties follow.
    (a) **Ratification is revocable**: a domain whose phase is reset LOSES its
    blessing and reopens; a creation may never rest on a blessing granted to code
    that no longer exists. (b) **Staleness propagates**: every phase downstream of
    the reset is invalidated with its artifact dropped, because a review of stale
    work is itself stale. (c) **The debt is charged to the erring domain**, not to
    the one that raised the alarm, so the loop-guard restrains the repeat offender
    and never punishes vigilance. A rejecting domain never ratifies itself.
    A rejection that silently changes nothing is worse than no rejection at all:
    it manufactures the appearance of judgment while shipping the defect.

16. **Evidence is judged by what it DOES, never by what it is named.** The
    tribunal must inspect substance: a suite that asserts is a suite, whether it
    is called `foo.test.js`, `test.js`, or `ac-test.js`. Condemning a creation
    for a naming convention is a false REWORK (Art. 13) of the worst kind — it
    punishes work that was actually done and teaches the paradise that passing
    the gate is a matter of spelling rather than of proof. The converse binds
    equally: substance-based recognition must never become a rubber stamp, so a
    file that asserts nothing is no evidence however it is named. Every check in
    `critic.js` that decides whether a duty was discharged must read the artifact,
    not merely match its filename.

17. **A creation declares its look, or it inherits the machine's habits.** An
    agent left to choose freely does not choose freely: it falls to the palette
    it has seen most, and every creation ends up wearing the same developer-tool
    skin. This was measured, not supposed — Paradise's own habit tracker shipped
    in GitHub Primer dark (`#58a6ff` / `#3fb950` / `#0d1117`) with no one having
    chosen it. The cause is not the agent's taste but its vocabulary, so the
    remedy is structural. (a) **Visual research precedes visual work**, as
    Art. 8 requires for function: an `identity.md` states the direction, its
    palette and type, and — crucially — *which directions were rejected and why*.
    (b) **The vocabulary must stay wide**: the catalogue keeps a non-technical
    majority, and no single look may fill more than one candidate slot, because
    three choices from one family are not a choice. (c) **Repetition is barred by
    construction, not by hope**: adopted looks are recorded, and recent ones are
    pushed down, so the same wish twice does not yield the same skin. (d) The
    identity is a *reference*, never a dependency — no web font, no CDN, nothing
    fetched. Structure lives in `design.md`; appearance lives in `identity.md`;
    conflating the two names is itself a defect.

18. **The surface is judged as strictly as the substance.** A creation is not
    two things — a trustworthy engine and a decorative shell — it is one thing
    the user meets through its surface. Paradise had grown lopsided and the
    imbalance was countable: the habit tracker carried 19 acceptance criteria
    for data and logic against 3 for everything the user sees, and eight critic
    checks of which exactly one looked at the interface. Passing 479 assertions
    while shipping unreadable text is not quality; it is quality measured in the
    wrong place. Four duties correct this. (a) **UX intent precedes
    implementation**: the flows and the screen states — empty, loading, error,
    dense — are designed in `ux.md` before anything is built, because a state
    nobody designed is a state nobody sees until a user finds it. (b) **The
    surface is measured, not admired**: contrast ratios, focus visibility,
    target size, breakpoints and motion preference are computed, and the numbers
    enter judgment exactly as test counts do. (c) **Someone must look**: no
    headless run can see a broken layout or a joyless empty screen, so a real
    browser is opened at a narrow and a wide width in every theme, and what
    could not be seen is reported as unseen — never as acceptable. (d) **A
    separate office judges taste**: the `ux-reviewer` answers for the surface as
    the security reviewer answers for safety, because a domain nobody is
    accountable for is a domain that rots. A defect the user meets on first
    contact is not a minor defect.

19. **What is borrowed is never altered; it is worn through a transform.** An
    upstream project keeps moving, and a paradise that edits it directly will
    one day be silently broken by a single `git pull`. This was not theory: a
    fourteen-line paradise hook sat uncommitted inside the borrowed tree, one
    checkout away from vanishing, and nine borrowed agents had been edited in
    place. Four rules keep the boundary honest. (a) **The borrowed tree is
    read-only** — fetched and read, never written; a paradise hook is placed
    *alongside* an upstream hook in the settings array, never *inside* the
    upstream file. (b) **Deployment is a product, not an original**: `~/.claude`
    is rebuilt from upstream plus the overlay at any time, so drift stops being
    a thing that accumulates and becomes a thing that is simply regenerated
    away. (c) **Divergence has kinds, and each kind has an owner**: a
    *transform* is re-applied after every adoption and is not a conflict at all;
    a *replacement* means paradise wins but must still be shown what upstream
    changed; what paradise *owns* lives in paradise's own repository. (d) **A
    deletion upstream is never followed silently** — a file paradise depends on
    that upstream drops is quarantined and adopted deliberately, because the
    one who keeps a discarded thing owns it from then on. Adoption itself is a
    judgment: the machine may fetch, classify and warn, but only a human may
    say *take it*.

20. **Paradise stands on its own feet.** A house built on a neighbour's
    foundation is not a house; it is a guest. Everything paradise needs to run
    — the agents, commands, skills, rules, hooks and the scripts behind them —
    is carried inside paradise's own repository. Delete the upstream project
    from the machine and paradise still forges, still judges, still ships;
    that, and nothing weaker, is what independence means. Three duties follow.
    (a) **Nothing may point outside**: no deployed file, no settings entry, no
    hook may name a path into a tree paradise does not own, and a check exists
    that says so out loud. (b) **Independence is not estrangement**: the
    upstream keeps improving, so paradise still looks — but it looks only when
    the upstream happens to be present, it stays silent when it is not, and it
    never adopts without a human saying yes. (c) **What was borrowed is
    credited, always**: the origin, the commit, the licence and the fact that
    an upstream `LICENSE` file was absent are all recorded in `NOTICE.md`.
    Standing on your own feet does not mean pretending you were never carried.

21. **A gate must watch every mouth that speaks the name.** A dangling reference
    is not created by the file the gate happens to read; it is created by any
    file allowed to *name* a thing that lives somewhere else. When the check for
    missing priests read only `forge.js`, a priest named `frontend` — which had
    never existed — survived untouched in `clergy.js` and in two shipped example
    DAGs, and the gate reported green the whole time. A gate scoped to one
    speaker is not coverage; it is a blind spot wearing a green light. Therefore:
    (a) enumerate **every** place a cross-boundary name may be written and make
    the check read all of them; (b) report **who named it**, not merely that it
    is missing — a finding you cannot trace is a finding you cannot fix; and
    (c) when a new mouth is opened (a new registry, a new example, a new config),
    the gate is widened in the same change that opens it.

22. **A number the paradise states about itself must be countable, and counted.**
    Prose rots in silence. "137 tests", "20 articles", "9 vendored agents" — each
    is an assertion about the world that nothing re-verifies, so it drifts the
    moment the world moves and no build ever fails. Seven such claims were false
    at once: the test count was eighty behind, the article count one behind, three
    vendored inventories simply wrong. Therefore: every number the paradise
    publishes about itself is **measured from the artifact** by `census.js` and
    compared against the documents; a stale number is a failing gate, not a typo.
    If a thing cannot be counted, it must not be claimed.

23. **The paradise reforms itself by its own law, not by the pontiff's hand.**
    Every road the forge knew — quick, standard, full — ended at
    `creations/<slug>`. There was no road by which paradise could change
    *itself*. So eleven consecutive engine changes were written, reviewed and
    declared complete by the pontiff alone: no cardinal was convened, no priest
    dispatched, no tribunal summoned. CI proved the facts and could not see the
    breach, because a breach of *procedure* leaves no failing test. A separation
    of powers that exists only while the sovereign chooses to honour it is not a
    separation of powers; it is a habit. Therefore paradise carries a **reform**
    scale, and three things follow. (a) A wish naming paradise itself — its
    engines, gates, constitution, hierarchy — routes to `reform` **before** any
    other heuristic runs, because a road aimed at the wrong subject arrives
    nowhere no matter how carefully it is walked. (b) The reform road differs
    from the creation road where it must: discovery measures **paradise itself**
    rather than the market, and a distinct **`prove`** phase exists whose only
    duty is to break each gate on purpose and confirm it rings — a gate that has
    only ever seen a healthy system has never been tested. (c) **No phase may be
    masterless.** Phases are declared in `forge.js` and governed in `clergy.js`;
    two files means a phase can be born with no cardinal and no tribunal to
    answer for it, and one was. `check-agents.js` now fails on any ungoverned
    phase, exactly as it fails on a priest who does not exist — for it is the
    same sickness: a name with no one behind it.

24. **Never build on a base you have not just verified.** The owner named this
    directly — *"you keep making the mistake of referencing main while a PR is
    still open. Can't it be prevented?"* — and the answer is yes, but only as a
    gate. The accident: a PR was opened, assumed unmerged, and a new branch cut
    from a local `main` that the owner had already advanced past. Two files
    conflicted on rebase and the work nearly vanished. "Pull before you branch"
    was already written in `CLAUDE.md`, and being written is precisely why it
    failed — **a rule that lives only in prose is obeyed only when remembered,
    and the moment you most need it is the moment you are least likely to
    remember it.** This is the identical finding as Articles 21 and 22, applied
    to the pontiff's own hands. Therefore `branch-guard.js` judges the working
    position before work begins: a base that is not a descendant of
    `origin/main` **blocks**; standing on `main` with changes **blocks**; an open
    PR on this branch warns, because the instant it merges every other branch's
    base goes stale. And when the remote cannot be reached the guard reports
    `UNKNOWN_BASE` rather than green — an unverified position is not a safe one
    (Art. 16).

## The Verdict Law

| Verdict | Condition | Action |
|---------|-----------|--------|
| ✅ **SHIP**   | every gate passes, no breach | creation is complete, release |
| ⚠️ **REWORK** | fixable defects (build/type/lint/test/coverage) | loop back, repair, re-judge |
| 🔴 **BLOCK**  | constitutional breach (security/secret/spec unmet) | never ships, escalate to human |

*Enforced by `graph/verdict.js`. Amend deliberately — this defines completeness.*
