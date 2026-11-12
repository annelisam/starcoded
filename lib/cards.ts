// starcoded card dataset, v0.
// Original text written for this project, following the Rider-Waite-Smith tradition.
// Each card: [id, name, upright keywords, reversed keywords, upright meaning, reversed meaning]

export type Suit = "wands" | "cups" | "swords" | "pentacles";

export type Card = {
  id: string;
  name: string;
  arcana: "major" | "minor";
  suit?: Suit;
  upright: string[];
  reversed: string[];
  meaning: string;
  reversedMeaning: string;
};

type Row = [string, string, string, string, string, string];

const major: Row[] = [
  ["the-fool", "The Fool", "beginnings, trust, spontaneity", "recklessness, hesitation, naivety", "A fresh start taken on faith, before the path is fully visible.", "A leap delayed by fear, or one taken without looking at the ground."],
  ["the-magician", "The Magician", "skill, willpower, manifestation", "manipulation, scattered energy, untapped talent", "Everything needed is already on the table, and focus turns it into results.", "Talent pointed at the wrong target, or charm used in place of substance."],
  ["the-high-priestess", "The High Priestess", "intuition, mystery, inner knowing", "ignored instinct, secrets, surface answers", "The answer sits below the surface and arrives through stillness.", "Inner signals are being overridden by noise or by other people's opinions."],
  ["the-empress", "The Empress", "abundance, nurture, creativity", "smothering, creative block, self-neglect", "Growth through care, pleasure, and patience with natural timing.", "Giving past the point of depletion, or neglecting what needs tending."],
  ["the-emperor", "The Emperor", "structure, authority, stability", "rigidity, control, weak boundaries", "Order, discipline, and clear rules create something that lasts.", "Control that has hardened into domination, or structure that is missing entirely."],
  ["the-hierophant", "The Hierophant", "tradition, teaching, shared belief", "rebellion, dogma, personal truth", "Wisdom passed down through institutions, mentors, and established practice.", "Inherited rules are being questioned and a personal code is forming."],
  ["the-lovers", "The Lovers", "union, choice, alignment", "disharmony, misaligned values, avoidance", "A bond or a decision that asks for full honesty about what is valued.", "A split between what is wanted and what is chosen."],
  ["the-chariot", "The Chariot", "drive, determination, victory", "lost direction, force, stalled momentum", "Opposing forces are held together by will and aimed at one destination.", "Pushing hard without steering, or momentum that has run out."],
  ["strength", "Strength", "courage, patience, gentle power", "self-doubt, raw impulse, exhaustion", "Quiet endurance and compassion tame what force cannot.", "Confidence has dipped, or instinct is running the show."],
  ["the-hermit", "The Hermit", "solitude, reflection, guidance", "isolation, withdrawal, avoidance", "Stepping back to find a truth that only quiet can reveal.", "Solitude has turned into hiding, or reflection is being skipped."],
  ["wheel-of-fortune", "Wheel of Fortune", "cycles, turning point, fate", "resistance, bad timing, repeating patterns", "The cycle is turning, and circumstances shift beyond anyone's control.", "Clinging to a phase that is ending, or a pattern coming around again."],
  ["justice", "Justice", "truth, fairness, consequence", "dishonesty, imbalance, dodged accountability", "Actions meet their results, and clear sight leads to a fair outcome.", "Something is out of balance, or a truth is being avoided."],
  ["the-hanged-man", "The Hanged Man", "pause, surrender, new perspective", "stalling, pointless sacrifice, resistance", "A willing suspension that shows the situation from a new angle.", "Waiting with no purpose, or refusing a pause that is needed."],
  ["death", "Death", "ending, transformation, release", "clinging, stagnation, slow change", "One chapter closes completely so the next one has room.", "An ending is being resisted and the transition drags."],
  ["temperance", "Temperance", "balance, moderation, blending", "excess, imbalance, impatience", "Opposites are mixed with patience until they form something workable.", "Too much of one thing, or a rush that spoils the mix."],
  ["the-devil", "The Devil", "attachment, temptation, shadow", "release, awareness, breaking free", "A bond that feels fixed and is held in place by habit or desire.", "The chain is loosening and the pattern is becoming visible."],
  ["the-tower", "The Tower", "upheaval, revelation, collapse", "averted crisis, delayed reckoning, fear of change", "A structure built on a false base comes down fast.", "The shake-up is internal, postponed, or smaller than feared."],
  ["the-star", "The Star", "hope, renewal, calm", "discouragement, doubt, disconnection", "Healing after difficulty, with a steady sense that things can improve.", "Faith has thinned and needs rebuilding from small evidence."],
  ["the-moon", "The Moon", "illusion, intuition, uncertainty", "clarity returning, released fear, confusion lifting", "The path is dimly lit and feelings distort what is seen.", "The fog is thinning and what was hidden starts to show."],
  ["the-sun", "The Sun", "joy, vitality, success", "dimmed optimism, delay, overconfidence", "Warmth, clarity, and plain good fortune.", "The good is present and partly obscured, or enthusiasm has outrun reality."],
  ["judgement", "Judgement", "awakening, reckoning, calling", "self-doubt, avoidance, harsh self-criticism", "A clear call to review the past and rise into a new phase.", "The call is being ignored or drowned out by self-judgment."],
  ["the-world", "The World", "completion, wholeness, arrival", "loose ends, delay, near-finish", "A cycle completes and its lessons are fully integrated.", "The finish line is close and something remains undone."],
];

