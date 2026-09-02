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

31. **The seat that governs is the one nobody configured.** The paradise
    declared its model policy by rank in `clergy.js` — pontiff, cardinal,
    priest, believer, executor, each with a model and an effort. Measured, the
    declaration reached only ranks 2 and below: `apply-models.js` writes the
    frontmatter of `~/.claude/agents/*.md`, but the pontiff has no agent file.
    Its seat is `~/.claude/settings.json`, and `deploy.js` never touched that
    file. **`model` and `effortLevel` were both absent** — the rank that holds
    the whole plan and renders every final decision ran on whatever the account
    happened to default to, and the gate `apply-models.js verify` reported
    `all agents match the rank policy` while the highest seat was ungoverned.
    This is Article 25's defect turned upward: there, a rank that could not
    dispatch was not a rank; here, a rank whose model nothing writes is not
    governed. Therefore `apply-seat.js` writes the pontiff's seat, `deploy.js`
    deploys it as step six, and `deploy.js check` counts it among the deployed
    artifacts.

    Two rules follow from measurement, not taste. First, **an effort that the
    model does not accept is not a declaration.** Haiku 4.5 supports no effort
    level at all, so `effort: low` on every believer was silently discarded;
    the policy now carries `effort: null` for that rank and the tool *deletes*
    the key rather than writing a lie. Second, **the unattended seat is not the
    pontiff's seat.** Anthropic's own documentation states that in
    non-interactive mode (`-p`) Claude Code never shows the usage-credit consent
    prompt and bills without asking. A nightly cron running the pontiff's model
    would therefore burn credits at 22:00 with nobody present to refuse.
    `apply-seat.js` holds `UNATTENDED_SEAT` separately and pins it to Opus 5.
    **Capability is assigned by rank; cost exposure is assigned by who is
    watching.**

