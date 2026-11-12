// Study notes for each card, shown under a reading so people can learn the deck.
// Original text written for starcoded. Symbols describe the Rider-Waite-Smith artwork.
// Astrology follows the Golden Dawn correspondences most modern decks use.

import { CARDS, verdict, type Card, type Suit, type Verdict } from "./cards";

export type Lore = {
  type: string;
  element: string;
  astrology: string;
  number: string;
  yesNo: { upright: Verdict; reversed: Verdict };
  symbols: { name: string; meaning: string }[];
  areas: { label: string; upright: string; reversed: string }[];
};

// [element, astrology] for the major arcana, in deck order.
const MAJOR: [string, string][] = [
  ["air", "Uranus"],
  ["air", "Mercury"],
  ["water", "the Moon"],
  ["earth", "Venus"],
  ["fire", "Aries"],
  ["earth", "Taurus"],
  ["air", "Gemini"],
  ["water", "Cancer"],
  ["fire", "Leo"],
  ["earth", "Virgo"],
  ["fire", "Jupiter"],
  ["air", "Libra"],
  ["water", "Neptune"],
  ["water", "Scorpio"],
  ["fire", "Sagittarius"],
  ["earth", "Capricorn"],
  ["fire", "Mars"],
  ["air", "Aquarius"],
  ["water", "Pisces"],
  ["fire", "the Sun"],
  ["fire", "Pluto"],
  ["earth", "Saturn"],
];

const SUIT: Record<Suit, { element: string; signs: string; decans: string[] }> = {
  wands: {
    element: "fire",
    signs: "Aries, Leo, Sagittarius",
    decans: ["Mars in Aries", "Sun in Aries", "Venus in Aries", "Saturn in Leo", "Jupiter in Leo", "Mars in Leo", "Mercury in Sagittarius", "Moon in Sagittarius", "Saturn in Sagittarius"],
  },
  cups: {
    element: "water",
    signs: "Cancer, Scorpio, Pisces",
    decans: ["Venus in Cancer", "Mercury in Cancer", "Moon in Cancer", "Mars in Scorpio", "Sun in Scorpio", "Venus in Scorpio", "Saturn in Pisces", "Jupiter in Pisces", "Mars in Pisces"],
  },
  swords: {
    element: "air",
    signs: "Libra, Aquarius, Gemini",
    decans: ["Moon in Libra", "Saturn in Libra", "Jupiter in Libra", "Venus in Aquarius", "Mercury in Aquarius", "Moon in Aquarius", "Jupiter in Gemini", "Mars in Gemini", "Sun in Gemini"],
  },
  pentacles: {
    element: "earth",
    signs: "Capricorn, Taurus, Virgo",
    decans: ["Jupiter in Capricorn", "Mars in Capricorn", "Sun in Capricorn", "Mercury in Taurus", "Moon in Taurus", "Saturn in Taurus", "Sun in Virgo", "Venus in Virgo", "Mercury in Virgo"],
  },
};

const RANKS = ["ace", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "page", "knight", "queen", "king"];

// What each number or court rank tends to mean across all four suits.
const RANK_THEME: Record<string, string> = {
  ace: "aces are beginnings",
  two: "twos are choices and balance",
  three: "threes are growth",
  four: "fours are stability",
  five: "fives are conflict and change",
  six: "sixes are harmony and exchange",
  seven: "sevens are tests and reflection",
  eight: "eights are movement and effort",
  nine: "nines are near completion",
  ten: "tens are endings and fullness",
  page: "pages are students and messages",
  knight: "knights are action",
  queen: "queens are inner mastery",
  king: "kings are outer mastery",
};