const wands: Row[] = [
  ["ace-of-wands", "Ace of Wands", "spark, inspiration, potential", "false start, delay, low energy", "A surge of creative fire and the urge to begin.", "The idea is there and the ignition is missing."],
  ["two-of-wands", "Two of Wands", "planning, vision, decision", "fear of the unknown, poor planning, staying put", "Standing at the edge of known territory and mapping what comes next.", "The plan stays on paper because the comfortable option wins."],
  ["three-of-wands", "Three of Wands", "expansion, foresight, progress", "delays, short sight, frustration", "Early efforts are in motion and the horizon is widening.", "Results are slower than expected, or the view is too narrow."],
  ["four-of-wands", "Four of Wands", "celebration, home, milestone", "instability, transition, tension at home", "A stable base and a reason to celebrate with others.", "The foundation feels shaky, or a milestone passes without acknowledgment."],
  ["five-of-wands", "Five of Wands", "conflict, competition, friction", "avoidance, resolution, inner conflict", "Many wills clash, and the friction tests everyone's ideas.", "The fight is winding down, or it has moved inside."],
  ["six-of-wands", "Six of Wands", "recognition, victory, confidence", "ego, private win, fall from favor", "Public success and the respect that follows effort.", "Validation is missing, or pride is doing the talking."],
  ["seven-of-wands", "Seven of Wands", "defense, perseverance, conviction", "overwhelm, giving ground, defensiveness", "Holding a position under pressure because it is worth holding.", "The constant defending is wearing thin."],
  ["eight-of-wands", "Eight of Wands", "speed, movement, news", "delay, scattered effort, miscommunication", "Events accelerate and messages arrive quickly.", "Momentum stalls, or energy fires in too many directions."],
  ["nine-of-wands", "Nine of Wands", "resilience, persistence, guardedness", "burnout, paranoia, stubbornness", "Tired and still standing, with one more push left.", "The guard has become a wall, or reserves are empty."],
  ["ten-of-wands", "Ten of Wands", "burden, responsibility, overload", "release, delegation, collapse", "Carrying too much alone, close to the destination.", "The load is finally being set down, or it is about to drop."],
  ["page-of-wands", "Page of Wands", "curiosity, enthusiasm, exploration", "restlessness, unfocused ideas, hesitation", "A bright new interest and the nerve to follow it.", "Excitement without follow-through."],
  ["knight-of-wands", "Knight of Wands", "action, adventure, passion", "impulsiveness, haste, burnout", "Charging toward a goal with heat and confidence.", "Speed without direction, or a sudden loss of interest."],
  ["queen-of-wands", "Queen of Wands", "confidence, warmth, magnetism", "insecurity, jealousy, dimmed fire", "Self-assured, vibrant, and able to light up a room.", "Confidence has dipped, or it shows up as demand."],
  ["king-of-wands", "King of Wands", "leadership, vision, boldness", "arrogance, impatience, overreach", "A natural leader who turns vision into a shared mission.", "Authority used forcefully, or expectations set too high."],
];

