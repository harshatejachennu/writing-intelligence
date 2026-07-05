/**
 * Maria salt-essay fixture — a realistic college-essay test case used to
 * calibrate the Analyzer (no absolute praise) and the Technique Extractor
 * (3 core / 3 secondary / 2 failure-mode, multi-genre cards).
 * Slugs are test-prefixed (maria_test_) so suite cleanup can never collide
 * with real library data.
 */

import type { ExtractionCard } from "@/lib/schemas/technique-card";

export const mariaPassage = [
  "My grandmother Maria measured nothing. Salt fell from her fingers in",
  "pinches I could never count, and the soup was never twice the same, and it",
  "was always right. When she died in March, my mother found forty-one jars of",
  "salt in her pantry — sea salt, black salt, salt from a town in Portugal none",
  "of us could pronounce. I took one jar back to my dorm. I have never opened",
  "it. But on the nights before organic chemistry exams, I hold it, and I",
  "remember that precision is not the same thing as care.",
].join(" ");

/** Analyzer-style output for the passage — calibrated, no absolute praise. */
export const mariaAnalysis = {
  macro_structure:
    "Object-anchored memoir compression: ritual (salt) → loss (death, jars) → transformed meaning (unopened jar as talisman) → stated insight.",
  paragraph_functions: [
    {
      index: 0,
      function: "establish character through ritual, then convert an object into an argument",
      evidence: "Salt fell from her fingers in pinches I could never count",
    },
  ],
  sentence_functions: [
    { quote: "My grandmother Maria measured nothing.", function: "flat declarative opening that doubles as thesis" },
    { quote: "forty-one jars of salt", function: "specific inventory detail carrying grief without naming it" },
    { quote: "I have never opened it.", function: "short sentence as pivot from narrative to meaning" },
  ],
  rhetorical_devices: [
    { device: "synecdoche", example: "one jar back to my dorm", effect: "the jar stands in for the grandmother" },
    { device: "antithesis", example: "precision is not the same thing as care", effect: "names the essay's tension in one clause" },
  ],
  syntax_patterns: "long accumulating clauses cut by short declaratives at turns",
  pacing: "compressed; a decade of relationship in three beats",
  transitions: "temporal jumps carried by objects rather than connectives",
  voice: "restrained first person, more inventory than confession",
  tone: "elegiac but dry-eyed; the essay withholds overt grief",
  diction: "concrete and domestic (jars, pantry, soup) against one abstract closing pair (precision/care)",
  imagery: "salt as recurring physical anchor",
  symbolism: "the unopened jar: preserved relationship, unresolved grief",
  motifs: ["salt", "measurement", "counting"],
  emotional_progression: [
    { stage: "ritual warmth", reader_feels: "affection" },
    { stage: "inventory after death", reader_feels: "grief at an angle" },
    { stage: "unopened jar", reader_feels: "recognition" },
  ],
  reader_effect:
    "quiet emotional accumulation; the reader assembles the grief themselves from objects. The closing aphorism lands but flirts with over-neatness.",
  genre_expectations: "personal essay / college application essay; meets the reflect-on-experience expectation without a stated lesson until the last clause",
  clarity: "high; every image is literal before it is symbolic",
  compression: "high — one paragraph covers ritual, death, inheritance, and thesis. The 'town in Portugal' clause is the one ornament that adds texture but no load",
  tension: "understated; withheld grief substitutes for plot tension",
  persuasiveness: "the insight is earned by objects rather than asserted, though the final antithesis states what the jars had already implied",
  memorability: "the forty-one jars and the unopened jar are the sticky images; the closing line is quotable but more conventional than the inventory that precedes it",
  transferable_techniques: [
    { name: "object_as_emotional_ledger", plain_name: "let an object carry the feeling", transfer_rule: "attach the emotion to a concrete object and let its handling tell the story" },
    { name: "precise_number_for_grief", plain_name: "count something instead of crying", transfer_rule: "replace emotional adjectives with one exact, unexpected count" },
    { name: "aphorism_close", plain_name: "end on a compressed abstraction", transfer_rule: "earn a closing abstraction with concrete evidence first" },
  ],
  imitation_warnings: [
    "Copying the salt/jar imagery into another essay is plagiarism of the specific, not use of the technique.",
    "The withheld-grief register only works if the writer actually has restraint to withhold; forcing it reads as coldness.",
  ],
};