// Per card: "symbol=meaning; symbol=meaning; symbol=meaning | love | work | money".
// Each of love, work, and money is written "upright / reversed".
const NOTES: Record<string, string> = {
  "the-fool": "white rose=pure intent; small dog=instinct and loyalty; cliff edge=the unknown ahead | a new romance, playful and open / rushing in, fear of commitment | a fresh start, a leap into something new / unprepared, reckless career moves | a new venture, trust in the process / careless spending, risky bets",
  "the-magician": "infinity sign=endless potential; four suit tools on the table=every resource at hand; one hand up, one down=turning ideas into reality | making the first move, magnetic attraction / mixed signals, charm without sincerity | skill meeting opportunity, a strong pitch / wasted talent, overpromising | creating income from your own skills / schemes, money slipping through plans",
  "the-high-priestess": "two pillars, dark and light=duality; veil of pomegranates=hidden knowledge; crescent moon at her feet=intuition | quiet attraction, feelings not yet spoken / secrets, ignoring a gut feeling | trust instinct, wait for more information / hidden agendas, missing facts | hold off and observe / unclear terms, read the fine print",
  "the-empress": "crown of twelve stars=the cycle of the year; wheat field=abundance; heart-shaped shield with the Venus sign=love | nurturing love, deep affection, fertility / smothering, neglecting your own needs | creative growth, projects flourishing / creative block, stalled growth | comfort and plenty, generous returns / overspending on comfort, dependence",
  "the-emperor": "stone throne with ram heads=Aries and determination; ankh scepter=authority; armor under the robe=protection | stability, a protective and committed partner / controlling behavior, emotional distance | leadership, structure, a promotion / a rigid boss, misuse of authority | disciplined budgeting, solid foundations / controlling money, poor planning",
  "the-hierophant": "crossed keys=knowledge of the seen and unseen; triple crown=spiritual authority; two followers=teaching passed on | commitment, shared values, tradition / clashing beliefs, an unconventional bond | mentorship, following proven methods / breaking from convention, questioning the rules | conservative choices, trusted institutions / unorthodox methods, doubting standard advice",
  "the-lovers": "angel above=higher guidance; tree with a serpent=temptation and choice; tree of flames=passion | deep connection, a meaningful union / disharmony, mismatched values | a values-led decision, a strong partnership / conflict with partners, a divided choice | choices in line with your values / choices that go against them, joint money trouble",
  "the-chariot": "one dark and one light sphinx=opposing forces; starry canopy=guidance from above; no reins=control through will | pursuing love with determination / pulling in different directions | ambition, winning through focus / no direction, burnout | disciplined pursuit of a goal / impulsive moves, losing control of spending",
  "strength": "woman calming a lion=gentle mastery of instinct; infinity sign=enduring spirit; white robe=pure intent | patient, tender devotion / insecurity, jealousy | quiet confidence, handling pressure well / self-doubt, losing your temper | steady restraint, slow gains / impulsive spending, doubt about your worth",
  "the-hermit": "lantern with a star=inner wisdom lighting the way; staff=support; mountain peak=clarity found alone | time alone, knowing yourself first / isolation, withdrawing from a partner | focused solo work, seeking a mentor / being left out, working in a silo | careful review, simple living / cutting yourself off from good advice",
  "wheel-of-fortune": "four winged creatures=steadiness amid change; sphinx at the top=wisdom; snake and jackal on the rim=descent and rise | a fated meeting, a turn for the better / bad timing, repeating a pattern | a lucky break, a change of cycle / a setback, resisting change | a windfall, shifting fortunes / an unexpected expense, a downturn",
  "justice": "scales=weighing both sides; upright sword=a clear decision; pillars and veil=the structure of law | honesty, fair give and take / imbalance, unfair treatment | contracts, fair outcomes, accountability / bias, dodging responsibility | getting what is owed, legal clarity / debts, an unfair deal",
  "the-hanged-man": "halo around the head=insight; living wood=growth through pause; crossed leg=willing surrender | pause, seeing a partner differently / stalling, one-sided sacrifice | waiting, a change of approach / wasted time, resisting a needed pause | hold off, rethink priorities / money stuck, losses from delay",
  "death": "white rose on a black flag=new life after an ending; rising sun between towers=renewal; armored skeleton=change that cannot be stopped | the end of a chapter, deep change / clinging to what is over | closing one door, a career change / fear of change, staying too long | ending a money habit, a clean slate / resisting a necessary cut",
  "temperance": "water poured between two cups=blending opposites; one foot on land, one in water=balance of feeling and reason; path to a glowing crown=the long goal | patience, a balanced partnership / extremes, impatience | steady collaboration, moderation / imbalance, clashing with colleagues | measured saving, balanced spending / excess, lopsided budgets",
  "the-devil": "loose chains on two figures=bonds that could be lifted; inverted pentagram=matter over spirit; downturned torch=desire misdirected | obsession, an unhealthy attachment / breaking free, seeing the pattern | feeling trapped, golden handcuffs / leaving a toxic role, reclaiming power | debt, materialism, overindulgence / getting out of debt, loosening the grip",
  "the-tower": "lightning bolt=sudden truth; falling crown=false authority knocked down; falling figures=loss of control | a sudden breakup, a truth revealed / avoiding a needed ending | upheaval, sudden job change / averting a crisis, fearing change | an unexpected loss, a shaky plan failing / a narrow escape, delaying the inevitable",
  "the-star": "one large star and seven small ones=hope and guidance; two jugs of water=nourishing land and feeling; bird in the tree=thought taking flight | healing, renewed faith in love / disappointment, guarded heart | inspiration, a hopeful outlook / discouragement, lost motivation | recovery, things improving / pessimism, doubt about the future",
  "the-moon": "dog and wolf=the tame and the wild self; crayfish leaving the pool=what rises from the unconscious; path between two towers=the uncertain way forward | confusion, unspoken fears / clarity returning, truth coming out | unclear information, trust your instinct / misunderstandings clearing | hidden factors, be cautious / deception exposed, facts emerging",
  "the-sun": "child on a white horse=innocent joy; sunflowers=vitality; red banner=energy and action | happiness, warmth, celebration / a dimmed spark, unrealistic hopes | success, recognition, confidence / a delayed win, overconfidence | prosperity, a good return / a temporary setback, overoptimism",
  "judgement": "angel with a trumpet=the call; figures rising=rebirth; flag with a cross=healing and unity | forgiveness, a second chance / old wounds, harsh judgment | a calling, a career awakening / self-doubt, ignoring the call | an honest review, a turning point / avoiding the numbers, repeating mistakes",
  "the-world": "wreath=completion; dancing figure with two wands=balance in motion; four creatures in the corners=the elements in harmony | fulfillment, a relationship that feels whole / lack of closure, something unfinished | a goal achieved, a project completed / loose ends, a delayed finish | reaching a milestone, security / almost there, shortcuts that cost",

  "ace-of-wands": "hand from a cloud=an opportunity offered; sprouting leaves=growth; distant castle=the promise ahead | a spark, new passion / a delay, fading spark | a new project, a burst of drive / a false start, lack of direction | a promising new venture / a missed chance, a slow start",
  "two-of-wands": "globe in hand=a world of options; one wand fixed to the wall=the known against the new; battlements=a safe vantage point | planning a future together / fear of the next step | long-term planning, expansion / playing it safe, poor planning | planning for growth / hesitating over an investment",
  "three-of-wands": "ships at sea=ventures under way; figure looking out=foresight; three planted wands=a firm base | long-distance love, looking ahead together / frustration, delays in progress | expansion, opportunities abroad / setbacks, limited vision | early returns arriving / delayed returns, obstacles",
  "four-of-wands": "garland between four wands=celebration; raised bouquets=welcome; castle behind=home and security | commitment, celebration, coming home / tension at home, a postponed milestone | a milestone, a supportive team / an unstable workplace, lack of appreciation | stability, a reason to celebrate / shaky footing, costs at home",
  "five-of-wands": "five figures with clashing staffs=competition; mismatched clothing=differing views; no one hurt=conflict as practice | bickering, competing for attention / making peace, avoiding the issue | rivalry, heated debate / cooperation, the end of a dispute | money disputes, a competitive market / settling a dispute, easing tension",
  "six-of-wands": "laurel wreath=victory; white horse=success with integrity; crowd=public recognition | pride in a partner, a happy announcement / ego, feeling unappreciated | recognition, a promotion / being passed over, private wins | a reward, a bonus / a setback, success that does not last",
  "seven-of-wands": "high ground=the advantage; six wands below=challengers; mismatched shoes=being caught off guard | defending the relationship / defensiveness, feeling attacked | holding your position, standing out / overwhelmed, giving up ground | protecting what you earned / under pressure, losing ground",
  "eight-of-wands": "eight wands in flight=swift movement; clear sky=no obstacles; river below=a landing in sight | a whirlwind romance, exciting messages / mixed signals, slowing down | fast progress, good news / delays, miscommunication | quick results, money moving / delays, rushed decisions",
  "nine-of-wands": "bandaged head=past battles; fence of wands=defenses built; wary glance=vigilance | guarded but still trying / walls up, exhaustion | one last push, resilience / burnout, defensiveness | protecting your reserves / drained resources, worry",
  "ten-of-wands": "bundle of ten wands=overload; bent back=strain; town ahead=the goal within reach | carrying the relationship alone / sharing the load, letting go | overwork, too much responsibility / delegating, collapse from overload | financial burden, heavy obligations / lightening the load, clearing a debt",
  "page-of-wands": "feather in the hat=aspiration; salamanders on the tunic=fire and transformation; desert=potential not yet developed | flirtation, exciting news / immaturity, short-lived interest | a new idea, eagerness to learn / lack of direction, all talk | a small promising start / impulsive spending, unfinished plans",
  "knight-of-wands": "rearing horse=restless energy; salamander tunic=fire; plume like flame=passion | a passionate pursuit, adventure / hot and cold, a sudden exit | bold action, a change of job / recklessness, scattered effort | a daring move / an impulsive purchase, a hasty risk",
  "queen-of-wands": "sunflower=warmth and vitality; black cat=the independent, intuitive side; lion throne=courage | confident, warm, attractive energy / jealousy, insecurity | charismatic leadership, getting things done / burnout, a demanding manner | confident money management / overspending to impress",
  "king-of-wands": "salamander biting its tail=enduring fire; lion emblems=strength; blossoming wand=creative life force | a bold, loyal partner / domineering, hot-tempered | visionary leadership, entrepreneurship / arrogance, unrealistic demands | a bold investment that pays / overreach, impulsive risk",

  "ace-of-cups": "dove above the cup=a blessing arriving; five streams=feeling that overflows; lotus pond=awakening | new love, an open heart / blocked feelings, emptiness | work you love, creative inspiration / lack of fulfillment, low motivation | a gift, feeling content with enough / disappointment, emotional spending",
  "two-of-cups": "winged lion over a staff=passion joined with healing; exchanged cups=mutual giving; facing figures=equals | mutual attraction, partnership / imbalance, a falling out | a strong partnership, a good deal / a strained alliance, mistrust | a fair exchange, shared resources / unequal terms, a dissolved agreement",
  "three-of-cups": "three raised cups=shared joy; harvest fruit=abundance; dancing circle=community | celebration, friends becoming more / a third party, gossip | teamwork, a successful launch / office gossip, feeling left out | a reason to celebrate, group success / overspending on fun",
  "four-of-cups": "cup offered from a cloud=an unseen opportunity; crossed arms=withdrawal; tree at his back=quiet contemplation | boredom, taking love for granted / new interest, opening up again | dissatisfaction, an overlooked offer / fresh motivation, seizing a chance | ignoring an opportunity / seeing what is on offer",
  "five-of-cups": "three spilled cups=loss; two cups still standing=what remains; bridge to a castle=a way forward | heartbreak, regret / forgiveness, moving on | a setback, disappointment / recovering, learning from a loss | a loss, regret over spending / recouping, a fresh perspective",
  "six-of-cups": "cup of flowers handed to a child=simple giving; white flowers=innocence; old courtyard=comfort of the past | an old flame, sweet familiarity / stuck in the past, idealizing an ex | returning to a former role, kind colleagues / outgrowing a job, nostalgia holding you back | a gift, help from family / dependence, old money habits",
  "seven-of-cups": "cups in the clouds=fantasies; mixed contents=choices of unequal worth; shadowed figure=an unsure viewer | daydreams, too many options / clarity about what you want | many options, wishful thinking / a firm choice, focus | tempting offers, illusions of easy money / a realistic plan, seeing through a scheme",
  "eight-of-cups": "stacked cups with a gap=something missing; figure walking away=leaving by choice; eclipsed moon=turning inward | walking away, wanting more / fear of leaving, coming back | leaving an unfulfilling job / staying out of fear, drifting | walking away from a bad investment / clinging to a loss",
  "nine-of-cups": "arc of nine cups=wishes on display; crossed arms and a smile=contentment; bench=comfort | happiness, a wish granted / taking love for granted, shallow satisfaction | achievement, pride in your work / success that feels empty | comfort, plenty / overindulgence, never enough",
  "ten-of-cups": "rainbow of cups=a lasting blessing; raised arms=gratitude; dancing children=carefree joy | lasting love, a happy home / strain at home, a broken ideal | a supportive team, work in line with your values / poor balance between work and home | security shared with family / money strain at home",
  "page-of-cups": "fish in the cup=a surprise from within; flowered tunic=a gentle spirit; sea behind=feeling | a sweet message, a crush / immaturity, emotional games | a creative idea, good news / creative block, unprofessional moods | small good news, a modest gift / unrealistic plans, disappointing news",
  "knight-of-cups": "winged helmet and heels=imagination; calm white horse=grace; cup held out=an offer | a romantic offer, being swept off your feet / empty promises, moodiness | an appealing offer, following your heart / an offer that falls through | a welcome proposal / an offer too good to be true",
  "queen-of-cups": "closed ornate cup=guarded inner depths; throne at the water's edge=living between feeling and land; calm sea=emotional steadiness | deep care, emotional safety / codependency, emotional overwhelm | compassionate leadership, trusting intuition / taking on others' stress | intuitive, caring choices / emotional spending, giving too much away",
  "king-of-cups": "throne on a rough sea=calm amid turbulence; fish amulet=feeling held in balance; ship behind=steady passage | a mature, steady partner / emotional manipulation, bottled feelings | diplomacy, calm leadership / volatility, letting moods lead | level-headed choices, generosity / moody decisions, being taken advantage of",

  "ace-of-swords": "crown with olive and palm=victory and peace; hand from a cloud=clarity offered; jagged mountains=challenges ahead | an honest conversation, clarity / harsh words, confusion | a breakthrough idea, a clear plan / muddled thinking, a bad call | a clear-eyed decision / poor judgment, missing facts",
  "two-of-swords": "blindfold=refusing to look; crossed swords=a stalemate; crescent moon over water=intuition waiting | indecision, avoiding a talk / the truth comes out, a choice is forced | a deadlock, weighing two options / information overload, a decision made | sitting on the fence / a tough choice becomes clear",
  "three-of-swords": "pierced heart=heartbreak; rain clouds=grief; no figure=a pain everyone knows | heartbreak, painful truth / healing, forgiving | a painful setback, harsh feedback / recovering from disappointment | a loss that hurts / slow recovery, lessons absorbed",
  "four-of-swords": "resting knight=recovery; single sword beneath=one matter kept in mind; stained glass window=sanctuary | taking space, a pause to heal / restlessness, returning after a break | a needed break, time to recharge / burnout, getting back to work | a pause on spending, regrouping / acting again after a quiet period",
  "five-of-swords": "figure gathering swords=a win that costs; two walking away=defeat; ragged clouds=turbulence | a fight where no one wins / apology, wanting peace | office conflict, winning at others' expense / making amends, lingering resentment | a deal that leaves a bad taste / settling up, counting the cost",
  "six-of-swords": "ferryman=help through a transition; swords in the boat=baggage carried along; calm water ahead=relief | moving on, healing together or apart / unresolved baggage, resisting change | a transition, a move to something better / a stalled move, unfinished business | slowly leaving a hard patch / a delayed recovery",
  "seven-of-swords": "figure sneaking off with swords=stealth; two swords left behind=an incomplete plan; camp tents=taking from others | dishonesty, hidden motives / coming clean, getting caught | office politics, working an angle / a scheme exposed, a change of conscience | be wary of trickery / a deception revealed",
  "eight-of-swords": "blindfold and loose bindings=limits that are self-imposed; gap in the ring of swords=a way out; distant castle=help out of reach for now | feeling trapped, powerless / freeing yourself, a new view | feeling stuck, limiting beliefs / finding options, taking back control | feeling restricted by money / seeing a way out",
  "nine-of-swords": "figure upright in bed=anxiety; nine swords on the wall=thoughts hanging overhead; dark room=fear at night | worry, overthinking / easing fears, talking it through | stress, dread about work / the worry was worse than the reality | money anxiety, sleepless nights / facing the numbers, relief",
  "ten-of-swords": "ten swords in the back=a final ending; black sky=the lowest point; golden horizon=a new day | a painful ending / slow recovery, refusing to let go | a failure, a role ending badly / rising again, surviving the worst | rock bottom, a serious loss / the slow way back up",
  "page-of-swords": "raised sword and backward glance=alertness; wind-blown hair=restless thought; birds=ideas in flight | curiosity, lots of talking / gossip, saying without doing | new ideas, eagerness to learn / all talk, careless words | researching options / hasty decisions, bad information",
  "knight-of-swords": "charging horse=haste; wind-bent trees=force; raised sword=a single focus | a fast-moving pursuit, blunt honesty / careless with feelings, rushing off | ambition, decisive action / recklessness, burning bridges | a quick decisive move / rushing into a mistake",
  "queen-of-swords": "upright sword=truth; open raised hand=a fair hearing; butterfly crown=thought transformed | clear boundaries, honest love / coldness, old bitterness | sharp judgment, direct communication / harsh criticism, isolation | clear-eyed, independent choices / cutting too deep, cynicism",
  "king-of-swords": "upright sword=reasoned judgment; butterfly throne=a transformed mind; blue robe=clarity | intellectual connection, honesty / emotional distance, controlling words | authority, expertise, ethical decisions / abuse of power, cold logic | logical, well-researched choices / manipulation, ruthless tactics",

  "ace-of-pentacles": "coin offered by a hand=a real opportunity; garden with lilies=growth; archway to mountains=the path to bigger goals | a grounded new relationship / a missed connection, poor timing | a job offer, a new business / a lost opportunity, poor planning | a windfall, a new income source / a missed chance, a shaky start",
  "two-of-pentacles": "loop around two coins=constant flow; ships on high waves=ups and downs; light step=staying nimble | balancing love with life, staying playful / overcommitted, no time for each other | juggling priorities, adapting / overwhelm, dropped tasks | balancing the budget / overstretched, disorganized finances",
  "three-of-pentacles": "mason at work=skill; two figures with plans=collaboration; cathedral arch=work built to last | building something together / pulling in different directions | teamwork, recognized skill / poor cooperation, sloppy work | paid for quality work / underpaid, a project in trouble",
  "four-of-pentacles": "coins at the head, chest, and feet=holding tight in mind, heart, and body; city behind=keeping others at a distance; folded posture=guardedness | possessiveness, a guarded heart / opening up, letting go of control | job security, protecting your position / loosening control, taking a risk | saving, holding tight / greed, or finally spending",
  "five-of-pentacles": "lit church window=help close by; snow=hardship; crutches=shared struggle | feeling left out in the cold / reconnecting, accepting support | job loss, being overlooked / new work, help arriving | hardship, tight money / recovery, finding support",
  "six-of-pentacles": "scales=fairness; coins given to kneeling figures=charity; merchant's robe=the means to give | generosity, give and take / one person giving more | a bonus, a helpful mentor / favoritism, strings attached | giving or receiving help / debt, unequal terms",
  "seven-of-pentacles": "coins on a vine=a slow harvest; leaning on the hoe=a pause to assess; one coin set apart=first results | patience, a slow-growing bond / impatience, wondering if it is worth it | long-term effort, reviewing progress / effort without reward | patient investing / poor returns, impatience",
  "eight-of-pentacles": "craftsman at the bench=practice; finished coins on display=progress; distant town=focus away from distraction | putting in the effort / neglect, going through the motions | mastery, diligent work / perfectionism, cutting corners | steady earnings from skill / dead-end effort, shortcuts",
  "nine-of-pentacles": "hooded falcon=discipline; ripe vineyard=earned abundance; snail=a patient pace | happy on your own, high standards / dependence, loneliness in comfort | success through your own effort / overwork, hollow achievement | financial independence, luxury / living beyond your means",
  "ten-of-pentacles": "elder with dogs=legacy; family archway=an established house; coins in a tree pattern=completeness | lasting commitment, family approval / family tension, disputes over money | a stable career, a lasting business / instability, a short-term outlook | wealth, inheritance, long-term security / losses, family money conflict",
  "page-of-pentacles": "coin held up with care=study and focus; green field=fertile ground; distant trees=growth to come | a slow, sincere start / lack of effort, immaturity | a new skill, an apprenticeship / procrastination, a missed lesson | a small start worth growing / poor planning, a wasted chance",
  "knight-of-pentacles": "still dark horse=patience and reliability; plowed field=groundwork; oak leaves on the helmet=endurance | a loyal, steady partner / boredom, stuck in routine | diligence, dependable progress / stagnation, joyless work | slow and steady saving / being too cautious, inertia",
  "queen-of-pentacles": "rabbit=fertility and prosperity; rose arbor=abundance; coin in her lap=caring stewardship | warm, practical love / self-neglect, smothering | balancing work and home, resourcefulness / imbalance, overextending | sensible comfort, good stewardship / overspending on others, insecurity",
  "king-of-pentacles": "bull heads on the throne=steadiness; grapevine robe=wealth; castle behind=achievement | a reliable, generous partner / materialism, possessiveness | business success, respected authority / greed, ruthless tactics | lasting wealth, sound investing / poor money choices, obsession with status",
};