const cups: Row[] = [
  ["ace-of-cups", "Ace of Cups", "new feeling, openness, love", "blocked emotion, emptiness, repression", "The heart opens and a new emotional chapter starts.", "Feelings are held back or the well feels dry."],
  ["two-of-cups", "Two of Cups", "partnership, mutual attraction, connection", "imbalance, miscommunication, separation", "Two people meet as equals and recognize each other.", "The exchange has become uneven or strained."],
  ["three-of-cups", "Three of Cups", "friendship, celebration, community", "overindulgence, gossip, isolation", "Joy shared with people who are happy for you.", "The circle feels off, or the party has gone on too long."],
  ["four-of-cups", "Four of Cups", "apathy, contemplation, reevaluation", "renewed interest, awareness, acceptance", "Disengaged and overlooking what is being offered.", "Attention returns and an overlooked option gets a second look."],
  ["five-of-cups", "Five of Cups", "loss, regret, grief", "acceptance, moving on, forgiveness", "Focus rests on what spilled while something remains standing.", "Grief is easing and attention turns to what is left."],
  ["six-of-cups", "Six of Cups", "nostalgia, innocence, reunion", "stuck in the past, outgrowing, idealizing", "Sweet memory, old connections, and simple kindness.", "The past is being held too tightly or seen too rosily."],
  ["seven-of-cups", "Seven of Cups", "choices, fantasy, illusion", "clarity, decision, reality check", "Many options shimmer and few of them are solid.", "The daydream clears and one option becomes real."],
  ["eight-of-cups", "Eight of Cups", "walking away, searching, letting go", "fear of leaving, drifting, returning", "Leaving something that works on paper and no longer feeds the soul.", "Staying past the expiry date, or circling back."],
  ["nine-of-cups", "Nine of Cups", "contentment, satisfaction, wish fulfilled", "smugness, hollow comfort, overindulgence", "Emotional and material satisfaction, plainly enjoyed.", "The wish came true and feels thinner than expected."],
  ["ten-of-cups", "Ten of Cups", "harmony, family, lasting happiness", "disconnection, strained home, broken ideal", "Deep emotional fulfillment shared with loved ones.", "The picture looks right and the feeling is missing."],
  ["page-of-cups", "Page of Cups", "sensitivity, creative message, wonder", "moodiness, creative block, immaturity", "A tender new feeling or an imaginative idea surfaces.", "Emotions are running the day, or inspiration is shy."],
  ["knight-of-cups", "Knight of Cups", "romance, charm, following the heart", "moodiness, unrealistic ideals, empty offers", "An invitation delivered with feeling and grace.", "The gesture is lovely and the follow-through is thin."],
  ["queen-of-cups", "Queen of Cups", "compassion, intuition, emotional depth", "overwhelm, codependency, moodiness", "Deeply attuned, calm, and caring without losing herself.", "Other people's feelings are flooding in unfiltered."],
  ["king-of-cups", "King of Cups", "emotional balance, diplomacy, calm", "volatility, suppression, manipulation", "Feelings are fully felt and steadily managed.", "Emotion is either bottled or used as leverage."],
];

const swords: Row[] = [
  ["ace-of-swords", "Ace of Swords", "clarity, truth, breakthrough", "confusion, clouded judgment, harsh words", "A sharp new insight cuts through the noise.", "The mind is foggy, or truth is used carelessly."],
  ["two-of-swords", "Two of Swords", "stalemate, indecision, guardedness", "information revealed, overwhelm, forced choice", "A choice is avoided by refusing to look at it.", "The blindfold slips and the decision can no longer wait."],
  ["three-of-swords", "Three of Swords", "heartbreak, sorrow, painful truth", "recovery, release, lingering hurt", "A clean, honest hurt that needs to be felt.", "The wound is closing, or it is being picked at."],
  ["four-of-swords", "Four of Swords", "rest, recovery, stillness", "restlessness, burnout, returning to action", "A deliberate retreat to restore the mind.", "Rest is overdue, or it is time to get back up."],
  ["five-of-swords", "Five of Swords", "conflict, hollow win, tension", "reconciliation, regret, lingering resentment", "A victory that costs more than it earns.", "The urge to make peace, or a grudge that stays."],
  ["six-of-swords", "Six of Swords", "transition, moving on, calmer waters", "unfinished business, resistance, carried baggage", "A quiet passage away from difficulty.", "The departure is stalled by what has not been resolved."],
  ["seven-of-swords", "Seven of Swords", "strategy, secrecy, deception", "confession, exposure, conscience", "Something is being taken or done out of sight.", "A secret surfaces, or the solo scheme is abandoned."],
  ["eight-of-swords", "Eight of Swords", "restriction, self-limiting belief, feeling trapped", "release, new perspective, self-acceptance", "The bindings are real mostly in the mind.", "The way out becomes visible and the first step is taken."],
  ["nine-of-swords", "Nine of Swords", "anxiety, worry, sleepless nights", "relief, reaching out, facing the fear", "The mind amplifies fear in the dark.", "The worst of the worry is passing, or help is being let in."],
  ["ten-of-swords", "Ten of Swords", "painful ending, rock bottom, finality", "recovery, survival, resisting the end", "It is over, and the only direction left is up.", "The slow rise after the fall, or refusal to accept it ended."],
  ["page-of-swords", "Page of Swords", "curiosity, vigilance, new ideas", "gossip, all talk, scattered thinking", "A sharp, questioning mind eager to learn the truth.", "Words are running ahead of thought or action."],
  ["knight-of-swords", "Knight of Swords", "ambition, directness, fast action", "recklessness, aggression, no plan", "Charging at a goal with total mental focus.", "Speed has overtaken judgment."],
  ["queen-of-swords", "Queen of Swords", "clear boundaries, honesty, independence", "coldness, bitterness, harsh judgment", "Perceptive, fair, and unafraid to say what is true.", "Clarity has hardened into distance."],
  ["king-of-swords", "King of Swords", "intellect, authority, truth", "misused power, cold logic, tyranny", "Decisions made by reason, ethics, and clear standards.", "Intelligence is being used to control."],
];

