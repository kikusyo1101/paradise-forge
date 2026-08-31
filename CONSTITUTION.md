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

19. **What paradise has taken in, paradise owns — and may freely alter.**
    *(Amended. The original article forbade editing the borrowed tree, and that
    was right while paradise was a guest. Article 20 ended the tenancy: every
    asset was vendored into paradise's own repository. A rule written for a
    dependency that no longer exists does not protect anything — it only
    forbids. The owner said so plainly: 「上流工程を変えないは既に破棄された。
    全てを楽園に取り込んだため改変も自由となった。」)*

    The successor rule is narrower and truer. (a) **`overlay/vendor/` is
    paradise's property, not a loan.** It may be edited directly, and edits to
    it are ordinary changes reviewed like any other. (b) **The deployment is
    still a product, never an original**: `~/.claude` is rebuilt from
    `overlay/` at any time, and is never hand-edited — that discipline was
    never about the upstream, it was about regenerability. (c) **A transform
    still beats a hand-edit where a rule applies to many files at once**
    (models by rank, spawn authority by station): not because the files are
    untouchable, but because a rule applied by hand to nine files drifts on the
    tenth. (d) **The upstream, if present, is a source of ideas — never a
    source of supply.** Paradise looks when it happens to be there, stays
    silent when it is not, and never adopts without a human saying *take it*.

    The amendment exposed a lie the gates had been telling. Independence was
    asserted in Article 20 and tested by counting vendored files — but nothing
    ever checked **where deployment actually read from**. It read from the
    upstream tree: 31 of 53 deployed files, including nine priests. Hiding the
    upstream collapsed the deployment to 22 files. The stock was counted; the
    supply line was never traced. **A gate that measures the inventory instead
    of the supply proves nothing about independence** — and it is worse than no
    gate, because it looks like coverage.

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

25. **A hierarchy that cannot be walked is not a hierarchy.** The owner
    declared the paradise collapsed, and the measurement agreed: all thirteen
    believers were names with no bodies, every cardinal was a JSON record that
    dispatched nobody, and `conclave.next` handed a priest's orders **to the
    pontiff**, who then called the priest directly. Five ranks were written
    down; two were ever executed. The cause was not laziness. The Claude Agent
    SDK documentation names it exactly: *"without `Agent` in `allowedTools`,
    subagent invocation falls through to the permission callback or is
    refused"* — and measurement found `Task` held by `cardinal` alone. **The
    ladder was not merely unused; it was impassable.** Therefore: (a) **every
    rank names the actor that plays it** — a cardinal is an `agent`, not a
    label; (b) **every subordinate declared must have a body**, and a name with
    no body fails the gate exactly as a dangling priest does; (c) **whoever
    governs subordinates must hold the authority to dispatch them**, granted by
    rule (`apply-spawn.js`) rather than by hand, because a rule applied by hand
    to seven files drifts on the eighth; (d) **orders flow to the rank below,
    never past it** — the wave is addressed to the cardinal, carrying purpose,
    output format, permitted sources and task boundary, because vague
    delegation makes children duplicate each other's work; and (e) **the
    declared depth must fit the runtime** (three: pontiff → cardinal → priest →
    believer), since a ladder taller than the ceiling silently collapses into
    the parent doing the work itself.

26. **Parallelism is a property of the work, not a capacity of the runtime —
    and the research that arrives late still rules.** Two subagents were sent to
    study hierarchical orchestration; the second returned *after* the design was
    finished, and it did not confirm the design — it refuted three parts of it.
    The honest response is to obey the evidence, not to defend the artifact.
    (a) **The ceiling is not the setting.** The runtime allows 20 concurrent
    children, and the paradise had written 20 as its dispatch width. Measurement
    says otherwise: turns grow superlinearly with team size (T ∝ n^1.724) and
    effective team size is **3–4**; performance against coordination complexity
    is an **inverted U**, so past the peak more workers is strictly worse.
    (b) **Some work must never be split.** "Actions carry implicit decisions"
    (Cognition): children who cannot see each other's decisions produce mutually
    contradictory artifacts — one built a Super Mario background while another
    built a bird that was not Flappy. Anthropic names **coding tasks**
    specifically as ill-suited. The paradise's construction domain is exactly
    that, so domains now declare the *nature* of their work (research and review
    parallelise; design and build do not) and an undeclared nature falls back to
    sequential. (c) **Verification is a fifth of all failure and a verifier is
    not a talisman.** MAST (200+ traces, κ=0.88) puts task-verification failures
    at 21.3% — incomplete verification 6.82%, incorrect verification 6.66%,
    premature termination 7.82% — and shows verifiers that check only the
    surface (it compiles, it has comments) passing a chess program that accepts
    illegal moves. Orders therefore carry an explicit `done_when`, demand
    evidence as raw command output, and instruct the child to return *blocked*
    rather than proceed on a guess (FM-2.2, 11.65%). (d) **Control flow belongs
    in topology, not in prose.** MAST's intervention experiment is decisive:
    changing the topology beat changing the prompt (25.0% → 40.6% versus 34.4%),
    and rewriting ChatDev's prompt failed to remove a structural fault at all.
    This is Article 24's lesson — a rule that lives only in prose is obeyed only
    when remembered — proven again with numbers, one level up.