export function getLore(card: Card): Lore {
  const [symbolText = "", ...areaTexts] = (NOTES[card.id] ?? "").split(" | ");
  const symbols = symbolText
    .split("; ")
    .filter(Boolean)
    .map((s) => {
      const [name, meaning = ""] = s.split("=");
      return { name, meaning };
    });
  const areas = ["love", "work", "money"].map((label, i) => {
    const [upright = "", reversed = ""] = (areaTexts[i] ?? "").split(" / ");
    return { label, upright, reversed };
  });
  const yesNo = { upright: verdict(card.id, false), reversed: verdict(card.id, true) };

  if (card.arcana === "major") {
    const index = CARDS.indexOf(card);
    const [element, astrology] = MAJOR[index];
    return {
      type: "major arcana",
      element,
      astrology,
      number: `card ${index} of 21. majors mark the big themes of a life`,
      yesNo,
      symbols,
      areas,
    };
  }

  const suit = SUIT[card.suit!];
  const rank = card.id.split("-")[0];
  const position = RANKS.indexOf(rank);
  // Twos through tens each rule a ten-degree slice of a sign. Aces and court cards carry the whole suit.
  const astrology = position >= 1 && position <= 9 ? suit.decans[position - 1] : suit.signs;
  return {
    type: `suit of ${card.suit}`,
    element: suit.element,
    astrology,
    number: RANK_THEME[rank] ?? rank,
    yesNo,
    symbols,
    areas,
  };
}