const pentacles: Row[] = [
  ["ace-of-pentacles", "Ace of Pentacles", "opportunity, prosperity, new venture", "missed chance, poor planning, scarcity thinking", "A tangible opening in work, money, or health.", "The chance is there and the groundwork is missing."],
  ["two-of-pentacles", "Two of Pentacles", "balance, adaptability, juggling", "overcommitment, disorganization, dropped balls", "Competing demands kept in motion with a light touch.", "Too many things are in the air at once."],
  ["three-of-pentacles", "Three of Pentacles", "collaboration, craft, learning", "misalignment, poor teamwork, shoddy work", "Skill and cooperation build something of quality.", "The team is out of sync, or effort is going unrecognized."],
  ["four-of-pentacles", "Four of Pentacles", "security, saving, control", "greed, letting go, generosity", "Holding tightly to what has been earned.", "The grip is loosening, for better or worse."],
  ["five-of-pentacles", "Five of Pentacles", "hardship, lack, isolation", "recovery, help found, renewed faith", "A lean stretch, with help closer than it looks.", "Conditions are improving and support is accepted."],
  ["six-of-pentacles", "Six of Pentacles", "generosity, giving, receiving", "strings attached, one-sided giving, debt", "Resources flow fairly between those who have and those who need.", "The exchange is uneven or comes with conditions."],
  ["seven-of-pentacles", "Seven of Pentacles", "patience, assessment, long view", "impatience, poor returns, wasted effort", "A pause to evaluate what the work is producing.", "Frustration with slow growth, or effort aimed at the wrong crop."],
  ["eight-of-pentacles", "Eight of Pentacles", "diligence, mastery, practice", "perfectionism, tedium, cut corners", "Steady, focused repetition that builds real skill.", "The work has become rote, or quality is slipping."],
  ["nine-of-pentacles", "Nine of Pentacles", "independence, luxury, self-sufficiency", "overwork, dependence, hollow comfort", "Enjoying the comfort earned by one's own effort.", "Success is costing more than it gives."],
  ["ten-of-pentacles", "Ten of Pentacles", "legacy, wealth, family foundation", "family conflict, instability, short-term gain", "Lasting security that extends across generations.", "The foundation is contested or fragile."],
  ["page-of-pentacles", "Page of Pentacles", "ambition, study, new skill", "procrastination, lack of focus, missed lesson", "A serious student with a practical goal.", "The plan is good and the start keeps slipping."],
  ["knight-of-pentacles", "Knight of Pentacles", "reliability, routine, steady effort", "stagnation, boredom, perfectionism", "Slow, methodical progress that can be counted on.", "Routine has turned into a rut."],
  ["queen-of-pentacles", "Queen of Pentacles", "nurturing, practicality, comfort", "self-neglect, work-home imbalance, smothering", "Grounded care that makes life comfortable for everyone.", "Caring for everything except herself."],
  ["king-of-pentacles", "King of Pentacles", "abundance, security, leadership", "greed, stubbornness, status obsession", "Wealth built with discipline and shared with generosity.", "Material success has become the only measure."],
];

const split = (s: string) => s.split(", ");

const build = (rows: Row[], arcana: Card["arcana"], suit?: Suit): Card[] =>
  rows.map(([id, name, up, rev, meaning, reversedMeaning]) => ({
    id,
    name,
    arcana,
    suit,
    upright: split(up),
    reversed: split(rev),
    meaning,
    reversedMeaning,
  }));

export const CARDS: Card[] = [
  ...build(major, "major"),
  ...build(wands, "minor", "wands"),
  ...build(cups, "minor", "cups"),
  ...build(swords, "minor", "swords"),
  ...build(pentacles, "minor", "pentacles"),
];

export const CARD_IDS = CARDS.map((c) => c.id);

const byId = new Map(CARDS.map((c) => [c.id, c]));

export const getCard = (id: string) => byId.get(id.toLowerCase());

export const SUIT_THEMES: Record<Suit, string> = {
  wands: "fire: drive, creativity, ambition, action",
  cups: "water: emotion, relationships, intuition",
  swords: "air: thought, communication, conflict, truth",
  pentacles: "earth: work, money, body, the material world",
};