27. **An artifact proves work was done; it never proves who did it.** Article 25
    gave the hierarchy bodies and Article 26 gave it a safe width, and the
    pontiff still wrote in the previous pull request: *"whether a cardinal
    actually dispatches a priest has not been verified in execution."* That gap
    is not cosmetic. `contract.js` reconciled a phase by checking that its
    artifact existed and was non-trivial — and an artifact the pontiff wrote by
    his own hand satisfies both conditions perfectly. **The reconciler could not
    tell delegation from impersonation**, which is exactly how eleven pull
    requests were produced with no cardinal ever convened. MAST names the
    behaviour and measures it: FM-2.6, *reasoning-action mismatch*, 13.98% —
    saying "I will delegate this" and then doing it oneself. The Claude Agent
    SDK names the only sound remedy: *"detect `tool_use.name in ("Task",
    "Agent")` and confirm the child's messages carry `parent_tool_use_id` —
    this is the only reliable way to verify a subagent actually ran."*
    Therefore: (a) **dispatch leaves a trace**, recorded as `spawnTrace` on the
    run itself, not in prose; (b) **the trace distinguishes three states, and
    only one of them is green** — *observed* (a real `tool_use` id exists),
    *asserted-only* (someone claims a dispatch with no id), and *no-trace*; an
    assertion of delegation is a claim like any other and is not evidence
    (Art. 5); (c) **reconciliation of a phase consults the trace**, so an
    artifact with no observed dispatch is rejected as `file-but-unspawned` no
    matter how good the artifact is; and (d) **what cannot be observed is never
    reported as done** — a hierarchy that cannot show its own footprints has not
    demonstrated that it was walked, only that something was produced.

28. **A lesson about conduct cannot be checked by grepping the code.** The
    critic judged every past miss the same way — does its keyword appear in the
    source? That works for a lesson whose remedy is a mechanism (`census.js` was
    built, so "census" appears), and is meaningless for a lesson whose remedy is
    a *behaviour*: "close the browser after a visual check", "obey evidence that
    arrives after the design is finished". Such a lesson can never appear in the
    source, so it reported REGRESSION forever. Measurement made the scale of the
    error plain: of thirty lessons, **eighteen were conduct**, and only two were
    red — the other sixteen passed **because their words happened to occur in
    unrelated code**. The gate was not working; it was being lucky, and the two
    unlucky ones looked like real defects while the sixteen lucky ones hid real
    blindness. Therefore a lesson declares its `kind`. A *mechanism* lesson is
    still verified against the artifact. A *conduct* lesson is **surfaced, never
    graded**: it is printed at every review as a standing obligation, because
    the two wrong answers are equally wrong — grading it red forever trains the
    reader to ignore a permanently red gate (and an ignored gate is worse than
    none, Art. 21), while marking it green silently deletes the lesson. What
    cannot be measured must still be remembered; it simply must not be scored.

29. **A derived file is a copy of the truth, never the truth.** The tribunal
    rejected the previous change: green locally, one test failing in CI. The
    cause was a gate written the same hour — it read `graph/lessons.json` and
    asserted that at least one lesson existed. But that file is *generated* from
    the knowledge graph, CI has no knowledge graph, and the tribunal job
    regenerates it before judging. Measured: **31 lessons in the repository, 0
    after CI regenerates, 1682 lines gone.** The repository's copy and the
    running environment's copy are simply different objects. Three such files
    are tracked in git, and every one carries the same three hazards: its
    content differs by environment, it conflicts on every parallel pull request
    (and must be regenerated, never hand-merged), and any check that assumes its
    content breaks wherever the generator's input is absent. Therefore derived
    artifacts are **declared** (`derived.js`), and a test may read one but may
    never assert that it has content. Assert against the **generator** instead:
    that `lessons.js` defaults an undeclared lesson to `mechanism` is true with
    or without a knowledge graph, while "some lesson is a mechanism" is true only
    on the author's machine. This is Article 19's lesson — *count the supply
    line, not the stock* — turned inward: **do not test the output of a
    generator when what you mean to assert is a property of the generator.**

30. **What is made and what makes it do not share a house.** God asked a simple
    question — *are the artifacts of testing still sitting in paradise?* They
    were: **45 files across 4 creations, tracked in the engine's own git
    history.** The engine and its creations have opposite lifetimes. The engine
    is law: it is kept, and every line of it is argued over in a pull request
    that God alone merges. A creation is a trace of an attempt: it is meant to
    be discarded, and it multiplies without limit. Kept in one repository, the
    second buries the first — the engine's history fills with the noise of
    experiments, the tribunal's CI runs the critic over dead scratch work, and
    no one can tell a finished creation from the residue of a test. Therefore
    creations live **outside** the paradise, in `paradise-creations`, and the
    engine holds exactly one road to them: `graph/workspace.js`. No engine file
    may hardcode `creations/` again; the gate `workspace.js check` reads git's
    own index and fails if the paradise is carrying a creation.

    The boundary is **lifetime, not authorship** — which is why creations are
    *not* split one-repository-per-creation. Three measured reasons: the critic
    sweeps every creation in one pass and N repositories make that N clones; a
    repository is a unit that cannot be cleaned (deleting thirty of them is
    hand-work, `rm -rf` is one line); and creations do not depend on one
    another, so there is nothing between them to separate. One line is drawn,
    between engine and creation, and only there. A creation earns its own
    repository only when it is published, released, and carries its own issues
    — then it is split out, deliberately, by `git subtree split`.

## The Verdict Law

| Verdict | Condition | Action |
|---------|-----------|--------|
| ✅ **SHIP**   | every gate passes, no breach | creation is complete, release |
| ⚠️ **REWORK** | fixable defects (build/type/lint/test/coverage) | loop back, repair, re-judge |
| 🔴 **BLOCK**  | constitutional breach (security/secret/spec unmet) | never ships, escalate to human |

*Enforced by `graph/verdict.js`. Amend deliberately — this defines completeness.*