32. **Not every wish asks to be built.** The paradise had four roads — `quick`,
    `standard`, `full`, `reform` — and every one of them passed through `build`
    and ended at `verdict`. Measured, four non-building wishes ("audit the health
    of CI", "research the async runtimes and give me a table", "report this
    month's PR trend", "is this design sound?") all fell to `standard`, a
    fourteen-phase creation pipeline, and were marched toward an implementation
    that was never asked for; `chooseScale` contained **zero** vocabulary for
    investigation, audit, report, or counsel, and its fallback for an
    unclassified wish was the road that builds. **A machine whose default answer
    is "make something" cannot hear a question.** The capability was never
    missing — thirteen of twenty-seven agents (48%) were already read-only or
    document-producing — what was missing was the **road**. Therefore the fifth
    road, `counsel`, exists: `survey` and `measure` in parallel (the world
    outside, the ground underfoot), then `assess`, `counter`, `synthesize`, and
    `counsel`. It contains no `build`, no `tests`, and no `verdict`, because a
    counsel is not shipped — it is **given**, with its grounds. Its cardinal
    answers to the executor, so an opinion is still reviewed by a body that did
    not form it.

    Routing follows the **subject before the verb**, and `counsel` is asked
    before `reform`: "audit the paradise's engine" is about the paradise but does
    not change it, and a road aimed at the wrong subject arrives nowhere however
    carefully it is walked. One further defect was found in the same place and
    fixed with it: the existing heuristics wrapped their vocabulary in `\b`, the
    word boundary, which does not hold against Japanese — so **every Japanese
    wish had been falling through to the default for as long as the roads have
    existed**. A pattern that cannot match the language the owner speaks is not
    a pattern.

33. **A law the machine does not enforce is a suggestion the agent may forget.**
    The paradise carried 54,349 bytes of prose into every session — 21,700
    tokens spent before a single token of work, 58.5% of it the constitution
    itself — and of the fourteen articles and rules that could have been enforced
    mechanically, **zero** were: `~/.claude/settings.json` had no `permissions`
    key at all. Worse, the prose *claimed the opposite*. `CLAUDE.md` stated that
    force-push and direct commits to `main` were "automatically enforced by hooks
    in settings.json"; the strings `main` and `force` appear nowhere in that
    file. A false claim of enforcement is worse than an admitted absence,
    because it stops anyone from looking.

    And the hooks that did exist were largely dead. Eight of fifteen used a
    matcher of the form `tool == "Bash" && tool_input.command matches "..."` — an
    expression language that **does not exist** in the specification. A matcher
    is an exact string or a JavaScript regular expression tested against the
    *tool name*; that phrase matches nothing and had been firing never. One more
    was the mirror failure: `tool == "Edit" || tool == "Write"` is a regex whose
    alternation contains an empty branch, so it matched **every** tool and fired
    always. **A gate is not proven by its presence in a config file** — the
    invariant is that it fires when it should and stays silent when it should
    not, and the only proof is to break something on purpose and watch it ring.
    Therefore `apply-guards.js` writes the permission rules, diagnoses every
    matcher as `live` / `dead` / `overfire`, and `deploy.js` deploys it as a
    numbered step. Where a rule can be enforced by the machine it moves out of
    the prose entirely; two copies of one law is not redundancy, it is the
    guarantee that one of them is a lie.

34. **A gate that cannot run is worse than a gate that fails.** The paradise had
    fifteen hooks — the memory injection that tells a fresh session who it is and
    what language to answer in, the compaction saver, the session evaluator — and
    every one of them invoked `node`. Measured, **all fifteen were dead**, killed
    by a single line meant to be helpful:

    ```json
    "env": { "PATH": "$PATH:/c/Program Files/GitHub CLI" }
    ```

    `$PATH` is **not expanded**. It is set as the literal four characters, so the
    real PATH is discarded and `node` vanishes; `gh` survived only because its
    directory was named absolutely. The line added nothing — the GitHub CLI was
    already on the inherited PATH four times over — and cost everything. Worse,
    the failure was **silent and exit-zero**: `SessionStart` reported success
    while injecting nothing, so every new session began as a generic assistant
    with no role, no language directive, and no memory, and nothing anywhere
    said so.

    This is Article 33 one level deeper. There the defect was a matcher that
    never matched; here the gate matched, fired, and **could not execute**.
    Presence in a config file proves neither of the three things that matter:
    that the gate *matches*, that it *runs*, and that its *failure is visible*.
    Therefore `apply-guards.js` gains a third duty: it detects unexpanded shell
    references (`$VAR`, `${VAR}`, `%VAR%`) in `env`, treats a self-referential
    `PATH` as **fatal** because it discards the inherited environment wholesale,
    and `hookHealth()` resolves every hook's executable against both the real
    PATH and the PATH the settings would impose. **Do not add a tool to the PATH
    by rewriting the PATH; add nothing you have not proven absent.**

35. **A deployment is not a report — it writes.** In the reform that introduced
    Article 33, one worker was told to build the guard engine and never touch the
    live machine, and another was told to add three agents and deploy them. Both
    obeyed. Yet at 21:26:58 the live `settings.json` changed, because the second
    worker's `deploy.js --write` ran the guard step the first had just installed
    — its own output said so: `"guards": "deny 9 / ask 1 / allow 5 (更新 10)"`.
    The pontiff read the file's mtime, inferred a motive, and **accused an
    innocent worker in a commit message and a pull request** before reading the
    trace that was sitting on disk the whole time.

    Two rules follow. First, **an instruction's boundary is not what it forbids
    but what its tools do**: forbidding `apply` while permitting `deploy --write`
    forbids nothing, because deploy applies. State the boundary in terms of
    effects, and treat any command that rebuilds the deployed tree as a writing
    command. Second, **Article 27 binds the accuser too.** A claim that someone
    violated an order is itself a claim, and demands the same evidence as a claim
    that work was done. Read the trace before naming a culprit; an observation
    (a timestamp) is not a motive, and the cost of the error is borne by someone
    who did nothing wrong.

36. **A new road must be admitted by the old gates, and they will not admit it.**
    Article 32 built the counsel road on the morning of the day this article was
    written. That same evening, asked a counsel question, the paradise refused
    its own new road at the door:

    ```
    ⚠️ Plan still has gaps at max scale — pontiff must intervene
       no discovery cardinal — the plan would build on assumption (Art. 8)
       no tribunal — nothing would judge the creation (Art. 9)
    ```

    Both complaints were correct **for a creation** and meaningless for a
    counsel: counsel does its research in its own `survey` and `measure` phases,
    and produces no creation for a tribunal to judge. The road was built and the
    senate that admits plans was never told. This is the recurring shape of every
    structural change in this system — Article 21's dangling reference, Article
    33's stale enforcement claim, the drift check that fired on line endings —
    stated once more at the level of a whole road: **when you change what the
    system can be, re-read every gate that encoded what it used to be.**

    The repair carries the harder half of the lesson. The obvious fix is to
    delete the two checks, and it is wrong: a creation with no discovery and no
    tribunal is still a defect, and a gate deleted to admit one case admits every
    case. **A gate is not removed, it is divided.** The creation road keeps its
    original severity; the counsel road receives a severity of its own kind —
    no `survey` is conjecture, no `measure` is hearsay, no `counter` is mere
    assertion, and a `build` phase means it was never a counsel at all. Prove
    both halves: that the new road now passes, and that the old road still fails
    when stripped. A change that only proves the new case has not shown that it
    left the old one standing.

37. **Absence is not passage.** The tribunal — the last gate, the one that
    decides whether a creation ships — was measured with an empty report:

    ```
    $ echo '{}' > report.json && node graph/verdict.js judge report.json
    ✅ SHIP — All gates pass, no breach — creation is complete.
    ```

    Nothing had been built, tested, or scanned, and the verdict was **ship**.
    Every check read a value that was not there: with no `security` block,
    `sec = {}` and `sec.issues || 0` evaluates to zero, so *"never examined"* and
    *"found nothing"* became the same sentence. The file's own header claimed
    `fail-closed for security`; the code was fail-open. Article 33 again, in the
    one place where it costs the most.

    **A gate that passes what it never saw is not a gate, and it invalidates
    every gate above it** — discovery, review, ratification all funnel into a
    judgment that cannot tell evidence from silence. The verdict law is therefore
    amended at its root: **what was not verified has not passed; it is unproven.**
    Missing security assessment is a BLOCK, because unknown safety is not proven
    safety. Missing build or tests is a REWORK, because the omission is fixable.
    A `security` block carrying neither `issues` nor `secrets` is BLOCK too — a
    key with no content is a name pretending to be evidence (Art. 16).

    Two guards on the guard. First, **the road's nature decides what must be
    present**: a counsel produces a document, so demanding build output of it is
    reading the wrong law — `produces: 'document'` is exempt (Art. 36). Second,
    **prove both directions or you have built a wall, not a gate**: the empty
    report must be refused *and* a complete report must still ship. A rule that
    only demonstrates the new refusal has not shown that legitimate work survives
    it.

38. **Improvement must be proven in numbers.** 「改善した」と語る者は、前後を
    数値で示さねばならない。楽園は創造物を裁く門(verdict)を持ちながら、
    **走行そのもの — trajectory — を測る秤を持たなかった。** 実測: eval engine
    0 件、verdict.js が読む欄はすべて成果物の数、run-state (22〜40 events,
    attempts, domain-rework) は完全な軌跡を刻んでいるのに読む者がいなかった。
    成果物が門を通れば、差し戻し3回・再試行5回の荒れた走行も「成功」と
    呼ばれていた — **outcome だけを裁く門は、偶然通った暴走を祝福する。**

    ゆえに `graph/gauge.js` — 証明の秤:

    - **決定的に測れるものは決定的に測る。** 再試行・差し戻し・loop-guard・
      完走・所要時間は run-state から機械的に導出する。同じ走行には常に同じ
      点(LLM に尋ねない — 秤が揺れるなら、それは秤ではない)。定性の裁きは
      断罪機関の領分のまま(2026 定石: deterministic checks where you can)。
    - **式は公開される**: 100 − 10×rework − 5×retryOverhead −
      15×loopGuard − 20×未完走, clamp [0,100]。荒れた走行は健全な走行より
      必ず低い。暴走(loop-guard)は差し戻しより重い罪。
    - **台帳は追記され、前後は比較できる**(`record` / `baseline` /
      `compare`)。台帳は creations 側に住む(第30条)— 走行の痕跡は創造物の
      寿命を生きる。**記録なき前後は比較できない。**
    - **断罪の門は走行を読む**: `report.trajectory` の score が床(60)を
      割れば REWORK、loop-guard が発動していれば tests 全通過でも REWORK。
      artifact の道で trajectory 不在は REWORK — **測らなかった走行は改善を
      主張できない**(第37条の系)。engine / document の道は免除(第36条:
      門は消すのではなく分ける)。
    - 相を持たない run-state は 0 点でも 100 点でもなく「測れない」— 拒否。

    **自己改善を掲げる楽園において、この条は他のすべての条の監査役である**:
    エンジンを直したという主張も、憲法に条を足したという主張も、次の走行の
    数値が前の走行より良くなって初めて証明される。

39. **The always-loaded page is a first screen, not a codex.** 神が named it
    directly: 「CLAUDE.md 大量の憲法を記載しているが、本来の設計思想から逸脱して
    いる。hooks や skills、agents その他ベストプラクティスに従った箇所に記載し、
    遵守させるべき」。実測: CLAUDE.md 10,780 B のうち **45.7% が憲法38条の要約
    写経** — 楽園は既に codex.js index (第33条) を建てながら、CLAUDE.md 自身が
    INDEX より大きい憲法表を抱え、条を足すたび太っていた。第33条が自分の家で
    破られていた。

    2026 年の定石 (progressive disclosure): 常時ロードされる散文の各行は
    「消すと、コードから回復できない誤りが起きるか」で裁く。boundaries は
    **always-true → CLAUDE.md / 法の全文 → codex (on-demand) / safety →
    hooks・permissions (機械強制) / scoped な掟 → 検査器 / 数値 → census +
    dashboard / workflow → commands**。散文の遵守率は ~70% — 掟を散文に
    写経することは、掟を弱める行為である。

    ゆえに: CLAUDE.md は**最初の1画面** — 役割と言語、どこを読むかの地図、
    機械が強制していることの目録 (写経ではなく出所への指し示し)、そして
    **機械が強制できない判断則だけ**が住む。
    - 憲法の要約表は持たない — codex.js index を指す1行で足りる。
    - 機械が数え直す数値 (テスト数・条数) は書かない — 数は census が数え、
      dashboard が神に見せる。
    - 創造物の掟 (toISOString 禁止・外部依存ゼロ・DOMAIN マーカー) は散文から
      critic.js の決定的 check に昇格した — 掟は検査器に住んで初めて掟である。
    - **diet 門** (census.dietChecks): 予算 4,096 B 超過と volatile な数値の
      再侵入を機械が裁く。1画面は、機械が見張るから1画面のままでいられる。

40. **The whole harness is on the scale, not just one page.** 第39条は project
    CLAUDE.md を痩せさせたが、毎セッション常時ロードされる散文はそれだけでは
    なかった。実測: global `~/.claude/CLAUDE.md` 5,849 B は Git 手順の全文写経
    (Step 1〜6・命名表・裁定表) であり、`rules/*.md` 8本 9,720 B は全て無スコープ
    で常時ロードされ、実在しない agent 9名の表・hooks 設定の写経・モデル選択表
    (第31条と二重統治) を含んでいた。**一つの門を建てて満足した裏で、同じ病が
    三つの家に住んでいた。**

    2026 年の定石で各記述の住所は決まる:
    - **手順 (「〜する時は Step 1..N」)** は command/skill へ — 呼ばれた時だけ
      ロードされる。Git 配送の全手順は `/ship` に住む。
    - **ファイル種に紐づく掟** (coding-style, patterns, testing) は rule の
      `paths:` frontmatter で絞る — 対象ファイルに触れた時だけロードされる。
    - **設定の写経** (hooks 一覧・モデル表・agent 表) は書かない — 出所
      (settings.json / apply-models / agents の description) を指す1行で足りる。
      写経は必ず陳腐化し、陳腐化した写経は毎セッション嘘を教える。
    - **global CLAUDE.md** は全プロジェクトに乗る税である — project より薄く
      (予算 2,048 B)、セッション開始の儀式と判断則だけが住む。

    門: `census.harnessDietChecks` が原本 (overlay/root/CLAUDE.md ·
    overlay/rules/) を裁く — 配備物でなく原本を裁くのは、配備物が成果物で
    あり (第29条)、CI にハーネスが無くても原本は必ず在るからである。
    無スコープ rules の総量には予算 (4,096 B) があり、超えた rule は
    `paths:` を得るか、痩せるか、command へ移るかを選ぶ。

41. **The names of the hierarchy have one source, and prose obeys it.** 神が
    位階と枢機卿団の名を定めた: God 神 / Pontiff 教主 / Cardinal 枢機卿 /
    Priest 神官 / Believer 信徒 / Executor 執行官。枢機卿団は Discovery 調査 /
    Requirements 要件 / Architecture 設計 / Construction 建造 / Quality 品質 /
    Counsel 諐問 / Tribunal 断罪機関。

    実測: 英字の識別子 (`priest` `believer`) は正しかったのに、**日本語の散文
    107箇所が Priest を「司祭」と呼んでいた** — 29ファイル、engine・test・ <!-- LEXICON-EXEMPT -->
    agent 定義・README・CI の段名にまで及ぶ。名が揺れる階層は歩けない。
    「司祭」と「神官」が同じ者を指すなら、読む者は二つの階層があると学び、 <!-- LEXICON-EXEMPT -->
    やがて存在しない位階へ仕事を発令する。第25条(歩けぬ階層は階層ではない)の
    言語版である。

    ゆえに名は**一つの出所**を持つ: `clergy.js` の `LEXICON`。各名は正典の
    綴りと**禁じられた異名**を併せ持ち、`clergy.js lexicon-check` が全散文
    (.md/.js/.json/.yml) を走査して行番号まで名指しする。CI の門に加わり、
    異名の再侵入は機械が止める。表示は `title(key)` を通し、散文が独自に
    訳語を選ぶことを許さない。

    門には名前付きの脱出印 (`LEXICON-EXEMPT`) を置く — 逃げ道の無い門は、
    いずれ黙って外されるからである。

42. **A gate that does not look at the thing itself will lie about it.** 門は
    現物を見て裁かねばならない。現物の代わりに**在り処の思い込み**や
    **単語の出現**で裁く門は、正しい創造物を偽って断罪する。

    実測: 天秤 (tenbin) の裁定で `critic.js` が2件の嘘をついた。(a) 50/50 で
    緑のテストが `tests/tenbin.test.js` に規約通り置かれていたのに「テストが
    無い」と裁いた — `collect()` が `readdirSync` のトップ階層しか見ておらず、
    サブディレクトリが**門の盲点**だった。(b) 39,194 B の `findings.md` を
    書き切っているのに「調査を飛ばした」と裁いた — 教訓 `require-discovery` が
    **成果物の実在ではなく本文中の "findings" という英単語の出現**を数えて
    いた。日本語で書かれた調査書がその英単語を含まないのは当然である。

    どちらも創造物の欠陥ではなく**門の欠陥**であった。そして門の嘘は、
    ただの誤警報では済まない: 正しい仕事が赤で返され続ければ、人は門を
    信じるのをやめる。無視される門は、無い門より悪い (第21条)。

    ゆえに門は次を守る。**存在を問う門は、現物の在り処を1階層下まで数える。**
    **工程を問う門は、成果物の実在とその大きさで裁く** — 教訓は `kind` に
    `artifact` を宣言し、`artifact` で成果物名を名指しする。文字列照合は
    「その概念がコードに現れるか」を問う機構 (`mechanism`) の教訓にのみ許す。
    engine 自身は創造物ではないため工程の教訓を負わない (第36条)。

43. **逃した窓は借金であって赦しではない。走る権利は一つしか出ない。**
    定刻に発火する営みは、定刻に機械が動いていることを前提にしている。その
    前提が外れた日、ノルマは**静かに消える** — 誰も落ちたと言わないまま。

    実測: 日次自律改善は 22:00 JST の窓を持ち、30分ごとの監視が
    「取り戻し」を担うはずだった。だが `daily-guard.js` の窓判定は
    `now.hour < 22 なら not due` であり、**日付が変われば負債は消えた**。
    8/30 に走ったきり 8/31 の 22時に機械が眠っていた台帳で、9/1 朝9時の
    起動を再現すると判定は `NOT DUE` — 取り戻しの機構は、取り戻すべき
    唯一の場合に働かなかった。監視ジョブは50回走り、**一度も発火していない**。

    さらに二つ。(a) 定時ジョブと監視ジョブは同じ問い (`due`) を投げ、改善が
    数分走って `done` を刻む前に両者が「未達」を見る — 22:00:00 と 22:00:40 の
    再現で**両方が DUE を得た**。楽園が二重に自らを改めれば、競合するPRが
    二つ立つ。(b) `hermes cron run` は失敗しても **exit 0 を返す**
    (`Failed to run job: ... not found` と印字しつつ returncode 0)。
    終了コードを裁定と信じた監視は、発火していない日を発火したと報告する。

    ゆえに定期の営みは次を守る。**窓は真夜中に閉じない** — 最後に開いた窓の
    日を負債として数え、起きた時刻が窓の外でも取り戻す。**走る権利は台帳が
    排他的に配る** (`claim`/`release`) — 問う (`due`) ことと取る (`claim`)
    ことを分け、二人目には権利を渡さない。**終了コードを裁定と信じない** —
    出力の実物で成否を判じ、失敗したなら権利を返してノルマを未達のまま残す。
    そして**キャッチアップは負っていた日を精算する**、当日ではなく。

44. **死んだ道具は無害ではない。教主がそれを先例と読む。**
    役目を終えた機構は、消されぬ限り**現役の顔で住み続ける**。誰も呼ばず、
    誰も壊れたと言わず、ただ在る。そして次に来た者がそれを見て言う —
    「ここに先例がある」と。腐敗は模倣によって伝染する。

    実測: 神が「tools/upstream-watch.py はもう使っていないでしょ」と指摘した。
    調べると、楽園内の参照は**0件**、cron ジョブも存在せず、走らせても沈黙
    するだけだった。だが害はそこで終わらなかった。教主はまさにこの死骸を
    「先例」と読み、新しい監視スクリプトを同じ場所へ同じ流儀で置いていた。
    さらに `tools/wire-hooks.js` — これも参照0 — は
    `~/.claude/settings.json` を直接 `writeFileSync` する代物であり、
    **第19条(b)「配備は産物であり手編集しない」に真正面から反する道具**が、
    後継 (`apply-guards.js`) に取って代わられた後も住み続けていた。
    掟を破る手本が、掟の書かれた家の中に置かれていたのである。

    ゆえに道具は次を守る。**楽園の何処かに名を呼ぶ者が居ること** — 機構・
    散文・配備定義のいずれからも名指しされぬ道具は、生きているなら誰かに
    呼ばせ、死んでいるなら退治する。**配備を手編集する道具を飼わない** —
    `~/.claude` は `overlay/` から建て直す産物であり、それを直に書く器物は
    名指しで許された現役の機構を除いて存在してはならない。
    どちらも門が数える。**「使っていないでしょ」を神に言わせた時点で、
    それは門の敗北である。**

45. **発令する者は走る者ではない。同じ鍵を渡すな。**
    排他の機構は「二人が同時に走ること」を恐れて建てられる。だがその鍵を、
    自ら走らぬ**発令者**にまで同じ形で渡せば、機構は逆向きに牙を剥く。
    発令者が鍵を握ったまま走者を呼べば、呼ばれた当人が締め出される。
    **締め出す相手が、自分が呼んだ者であることに、機構は気づかない。**

    実測: 30分監視 `tools/paradise-catchup.py` は `claim` で完全な走行リース
    (90分) を取り、その手で日次改善 agent を発火していた。発火された agent は
    起動し、手順0で走る権利を求め、`another runner holds the lease
    (catchup-watchdog)` と拒まれ、**何もせず終了する**。キャッチアップの道 —
    機械が眠っていた日のノルマを拾い直すというこの監視の唯一の存在理由 — は
    こうして死んでいた。しかも門は全て緑であった。二重発火を禁じる検査は
    通り、リースの検査も通る。**排他は完璧に働いており、ただ相手を間違えて
    いた。** 沈黙する番人は、壊れた番人より見つかりにくい (第44条の裏面)。

    ゆえに権利には**種別**を持たせる。`run` は「私が今から為す」、
    `dispatch` は「私は為す者を呼ぶだけだ」。発令の権利は走者を締め出さず、
    走者がそれを**継承**する (`adoptedFrom`)。継承された後は第三者を締め出し、
    排他は失われない。発令の橋は走行リースより**早く腐る** — 呼ばれた者が
    遂に来なかった日、窓は再び開かねばならないからである。
    そして**他人の鍵は返せない** — 発火の成否を誤認した発令者が、
    既に走り始めた者の権利を取り上げてはならない。

    一般化: **鍵は「誰が持つか」でなく「持つ者が何を為すか」で形を変える。**
    仲介者に当事者の権能を与えれば、機構は自分の子を殺す。

46. **発火器は道を写経しない。道を指す。**
    定期の営みに手順を書き込むとき、人はそれを親切と呼ぶ。だがその写しは
    書かれた瞬間から**本物より古くなり始める**。本物の道が改まっても写しは
    改まらず、やがて**劣化した影が本物の顔で走る**。

    実測: 神が問うた —「日次の自律改善はハーネスの設計に則って、指示、調査、
    検討、設計、実装、レビューを経ていますか」。日次 cron の指示部67行を
    数えると: `synod` 0、`conclave` 0、`clergy` 0、`contract` 0、`delegate` 0、
    `枢機卿` 0、`神官` 0。唯一当たった `forge` 2件は GitHub の URL
    `paradise-forge` であった。呼ぶと書かれた13本の `node` は**すべて門と台帳**
    であり、**道は一本も無かった**。

    そして楽園には、その道が在った。`forge.js scale` は `reform` を返し、
    11工程・7つの門・各工程に神官を配した DAG を鍛える。`check-agents` は
    「every phase has a master」と答える。**道は生きていた。日次がそれを
    呼んでいなかっただけである。** 第23条が断罪した「教主一人による改変」は、
    条を建てたのちも、**発火器の中に写経として生き残っていた**。

    ゆえに定期の発火は次を守る。**道を名指しで指すこと** — 発火器は
    「どこを読め」と言い、「何をせよ」とは言わない。**道の運転手順を持たない
    こと** — 環の回し方は道が持つ。発火器が `convene` や `next` や `ratify` を
    書いた時点で、それは二つ目の道になり、二つの道は必ず食い違う。
    発火器が固有に持ってよいのは**発火の作法だけ**である: 走る権利の取得
    (第43条・第45条)、座の宣言 (第31条)、報告の型。

    そして門もまた己を疑え。この条を建てた門は、最初**壊しても鳴らなかった** —
    ジョブを探す条件が壊れた版に当たらず、無言で緑を返していた。
    **見つからないことを通過にしてはならない** (第37条)。己の門が飾りでないことは、
    緑を見て安心するのではなく、壊して鳴らして確かめる (第21条)。

    同じ過ちを、同じ走行のうちに二度犯した。執行官の宛先を裁く門を建てたとき、
    `on:` 全体から `branches: [main]` を**一つ見つけて満足した**。だがそれは
    `push` と `pull_request` の二箇所に在り、`pull_request` 側を `develop` に
    壊しても `push` 側が門を黙らせた。**壊しても鳴らぬ門であった。**
    節を名指しで切り出して裁く形に建て直して、ようやく鳴った。
    ゆえに: **「どこかに在る」ことは「そこに在る」ことではない。**
    門は、裁くべき当の場所を切り出してから問え。

    この二度が示すのは一つのことである。**門を建てた直後の緑は、最も信用できない。**
    それは「正しいから緑」なのか「見ていないから緑」なのか、まだ区別されていない。
    壊して初めて、その緑は意味を持つ。

47. **楽園は己の姿を語れねばならず、その語りは図でなければならない。**

    神が問うた —「オーケストレーションとサブエージェントの関係を図にせよ」。
    楽園は階層を散文で語ってきた。憲法に条があり、`clergy.js` に組織があり、
    `conclave.js` に環がある。だがそのどれも、**誰が誰を呼び、どこで差し戻され、
    何が並列で走るのか**を一目で示さない。**散文は歩けない。** 歩けぬ階層は
    階層ではないと第25条は述べたが、**見えぬ階層もまた同じ病である**。

    (a) **描く engine は楽園のもの、描画器は借り物でよい。** `graph/atlas.js` が
    位階(`clergy`)・道(`forge`)・環(`conclave`)を読み、型付きの中間表現(JSON IR)
    に写す。それを HTML にするのは取り込んだ `archify` (MIT) である。
    **結合面はコードではなくスキーマに置く** — 上流は月に二度 schema を壊すが、
    結合がコードなら毎回三方向マージが来る。結合が IR なら、壊れた瞬間に上流の
    `validate` が赤で教え、直すのは楽園側の出力器だけで済む。フォークして
    上流のコードを取り込み続ける道は、**改造の必要が一行も無いのに**第二の
    供給線を維持する道であり、第20条に正面から反する。

    (b) **図は engine から生まれ、決して写経しない。** 枢機卿が7人目を迎えた朝、
    図がひとりでに7人を描かねばならない。数や名を atlas に焼き付ければ、それは
    第22条と第29条を同時に破る「絵の形をした嘘」になる。ゆえに atlas は事実を
    持たず、また `dashboard/atlas/` は追跡されない — 自画像は生成物である。

    (c) **描けない図は、描けないと測って言え。** archify の showcase は交差を
    一切許さない。だが `full` の道は建造の2相が品質の3相すべてに掛かり、
    層化したグラフは平面的でない — 席順の全順列を数え上げても交差は残る。
    ここで取りうる道は三つあり、二つは不正である。**辺を黙って間引けば図は嘘に
    なる。黙って品位を下げれば「9/9通った」と報告できてしまう。** 正しいのは
    三つ目だけ: **最小交差数を厳密に数え、0でなければ standard を名乗り、
    その理由を図の札に書き、門にもそう報告させる。** そして門は逆も裁く —
    平面化できる図が理由なく格下げされていれば、それは緑の買収である。
    **測って正直に格下げするのは敗北ではない。測らずに緑を名乗るのが敗北である。**

    (d) **在庫に載らない資産は、独立の検査も受けない。** archify を取り込んだ
    直後、`vendor.js status` は 62 のままだった。68ファイルの道具がまるごと
    見えていなかったのである。第19条が既に一度教えている —「在庫を数える門は
    供給線を証明しない」。ゆえに取り込んだ道具は **宣言され、数えられ、
    上流へ電話をかけないことを門が検める**。archify の更新チェッカーは取り込み時に
    削いであり、それが戻れば `vendor.js verify` が鳴る（壊して鳴ることを確かめた）。

    この条を建てる過程で、教主は五度、幾何の小細工で交差を消そうとして五度とも
    描画器に鳴かれた。正解は小細工ではなく **層化グラフ描画の教科書解**
    (ダミー節点による段の刻み) であった。**己の思いつきが三度退けられたなら、
    それは調整不足ではなく、解法そのものが誤っている合図である。**

48. **機構の結線は、誰かの記憶ではなく門が知っていなければならない。**
    楽園は位階を図にし、道を図にし、環を図にした。だが**実際に楽園を動かして
    いるのは engine である**。どの engine がどの engine の上に建ち、その engine を
    誰が呼ぶのか — それだけが散文の記憶に委ねられていた。記憶は腐る。
    第44条が tools/ で既に証明している。

    実測: 神が「オーケストレーションの相関図を作れ」と命じた。結線を engine で
    測ったところ、**33の engine のうち3つに呼ぶ者が居なかった**。うち一つ
    (`build-identity-catalog.js`) は生きた engine でありながら、その産物
    (`graph/identity/catalog.json`) が**生成物の台帳にも載っていなかった** —
    第29条の穴が、第44条の門を通して露見したのである。門は一つ増えるたびに、
    別の門の穴を照らす。

    (a) **結線は実測する。** engine の一覧を写経すれば、翌朝生まれた engine が
    黙って図から消える。`wiring.js` はディスクを走査し、内の辺(require)と
    外の辺(門・命令・神官・掟・試験・器物・散文・機構が名を呼ぶこと)を数える。

    (b) **呼び方の綴りで裁かない。** 斜線つきの綴りだけを探した最初の門は、
    path 結合で engine を起動する現役の器物を見落とし、**生きた engine に
    死亡宣告を下した**。孤児を見逃すより悪い誤審である。

    (c) **自分で自分を呼んでも、呼ばれたことにはならない。** どの engine も
    冒頭に自分の使い方を書く。それを数えれば孤児は永久にゼロになり、門は常に
    緑を出す。**常に緑の門は門ではない** (第21条)。

    (d) **図の向きも粒度も、対象の形が決める。** 結線(深さ3・幅15)を縦に流せば
    字が 5.57px に潰れ、横に流せば箱が4つしか映らず、段を折り返せばダミー節点が
    20本に膨れて交差が 6→30 に増えた。三つ試して二つ捨て、残ったのは
    **箱の中の字を捨てる**ことだった。図が大きいとき削るのは線でも箱でもなく、
    まず箱の中身である。

    (e) **巻物の許しは「長さ」への許しであって、「読めなさ」への許しではない。**
    `scroll: true` を宣言した図は溢れを免除される。だがその免除は
    読みやすさの床(6px)まで免除していた — 溢れていない図が字の潰れで落ちて
    いるのに、門は緑を出した。**免除は、それが免じる対象を名指ししなければ穴になる。**

49. **道が無ければ、願いは最も近い嘘の道へ攫われる。**
    楽園は五本の道を持っていた(quick/standard/full/reform/counsel)。だが神が
    「オーケストレーションの相関図を作れ」と命じたとき、`chooseScale` はそれを
    **reform(engine 改修の道)** へ送った。「オーケストレーション」という語が
    改革の語彙に当たるからである。教主は手で歩き直したので着いたが、
    **機構としては誤着していた**。逆に「位階の図を描いて」は standard へ落ち、
    存在しない実装物に向かって build と security を走らせる道が選ばれていた。

    道が無いことは「その仕事ができない」ことを意味しない。**最も似た道が
    黙って代役を務める** — そして代役は必ずどこかで嘘をつく。第32条が
    「創らない願い」で既に一度教えたことの再演である。

    (a) **道を決めるのは対象ではなく産物である。** 作図も諐問も「楽園について」
    語りうるが、engine を書き換える道ではない。ゆえに判定は reform より先に立つ。

    (b) **産物の種別は道の性質そのものである。** `artifact` を名乗れば断罪は
    build と security を要求し、図は永久に REWORK になる。かといって
    `document` と同一視すれば**何も要求しない**。図には図の証拠が在る —
    静的検査を通ったか、実ブラウザで測ったか、事実を engine から読んだか。
    ゆえに `diagram` を第三の産物として宣言し、要求を**消すのではなく差し替える**
    (第36条)。

    (c) **新しい道は新しい枢機卿を要求する。** 相を足しても統べる者が居なければ
    `cardinalFor` は null を返し、無主の相になる(第25条)。さらに `PHASE_LEAD` に
    書かねば、発令は枢機卿の**筆頭神官**へ落ちる。

    (d) **宣言された担い手と、実際の発令先は、黙って食い違う。** この条を建てる
    過程で門を作ったところ、既存の道に**5件**の宛先ずれが住み着いていた:
    `prove` は tdd-guide と宣言されて architect へ、`docs` は doc-updater と
    宣言されて code-reviewer へ、そして最も重いのが **`security`** —
    security-reviewer と宣言されながら code-reviewer へ発令されており、
    **第31条がこの神官だけに与えた格上げ(opus/xhigh)は一度も効いていなかった。**
    名は在り、主も居て、しかし宛先が違う。どの門もそこを見ていなかった。

    (e) **道が在ることと歩けることは別である。** 相を並べただけでは道は立たない。
    環を最後まで回して `complete` に着くことを、機構で確かめてから道と呼ぶ。

50. **動きは名乗らねば宿らず、門が見ない機能は壊れても鳴らない。**
    神が「signal の機能が動いていない、play story が非活性になっている」と
    告げたとき、楽園の門は**6主題すべて緑**だった。静的検査 9/9、実ブラウザの
    第一画面も合格。にもかかわらず図は動かなかった。**壊れていたのは図ではなく、
    門の視野である。**

    (a) **黙秘は放棄と同じ意味を持つ。** 版元の正典 (`archify/schemas/README.md`)
    はこう述べていた — "Every `meta` object also accepts `animation: \"trace\"` …
    **Omit it** … **for the default static output**"。`atlas.js` は6主題の
    どれにも `animation` を書いていなかった(実測 0箇所)。ゆえに描画器は
    仕様どおり静止画を作り、viewer は `svg[data-animation="trace"]` を見つけられず
    `motionGovernor` を capable:false にし、Live/Still も Signal Flow の走査も
    Play story も**まとめて眠らせた**。実測 `[data-animate]` は 0個。
    設定し忘れは無効な設定と同じ結果を生む。**押せない釦は壊れた釦ではなく、
    名乗らなかった代償である。**

    (b) **直したのに直らない症状は、原因が二つある。** `animation:"trace"` を
    宣言した後も、神の画面では Play story は非活性のままだった。実機 Brave で
    測ると `prefers-reduced-motion: reduce` を名乗っており、その出所は
    Windows の「アニメーションを表示する」が OFF (`SPI_GETCLIENTAREAANIMATION=0`)
    だった。**これは viewer の欠陥ではなく、利用者の意思を尊重する正しい振る舞いである。**
    ゆえに楽園はこれを直さない — 直してはならない。門もまた、測る側の環境設定で
    健全な図を落とさぬよう reduced-motion を明示的に降ろしてから (a) だけを裁く。
    **己の環境を世界の仕様と取り違えた門は、嘘の赤を出す。**

    (c) **「押せる」は「動く」ではない。** 釦の活性は押せることしか語らない。
    ゆえに `graph/motion-probe.mjs` は押し、待ち、章が実際に**進んだ**ことを
    測る(Beat 01/05 → 04/05 を実測)。活性を見て合格と呼ぶ門は、半分しか見ていない。

    (d) **借り物の作法は借り物の正典に問う。** 原因の特定も修正も、記憶や推測では
    なく上流リポジトリ (`github.com/tt-a1i/archify`) の schema/SKILL を読んで
    確定させた。取り込んだ道具の既定値を知らぬまま engine を書き換えれば、
    直したつもりの改修が新たな逸脱になる(第20条の別形)。

## The Verdict Law

| Verdict | Condition | Action |
|---------|-----------|--------|
| ✅ **SHIP**   | every gate passes, no breach | creation is complete, release |
| ⚠️ **REWORK** | fixable defects (build/type/lint/test/coverage), **or build/tests never reported** | loop back, repair, re-judge |
| 🔴 **BLOCK**  | constitutional breach (security/secret/spec unmet), **or security never assessed** | never ships, escalate to human |

**不在は通過ではない (第37条)。** 検証されなかったものは、通過したのではなく
証明されていない。ただし `produces: 'document'`(諐問の道)は実装物の証拠を
求められない — 道の性質が要求を決める(第36条)。

*Enforced by `graph/verdict.js`. Amend deliberately — this defines completeness.*