/** Full 3-core / 3-secondary / 2-failure-mode extraction with calibration fields. */
export const mariaExtraction: { cards: ExtractionCard[] } = {
  cards: [
    // ── 3 CORE ────────────────────────────────────────────────────────────────
    {
      technique_name: "maria_test_object_as_emotional_ledger",
      plain_name: "Let a concrete object carry the emotional history",
      function: "Stores feeling in a physical object so the reader infers emotion from how the object is handled",
      reader_effect: ["quiet emotion", "trust"],
      genre_fit: ["personal_essay", "eulogy", "narrative_nonfiction", "product_storytelling"],
      when_to_use: "When stating the emotion outright would flatten it",
      when_not_to_use: "Instructions or analysis where the object would be decoration",
      transfer_rule: "Pick one object the subject actually touched; let its handling, counting, or absence do the emotional work",
      bad_use_warning: "An object chosen for symbolism rather than truth reads as a prop",
      genre_adaptations: [
        { genre: "speech", guidance: "Hold or reference the physical object; one object, not three" },
        { genre: "technical_writing", guidance: "The 'object' can be an artifact — a log file, a pager — grounding a postmortem's human stakes" },
      ],
      revision_instruction: "Replace the most abstract emotional sentence with a concrete action performed on one object",
      evaluation_criteria: ["The emotion is never named but a reader can name it"],
      card_role: "core",
      specificity_level: "subtle",
      transfer_difficulty: "medium",
      best_for_tasks: ["memoir openings", "eulogies", "about-pages that need warmth", "postmortem introductions"],
    },
    {
      technique_name: "maria_test_precise_count_for_feeling",
      plain_name: "Use one exact number where emotion is expected",
      function: "An unexpected precise count (forty-one jars) carries weight that adjectives cannot",
      reader_effect: ["credibility", "grief at an angle"],
      genre_fit: ["personal_essay", "journalism", "speech", "grant_proposal"],
      when_to_use: "Replacing 'so many' or 'countless' anywhere feeling risks vagueness",
      when_not_to_use: "When the number is invented — a fake count poisons the whole piece",
      transfer_rule: "Find the one real, countable detail and state its exact number without comment",
      bad_use_warning: "Stacking several counts turns testimony into inventory",
      genre_adaptations: [
        { genre: "grant_proposal", guidance: "One human-scale count beside the big statistics" },
        { genre: "technical_writing", guidance: "The precise metric that made the incident real to the team" },
      ],
      revision_instruction: "Replace one vague quantifier with the real, exact count",
      evaluation_criteria: ["The number is real and un-commented", "No more than two counts in the piece"],
      card_role: "core",
      specificity_level: "obvious",
      transfer_difficulty: "low",
      best_for_tasks: ["impact statements", "openings of data stories", "personal essays about loss"],
    },
    {
      technique_name: "maria_test_short_sentence_pivot",
      plain_name: "Pivot on a short flat sentence",
      function: "A clipped declarative after longer sentences marks the turn from narrative to meaning",
      reader_effect: ["attention reset", "weight"],
      genre_fit: ["personal_essay", "speech", "fiction", "blog_post"],
      when_to_use: "At the single most important turn of the piece",
      when_not_to_use: "More than twice per page — repetition kills the effect",
      transfer_rule: "Write the turn as the shortest true sentence you can, after your longest sentence",
      bad_use_warning: "Overuse produces melodramatic staccato",
      genre_adaptations: [
        { genre: "technical_writing", guidance: "One-line paragraph for the key finding: 'The backup had never run.'" },
        { genre: "speech", guidance: "Pair with a deliberate pause" },
      ],
      revision_instruction: "Find the pivot sentence; cut it to under eight words; place it after the longest sentence",
      evaluation_criteria: ["Read aloud, the room would go quiet at the pivot"],
      card_role: "core",
      specificity_level: "obvious",
      transfer_difficulty: "low",
      best_for_tasks: ["talk climaxes", "essay turns", "incident report key findings"],
    },
    // ── 3 SECONDARY ───────────────────────────────────────────────────────────
    {
      technique_name: "maria_test_ritual_before_person",
      plain_name: "Introduce a person through their ritual",
      function: "Characterizes by repeated action rather than description",
      reader_effect: ["intimacy", "specificity"],
      genre_fit: ["memoir", "profile_journalism", "fiction", "team_bios"],
      when_to_use: "Introducing anyone the reader must care about quickly",
      when_not_to_use: "When the ritual is generic (drinking coffee) — it must be theirs alone",
      transfer_rule: "Open on the one repeated action that only this person does this way",
      bad_use_warning: "A borrowed or invented ritual reads as stock character",
      genre_adaptations: [
        { genre: "profile_journalism", guidance: "The subject's habitual gesture in the lede" },
      ],
      revision_instruction: "Replace the person's introductory description with one habitual action",
      evaluation_criteria: ["The ritual could not be swapped onto another person"],
      card_role: "secondary",
      specificity_level: "subtle",
      transfer_difficulty: "medium",
      best_for_tasks: ["profile ledes", "character introductions", "wedding toasts"],
    },
    {
      technique_name: "maria_test_earned_aphorism_close",
      plain_name: "End on an abstraction the objects already proved",
      function: "A closing aphorism lands because the concrete evidence preceded it",
      reader_effect: ["closure", "quotability"],
      genre_fit: ["personal_essay", "speech", "op_ed", "commencement_address"],
      when_to_use: "When the piece has accumulated concrete evidence for the claim",
      when_not_to_use: "As a substitute for evidence — an unearned aphorism is a fortune cookie",
      transfer_rule: "State the abstraction only after at least two concrete moments have implied it",
      bad_use_warning: "The essay's own risk: the neat close can undercut the restraint that preceded it",
      genre_adaptations: [
        { genre: "op_ed", guidance: "The last line restates the argument in under ten words" },
      ],
      revision_instruction: "If the closing abstraction isn't implied by earlier images, cut it and end on the last image",
      evaluation_criteria: ["Deleting the aphorism leaves the meaning intact (it confirms, not carries)"],
      card_role: "secondary",
      specificity_level: "obvious",
      transfer_difficulty: "medium",
      best_for_tasks: ["speech endings", "essay conclusions", "op-ed closers"],
    },
    {
      technique_name: "maria_test_texture_ornament",
      plain_name: "One non-load-bearing ornament for texture",
      function: "A single vivid, functionally unnecessary detail (the unpronounceable Portuguese town) signals abundance without bloat",
      reader_effect: ["world beyond the frame", "authenticity"],
      genre_fit: ["memoir", "fiction", "travel_writing", "case_studies"],
      when_to_use: "Once per piece, where the texture implies more story than told",
      when_not_to_use: "In compressed formats (abstracts, summaries) where every word must carry load",
      transfer_rule: "Allow exactly one detail that exists only for texture; cut the second",
      bad_use_warning: "Two ornaments are clutter; five are a scrapbook",
      genre_adaptations: [
        { genre: "case_studies", guidance: "One human detail about the customer that isn't a metric" },
      ],
      revision_instruction: "Count the ornaments; keep the best one, cut the rest",
      evaluation_criteria: ["Exactly one detail survives that a ruthless editor would question"],
      card_role: "secondary",
      specificity_level: "advanced",
      transfer_difficulty: "high",
      best_for_tasks: ["memoir texture", "case-study humanization", "fiction world-building"],
    },
    // ── 2 FAILURE MODES ───────────────────────────────────────────────────────
    {
      technique_name: "maria_test_borrowed_grief_prop",
      plain_name: "Failure mode: borrowing an object you have no claim to",
      function: "Anti-pattern — importing an emotionally loaded object (a jar, a watch, a recipe) the writer has no real relationship with, hoping it does the feeling for them",
      reader_effect: ["distrust", "detected sentimentality"],
      genre_fit: ["personal_essay", "speech", "marketing_copy"],
      when_to_use: "Never — this card exists to be recognized and avoided",
      when_not_to_use: "Always; if the object isn't truly yours, the technique is a costume",
      transfer_rule: "Before using an object emotionally, verify you can add three true details about it that aren't in any essay you've read",
      bad_use_warning: "Readers of application essays and eulogies detect prop-objects instantly; one false detail collapses the whole register",
      genre_adaptations: [
        { genre: "marketing_copy", guidance: "The same failure appears as fake founder-story artifacts" },
      ],
      revision_instruction: "For each emotional object, list its three off-page details; cut any object that has none",
      evaluation_criteria: ["Every emotional object survives the three-true-details test"],
      card_role: "failure_mode",
      specificity_level: "subtle",
      transfer_difficulty: "low",
      best_for_tasks: ["application-essay review", "eulogy drafting", "brand-story audits"],
    },
    {
      technique_name: "maria_test_over_neat_closing",
      plain_name: "Failure mode: the too-tidy final abstraction",
      function: "Anti-pattern — closing restraint-built writing with a moral so neat it retroactively makes the restraint look staged",
      reader_effect: ["deflation", "suspicion of packaging"],
      genre_fit: ["personal_essay", "speech", "narrative_nonfiction", "blog_post"],
      when_to_use: "Never as-is; recognize when a draft's last line is doing this",
      when_not_to_use: "Always; if the close explains the whole piece, the piece didn't need the reader",
      transfer_rule: "Test the close by deleting it: if the piece gets stronger or stays equal, the close was packaging",
      bad_use_warning: "This is where the salt essay itself is most fragile — 'precision is not the same thing as care' verges on greeting-card if the jars hadn't earned it",
      genre_adaptations: [
        { genre: "blog_post", guidance: "The 'and that's the real lesson' final paragraph — cut it" },
      ],
      revision_instruction: "Delete the final abstraction; end on the last concrete image; restore the abstraction only if something is genuinely lost",
      evaluation_criteria: ["The delete-test was actually performed on the closing line"],
      card_role: "failure_mode",
      specificity_level: "advanced",
      transfer_difficulty: "medium",
      best_for_tasks: ["essay-ending review", "speech closer audits", "editing over-polished drafts"],
    },
  ],
};

/** All slugs, for test cleanup. */
export const mariaSlugs = mariaExtraction.cards.map((c) => c.technique_name);
