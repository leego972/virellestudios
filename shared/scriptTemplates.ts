/**
 * Hollywood Script Template Library
 * 7 genre templates with full three-act structure, beat sheets, and scene scaffolds.
 * Each template follows the industry-standard Save the Cat / McKee beat sheet framework.
 */

export interface ScriptBeat {
  name: string;
  pageRange: string; // e.g. "1-10" for a 90-page script
  percentRange: [number, number]; // 0-100 of total script
  description: string;
  scenePrompt: string; // Suggested scene content for AI generation
}

export interface ScriptCharacterSlot {
  role: string;
  description: string;
  arcSummary: string;
  voiceNotes: string;
}

export interface ScriptTemplate {
  id: string;
  genre: string;
  title: string;
  loglineTemplate: string;
  toneDescription: string;
  targetRuntime: string; // e.g. "90-110 min"
  targetPageCount: number;
  acts: {
    number: 1 | 2 | 3;
    title: string;
    pageRange: string;
    purpose: string;
    beats: ScriptBeat[];
  }[];
  characterSlots: ScriptCharacterSlot[];
  settingNotes: string;
  cinematicReferences: string[];
  writingGuidelines: string[];
  openingSceneScaffold: string;
  closingSceneScaffold: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// THRILLER
// ─────────────────────────────────────────────────────────────────────────────
const THRILLER: ScriptTemplate = {
  id: "thriller",
  genre: "Thriller",
  title: "Psychological Thriller",
  loglineTemplate:
    "When [PROTAGONIST], a [DESCRIPTION], discovers [INCITING DISCOVERY], they must [GOAL] before [ANTAGONIST THREAT] — or risk [ULTIMATE STAKES].",
  toneDescription:
    "Taut, paranoid, relentlessly tense. Every scene should raise the question: who can be trusted? Subtext is everything — characters rarely say what they mean. Silence and implication carry more weight than exposition.",
  targetRuntime: "95-115 min",
  targetPageCount: 105,
  acts: [
    {
      number: 1,
      title: "The Ordinary World Cracks",
      pageRange: "1-25",
      purpose:
        "Establish the protagonist's controlled, ordered world — then shatter it with an inciting incident that cannot be ignored.",
      beats: [
        {
          name: "Opening Image",
          pageRange: "1-3",
          percentRange: [0, 3],
          description:
            "A single image or sequence that encapsulates the protagonist's world and the film's central tension. Often a false sense of security.",
          scenePrompt:
            "Open on [PROTAGONIST] in their element — competent, in control, perhaps even smug. The world looks ordered. Introduce a visual motif (a clock, a locked door, a mirror) that will recur throughout the film.",
        },
        {
          name: "Setup & World",
          pageRange: "1-10",
          percentRange: [1, 10],
          description:
            "Establish who the protagonist is, what they want, what they fear, and what their fatal flaw is. Plant the seeds of the central mystery.",
          scenePrompt:
            "Show [PROTAGONIST] at work and at home. Reveal their competence and their blind spot. Drop a detail that seems minor but will matter enormously later.",
        },
        {
          name: "Inciting Incident",
          pageRange: "10-15",
          percentRange: [10, 15],
          description:
            "The event that disrupts the protagonist's world and sets the thriller in motion. Often a discovery, a death, or a threat.",
          scenePrompt:
            "[PROTAGONIST] discovers [THE THING THAT CANNOT BE UNSEEN]. It could be a body, a document, a surveillance photo, an overheard conversation. They now know something they were never meant to know.",
        },
        {
          name: "Debate & First Refusal",
          pageRange: "15-20",
          percentRange: [15, 20],
          description:
            "The protagonist tries to rationalize, dismiss, or hand off the problem. They don't want to be involved.",
          scenePrompt:
            "[PROTAGONIST] tries to convince themselves it's nothing. They go to someone they trust — a colleague, a superior, a friend — who either dismisses them or is revealed to be compromised.",
        },
        {
          name: "Break into Act Two",
          pageRange: "20-25",
          percentRange: [20, 25],
          description:
            "The protagonist is forced to commit. There is no going back. They cross the threshold into the dangerous world of the thriller.",
          scenePrompt:
            "Something happens that makes [PROTAGONIST] unable to walk away — a direct threat, the death of someone close, evidence that they are already implicated. They make a choice: they will pursue the truth.",
        },
      ],
    },
    {
      number: 2,
      title: "The Labyrinth",
      pageRange: "25-85",
      purpose:
        "The protagonist digs deeper, each answer revealing a more dangerous question. Allies become suspects. The truth is worse than imagined. The midpoint raises the stakes to maximum.",
      beats: [
        {
          name: "New World & New Rules",
          pageRange: "25-35",
          percentRange: [25, 35],
          description:
            "The protagonist enters the dangerous world. They find an unlikely ally and begin their investigation.",
          scenePrompt:
            "[PROTAGONIST] starts pulling threads. They encounter [ALLY/INFORMANT] who gives them their first real lead — but also their first warning of how dangerous this is.",
        },
        {
          name: "Fun & Games (Rising Tension)",
          pageRange: "35-50",
          percentRange: [35, 50],
          description:
            "The thriller's 'promise of the premise' — cat and mouse, close calls, revelations. Each discovery tightens the noose.",
          scenePrompt:
            "A sequence of escalating discoveries and near-misses. [PROTAGONIST] gets closer to the truth but also closer to being caught. The antagonist becomes aware of them.",
        },
        {
          name: "Midpoint — False Victory or False Defeat",
          pageRange: "50-55",
          percentRange: [50, 55],
          description:
            "The exact middle of the script. Either a false victory (protagonist thinks they've won — they haven't) or a public defeat that raises the stakes.",
          scenePrompt:
            "[PROTAGONIST] believes they have cracked it — or is publicly exposed/humiliated. Either way, the stakes double. The antagonist is now fully engaged.",
        },
        {
          name: "Bad Guys Close In",
          pageRange: "55-70",
          percentRange: [55, 70],
          description:
            "The protagonist's support structure collapses. Allies are revealed as compromised or killed. The protagonist is increasingly isolated.",
          scenePrompt:
            "One by one, [PROTAGONIST]'s resources are stripped away. A trusted ally betrays them or is eliminated. The antagonist tightens the trap.",
        },
        {
          name: "All Is Lost",
          pageRange: "70-75",
          percentRange: [70, 75],
          description:
            "The darkest moment. The protagonist has failed, is exposed, or has lost everything. The antagonist appears to have won.",
          scenePrompt:
            "[PROTAGONIST] is at their lowest point — arrested, discredited, hunted, or watching someone they care about suffer because of their actions. The antagonist's plan seems unstoppable.",
        },
        {
          name: "Dark Night of the Soul",
          pageRange: "75-80",
          percentRange: [75, 80],
          description:
            "The protagonist confronts their fatal flaw. They must change internally to find the external solution.",
          scenePrompt:
            "Alone and defeated, [PROTAGONIST] faces the truth about themselves — the flaw that got them here. A memory, a conversation, or a small discovery reframes everything. They find the key.",
        },
        {
          name: "Break into Act Three",
          pageRange: "80-85",
          percentRange: [80, 85],
          description:
            "The protagonist has a new plan — born from their internal transformation. They go on the offensive.",
          scenePrompt:
            "[PROTAGONIST] realizes what they've been missing all along. They make a bold, decisive move — the kind only possible because of what they've learned and who they've become.",
        },
      ],
    },
    {
      number: 3,
      title: "The Reckoning",
      pageRange: "85-105",
      purpose:
        "The final confrontation. Every planted seed pays off. The truth is revealed, the antagonist is exposed, and the protagonist's transformation is complete.",
      beats: [
        {
          name: "Finale — Storming the Castle",
          pageRange: "85-98",
          percentRange: [85, 98],
          description:
            "The protagonist executes their plan. Multiple reversals. The antagonist is more dangerous than expected.",
          scenePrompt:
            "[PROTAGONIST] confronts [ANTAGONIST] in the climactic location. The plan goes wrong in an unexpected way. [PROTAGONIST] must improvise, using their character flaw — now transformed into a strength — to win.",
        },
        {
          name: "Final Image",
          pageRange: "98-105",
          percentRange: [98, 100],
          description:
            "The mirror image of the opening — the same visual motif, but everything has changed.",
          scenePrompt:
            "Return to the visual motif from the opening. [PROTAGONIST] is in the same location or situation — but they are fundamentally different. The world is safer, or darker, or more complex than we thought.",
        },
      ],
    },
  ],
  characterSlots: [
    {
      role: "Protagonist",
      description:
        "Highly competent in their field but with a specific blind spot or flaw that makes them vulnerable to the thriller's trap.",
      arcSummary: "From controlled certainty → paranoid isolation → earned clarity",
      voiceNotes:
        "Precise, measured speech. Under pressure, sentences fragment. Rarely asks for help directly.",
    },
    {
      role: "Antagonist",
      description:
        "Intelligent, patient, and ideologically committed. Believes they are right. Never monologues — their menace is in what they don't say.",
      arcSummary: "Revealed gradually — first as ally, then as suspect, then as architect",
      voiceNotes:
        "Calm, reasonable, almost warm. The most dangerous lines are delivered quietly.",
    },
    {
      role: "Ally / Informant",
      description:
        "Provides the protagonist with crucial information but is compromised or in danger.",
      arcSummary: "Sacrificed or redeemed at the midpoint or All Is Lost beat",
      voiceNotes: "Nervous energy. Speaks in fragments. Knows more than they say.",
    },
    {
      role: "Red Herring / False Antagonist",
      description: "Appears to be the villain but is actually a victim or a distraction.",
      arcSummary: "Revealed as innocent or collateral damage",
      voiceNotes: "Defensive, evasive — but for understandable reasons.",
    },
  ],
  settingNotes:
    "Confined spaces amplify tension. Familiar locations made sinister — offices, homes, hospitals. Use geography as metaphor: the protagonist moves from open, public spaces toward increasingly claustrophobic, private ones.",
  cinematicReferences: [
    "The Conversation (1974)",
    "Chinatown (1974)",
    "No Country for Old Men (2007)",
    "Gone Girl (2014)",
    "Parasite (2019)",
    "Prisoners (2013)",
  ],
  writingGuidelines: [
    "Every scene must do two things: advance the plot AND reveal character.",
    "Plant every payoff at least 20 pages before you use it.",
    "The antagonist's plan must be logical — the audience should be able to reconstruct it after the reveal.",
    "Avoid exposition dumps. Reveal information through action and conflict.",
    "The protagonist's flaw must be the direct cause of their lowest point.",
    "Dialogue should have at least two levels: what is said and what is meant.",
    "Use scene headings to control pacing — short INT. scenes for tension, long EXT. sequences for release.",
  ],
  openingSceneScaffold: `FADE IN:

INT. [LOCATION] - [TIME OF DAY]

[DESCRIBE THE SPACE — ordered, controlled, perhaps sterile. A world that works by rules.]

[PROTAGONIST NAME] ([AGE], [BRIEF PHYSICAL DESCRIPTION]) [ACTION THAT ESTABLISHES WHO THEY ARE AND WHAT THEY DO].

[VISUAL MOTIF — a clock, a reflection, a locked door — introduced casually, as if it means nothing.]

[PROTAGONIST NAME]
(to themselves or on phone)
[A LINE THAT REVEALS THEIR WORLDVIEW — CONFIDENT, PERHAPS SLIGHTLY ARROGANT]

[A SMALL DETAIL that the audience will only understand later.]

SMASH CUT TO TITLE.`,

  closingSceneScaffold: `INT./EXT. [MIRROR LOCATION FROM OPENING] - [TIME OF DAY]

[THE SAME SPACE AS THE OPENING — but changed. Or the protagonist in the same position — but changed.]

[PROTAGONIST NAME] [ACTION THAT MIRRORS THE OPENING — but with new meaning].

[THE VISUAL MOTIF RETURNS — the clock, the reflection, the door — but now we understand what it means.]

[PROTAGONIST NAME]
(quietly, to themselves)
[A LINE THAT ANSWERS THE OPENING LINE — THE WORLDVIEW HAS SHIFTED]

[HOLD ON THE FINAL IMAGE.]

FADE TO BLACK.`,
};

// ─────────────────────────────────────────────────────────────────────────────
// DRAMA
// ─────────────────────────────────────────────────────────────────────────────
const DRAMA: ScriptTemplate = {
  id: "drama",
  genre: "Drama",
  title: "Character Drama",
  loglineTemplate:
    "When [PROTAGONIST], haunted by [WOUND/FLAW], is forced to confront [CENTRAL CONFLICT], they must choose between [FALSE BELIEF] and [TRUTH] — at the cost of [SACRIFICE].",
  toneDescription:
    "Intimate, honest, emotionally precise. Drama lives in the space between what characters say and what they feel. Every scene is a negotiation. Silence is as important as dialogue. The audience should feel they are witnessing something private.",
  targetRuntime: "100-120 min",
  targetPageCount: 110,
  acts: [
    {
      number: 1,
      title: "The Wound",
      pageRange: "1-27",
      purpose:
        "Establish the protagonist's emotional wound, their false belief about the world, and the relationships that will be tested.",
      beats: [
        {
          name: "Opening Image",
          pageRange: "1-3",
          percentRange: [0, 3],
          description: "The protagonist's emotional state made visual. Often a moment of stasis or suppression.",
          scenePrompt:
            "[PROTAGONIST] in a moment of quiet — but the quiet is not peace. Something is being held down. Establish the emotional temperature of the film.",
        },
        {
          name: "Theme Stated",
          pageRange: "5",
          percentRange: [5, 7],
          description:
            "Someone — not the protagonist — states the film's theme. The protagonist doesn't hear it, or dismisses it.",
          scenePrompt:
            "In a casual conversation, [SECONDARY CHARACTER] says something that is the heart of the film's theme. [PROTAGONIST] brushes it off.",
        },
        {
          name: "Setup — The False World",
          pageRange: "1-20",
          percentRange: [1, 20],
          description:
            "The protagonist's life as it is — functional but emotionally frozen. Establish key relationships and the wound beneath the surface.",
          scenePrompt:
            "Show [PROTAGONIST]'s daily life. The relationships that sustain them and the ones they are damaging. The wound is visible in how they interact — avoidance, control, deflection.",
        },
        {
          name: "Catalyst",
          pageRange: "20-25",
          percentRange: [20, 25],
          description:
            "An external event forces the protagonist to engage with what they have been avoiding.",
          scenePrompt:
            "[EVENT] — a death, an arrival, a letter, a diagnosis — forces [PROTAGONIST] to confront the thing they have been running from.",
        },
        {
          name: "Debate",
          pageRange: "23-27",
          percentRange: [23, 27],
          description: "The protagonist resists change. They try to handle this the old way.",
          scenePrompt:
            "[PROTAGONIST] attempts to manage the situation using their old coping mechanisms. It doesn't work. Someone close to them sees through it.",
        },
      ],
    },
    {
      number: 2,
      title: "The Reckoning",
      pageRange: "27-85",
      purpose:
        "The protagonist is forced into emotional territory they have avoided. Relationships are tested, the wound is exposed, and the false belief is challenged.",
      beats: [
        {
          name: "Break into Two",
          pageRange: "27-30",
          percentRange: [27, 30],
          description: "The protagonist makes a choice that commits them to change — or to resisting it.",
          scenePrompt:
            "[PROTAGONIST] makes a decision that takes them into new emotional territory. They don't know it yet, but this is the point of no return.",
        },
        {
          name: "B Story — The Mirror Relationship",
          pageRange: "30-35",
          percentRange: [30, 35],
          description:
            "A new relationship (or a deepening of an existing one) that will carry the theme and challenge the protagonist's false belief.",
          scenePrompt:
            "[PROTAGONIST] encounters or reconnects with [B STORY CHARACTER] — someone who embodies the truth the protagonist needs to learn. Their dynamic is immediately charged.",
        },
        {
          name: "Promise of the Premise",
          pageRange: "30-55",
          percentRange: [30, 55],
          description:
            "The emotional heart of the film. The protagonist and the people around them in the full complexity of their relationships.",
          scenePrompt:
            "A series of scenes that explore the central relationships at their most alive — moments of connection, conflict, tenderness, and damage.",
        },
        {
          name: "Midpoint",
          pageRange: "55",
          percentRange: [50, 55],
          description:
            "A moment of false victory or public humiliation that raises the emotional stakes.",
          scenePrompt:
            "[PROTAGONIST] experiences a moment of breakthrough — or a devastating public exposure of their wound. Either way, there is no going back to the old way.",
        },
        {
          name: "Bad Guys Close In — Internal",
          pageRange: "55-75",
          percentRange: [55, 75],
          description:
            "The protagonist's false belief reasserts itself. They sabotage their own progress. Relationships fracture.",
          scenePrompt:
            "[PROTAGONIST]'s old patterns return with a vengeance. They damage the relationship that matters most. The people who care about them pull away.",
        },
        {
          name: "All Is Lost",
          pageRange: "75-80",
          percentRange: [75, 80],
          description:
            "The protagonist has destroyed what they were trying to protect. The wound is fully exposed.",
          scenePrompt:
            "The worst possible version of [PROTAGONIST]'s fear has come true — not because of external forces, but because of their own choices. They are alone.",
        },
        {
          name: "Dark Night of the Soul",
          pageRange: "80-85",
          percentRange: [80, 85],
          description: "The protagonist confronts the truth about themselves.",
          scenePrompt:
            "Alone, [PROTAGONIST] finally sees themselves clearly. A memory, a conversation, or a small act of grace opens them up. They understand what they have to do.",
        },
      ],
    },
    {
      number: 3,
      title: "The Truth",
      pageRange: "85-110",
      purpose: "The protagonist acts from their new self. Relationships are repaired or honestly ended. The theme is embodied.",
      beats: [
        {
          name: "Break into Three",
          pageRange: "85-88",
          percentRange: [85, 88],
          description: "The protagonist makes a new choice — from their transformed self.",
          scenePrompt:
            "[PROTAGONIST] reaches out — to the person they hurt, to the situation they avoided, to the truth they denied. This time, they are different.",
        },
        {
          name: "Finale",
          pageRange: "88-105",
          percentRange: [88, 98],
          description:
            "The emotional climax. Not a battle but a conversation, a confession, a choice.",
          scenePrompt:
            "The central relationship reaches its climax. [PROTAGONIST] says or does the thing they could never say or do before. The other character responds honestly. It may not be the happy ending — but it is the true one.",
        },
        {
          name: "Final Image",
          pageRange: "105-110",
          percentRange: [98, 100],
          description: "The protagonist in a new emotional state — changed.",
          scenePrompt:
            "[PROTAGONIST] in a moment that mirrors the opening — but the emotional temperature is different. They are not the same person. The wound is not gone, but it is no longer in control.",
        },
      ],
    },
  ],
  characterSlots: [
    {
      role: "Protagonist",
      description: "Emotionally wounded, highly functional on the surface, running from a specific truth.",
      arcSummary: "From emotional avoidance → forced confrontation → earned vulnerability",
      voiceNotes: "Deflects with humor or competence. Speaks in incomplete sentences when emotional. Rarely says 'I love you' directly.",
    },
    {
      role: "Antagonist (Internal)",
      description: "Often not a villain but a person who holds up a mirror — a parent, an ex, a sibling.",
      arcSummary: "Reveals the protagonist's wound by embodying it or by refusing to enable it",
      voiceNotes: "Direct, sometimes brutal. Says the things the protagonist cannot.",
    },
    {
      role: "B Story Character",
      description: "The relationship that carries the theme. Often a love interest, a child, or a mentor.",
      arcSummary: "Offers the protagonist a glimpse of who they could be — then is pushed away",
      voiceNotes: "Open, present, emotionally honest. Contrast to the protagonist's guardedness.",
    },
  ],
  settingNotes:
    "Domestic spaces — kitchens, cars, hospital waiting rooms, childhood homes. The setting should feel lived-in and specific. Avoid generic locations. The geography of the film should map the protagonist's emotional journey.",
  cinematicReferences: [
    "Manchester by the Sea (2016)",
    "Marriage Story (2019)",
    "Ordinary People (1980)",
    "Moonlight (2016)",
    "The Descendants (2011)",
    "Aftersun (2022)",
  ],
  writingGuidelines: [
    "Every scene should have an emotional want (what the character needs) and a tactical want (what they say they want).",
    "The best drama scenes end differently than they begin — someone's position has shifted.",
    "Avoid on-the-nose dialogue. Characters should talk around what they mean.",
    "Physical action reveals character — what people do with their hands, their bodies, their eyes.",
    "The protagonist's wound should be established in the first 10 pages without being stated.",
    "The theme should be embodied in action, not stated in dialogue.",
  ],
  openingSceneScaffold: `FADE IN:

INT. [DOMESTIC SPACE — KITCHEN, BEDROOM, CAR] - [TIME OF DAY]

[DESCRIBE THE SPACE WITH EMOTIONAL SPECIFICITY — worn, comfortable, slightly neglected. A life being maintained rather than lived.]

[PROTAGONIST NAME] ([AGE]) [MUNDANE ACTION — making coffee, driving, folding laundry]. The kind of thing you do without thinking.

[A SMALL DETAIL that tells us everything about their emotional state — a photo face-down, a phone they don't answer, a habit that is clearly a coping mechanism.]

[SECONDARY CHARACTER]
(offhand, not knowing they're saying something important)
[THE THEME OF THE FILM, STATED CASUALLY]

[PROTAGONIST NAME]
(barely listening)
[DISMISSAL OR DEFLECTION]

[HOLD ON PROTAGONIST'S FACE — something flickers. They heard it.]`,

  closingSceneScaffold: `INT./EXT. [LOCATION — IDEALLY ECHOES THE OPENING] - [TIME OF DAY]

[PROTAGONIST NAME] [ACTION THAT MIRRORS THE OPENING — but the quality of attention is different].

[THE DETAIL FROM THE OPENING — the photo, the phone, the habit — is gone, or changed, or finally confronted.]

[BEAT OF SILENCE.]

[PROTAGONIST NAME] [A SMALL PHYSICAL ACTION THAT SAYS EVERYTHING — picks up the phone, turns the photo over, stops the habit].

FADE TO BLACK.`,
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTION
// ─────────────────────────────────────────────────────────────────────────────
const ACTION: ScriptTemplate = {
  id: "action",
  genre: "Action",
  title: "Action / Adventure",
  loglineTemplate:
    "When [PROTAGONIST], a [DESCRIPTION], is thrust into [INCITING CRISIS], they must [MISSION] against [ANTAGONIST FORCE] — with [STAKES] hanging in the balance.",
  toneDescription:
    "Propulsive, visceral, kinetic. Every scene should feel like it's moving. Action is character — how a person fights, runs, and survives tells us who they are. Humor releases tension between set pieces. The audience should be breathless.",
  targetRuntime: "110-130 min",
  targetPageCount: 120,
  acts: [
    {
      number: 1,
      title: "The Ordinary World",
      pageRange: "1-30",
      purpose: "Establish the hero's world, skills, and personal stakes before the mission begins.",
      beats: [
        {
          name: "Hook",
          pageRange: "1-5",
          percentRange: [0, 5],
          description: "An opening action sequence that establishes the hero's skills and the film's tone.",
          scenePrompt:
            "Open in the middle of an action sequence — [PROTAGONIST] completing a mission, escaping a situation, or demonstrating their core skill set. It should be exciting, slightly dangerous, and end with a moment of personality.",
        },
        {
          name: "Ordinary World",
          pageRange: "5-20",
          percentRange: [5, 20],
          description: "The hero's life between missions — what they're fighting for.",
          scenePrompt:
            "Show [PROTAGONIST] in their personal life — the relationship, the responsibility, the thing they love that makes them human. This is what they will risk.",
        },
        {
          name: "The Call",
          pageRange: "20-25",
          percentRange: [20, 25],
          description: "The mission is presented. The stakes are established.",
          scenePrompt:
            "[PROTAGONIST] receives the mission — or is thrust into the crisis without warning. The antagonist's threat is established. The personal stakes are clear.",
        },
        {
          name: "Commitment",
          pageRange: "25-30",
          percentRange: [25, 30],
          description: "The hero commits to the mission, often reluctantly.",
          scenePrompt:
            "[PROTAGONIST] accepts the mission — or is forced into it. They know what it will cost them personally. They go anyway.",
        },
      ],
    },
    {
      number: 2,
      title: "The Mission",
      pageRange: "30-90",
      purpose: "A series of escalating set pieces, each raising the stakes and testing the hero in new ways.",
      beats: [
        {
          name: "First Set Piece",
          pageRange: "30-45",
          percentRange: [30, 45],
          description: "The first major action sequence. The hero is competent but the enemy is formidable.",
          scenePrompt:
            "A major action sequence — chase, fight, infiltration — that establishes the antagonist's power. [PROTAGONIST] succeeds but at a cost.",
        },
        {
          name: "Midpoint — Raising the Stakes",
          pageRange: "55-65",
          percentRange: [55, 65],
          description: "The personal stakes become clear. The mission is more dangerous than expected.",
          scenePrompt:
            "The mission becomes personal. [PROTAGONIST] discovers that [PERSONAL CONNECTION TO THE STAKES]. The antagonist is revealed to be more powerful or more personal than expected.",
        },
        {
          name: "Second Set Piece — Failure",
          pageRange: "65-80",
          percentRange: [65, 80],
          description: "The hero's plan fails. They lose something important.",
          scenePrompt:
            "A set piece where [PROTAGONIST]'s plan goes wrong. They lose an ally, a resource, or suffer a personal defeat. The antagonist gains the upper hand.",
        },
        {
          name: "All Is Lost",
          pageRange: "80-85",
          percentRange: [80, 85],
          description: "The hero is defeated, captured, or stripped of their resources.",
          scenePrompt:
            "[PROTAGONIST] is at their lowest — captured, injured, or watching the antagonist's plan succeed. The personal stakes have been realized.",
        },
        {
          name: "Regrouping",
          pageRange: "85-90",
          percentRange: [85, 90],
          description: "The hero finds a new approach — often using their personal flaw as a strength.",
          scenePrompt:
            "[PROTAGONIST] reassesses. They find the key — often something personal, something the antagonist couldn't predict. They form a new plan.",
        },
      ],
    },
    {
      number: 3,
      title: "The Final Battle",
      pageRange: "90-120",
      purpose: "The climactic confrontation. Every skill established in Act One is used. Personal and mission stakes converge.",
      beats: [
        {
          name: "Storming the Castle",
          pageRange: "90-110",
          percentRange: [90, 95],
          description: "The final assault. Multiple set pieces converging on the climax.",
          scenePrompt:
            "[PROTAGONIST] executes the final plan. Multiple obstacles. The personal stakes are tested. The climax requires [PROTAGONIST] to use everything they've learned.",
        },
        {
          name: "Final Confrontation",
          pageRange: "108-115",
          percentRange: [95, 98],
          description: "Hero vs. antagonist, one on one.",
          scenePrompt:
            "[PROTAGONIST] faces [ANTAGONIST] directly. The fight is not just physical — it's ideological. [PROTAGONIST] wins not through superior force but through their personal transformation.",
        },
        {
          name: "Resolution",
          pageRange: "115-120",
          percentRange: [98, 100],
          description: "The personal stakes are resolved. The hero returns changed.",
          scenePrompt:
            "The mission is complete. [PROTAGONIST] returns to the personal relationship/responsibility established in Act One — but changed by what they've been through.",
        },
      ],
    },
  ],
  characterSlots: [
    {
      role: "Hero",
      description: "Exceptionally skilled, personally compromised. Their flaw is what makes them vulnerable.",
      arcSummary: "From lone wolf / broken → forced to trust / reconnect → earned victory",
      voiceNotes: "Economical. Dry humor under pressure. Speaks in commands and observations.",
    },
    {
      role: "Antagonist",
      description: "Believes they are right. Their plan is logical from their perspective. Physically or tactically superior.",
      arcSummary: "Revealed as the dark mirror of the hero — same skills, different values",
      voiceNotes: "Calm, almost philosophical. Explains their worldview without apology.",
    },
    {
      role: "Ally / Partner",
      description: "Provides skills the hero lacks. Often the emotional anchor.",
      arcSummary: "In danger at the All Is Lost moment — their survival motivates the finale",
      voiceNotes: "Warmer than the hero. Calls out the hero's emotional avoidance.",
    },
  ],
  settingNotes:
    "Varied, escalating environments — from familiar to exotic to hostile. Each set piece should feel distinct. The final confrontation should be in a location that has personal meaning.",
  cinematicReferences: [
    "Die Hard (1988)",
    "Mad Max: Fury Road (2015)",
    "Mission: Impossible — Fallout (2018)",
    "The Raid (2011)",
    "Heat (1995)",
    "John Wick (2014)",
  ],
  writingGuidelines: [
    "Action lines should be short — one to three lines max. White space is your friend.",
    "Every set piece should have a clear geography — the audience must always know where everyone is.",
    "Character is revealed in how they fight — not just whether they win.",
    "Plant every weapon, vehicle, and skill before you use it in the climax.",
    "The villain's plan must be logical and nearly succeed.",
    "Humor in action comes from character, not from jokes.",
  ],
  openingSceneScaffold: `FADE IN:

EXT. [LOCATION — EXOTIC, DANGEROUS, OR SPECIFIC] - [TIME OF DAY]

[ESTABLISH THE ENVIRONMENT IN TWO LINES — VISCERAL, SPECIFIC.]

[PROTAGONIST NAME] ([AGE], [BRIEF PHYSICAL DESCRIPTION — CAPABLE, ALERT]) moves through the space with [QUALITY OF MOVEMENT — PRECISION, SPEED, CONTROLLED DANGER].

[ACTION SEQUENCE BEGINS — DESCRIBE IN SHORT, PUNCHY LINES. ONE ACTION PER LINE.]

[PROTAGONIST NAME] [ACTION].

[REACTION FROM ENVIRONMENT/ENEMY.]

[PROTAGONIST NAME] [COUNTER-ACTION].

[BEAT — A MOMENT OF PERSONALITY. A QUIP, A LOOK, A CHOICE THAT TELLS US WHO THEY ARE.]

SMASH CUT TO TITLE.`,

  closingSceneScaffold: `EXT./INT. [PERSONAL LOCATION — HOME, A MEANINGFUL PLACE] - [TIME OF DAY]

The mission is over. [PROTAGONIST NAME] [RETURNS TO / ARRIVES AT] [THE PERSONAL THING THEY WERE FIGHTING FOR].

[THE RELATIONSHIP/RESPONSIBILITY FROM ACT ONE — resolved, honestly.]

[PROTAGONIST NAME]
(quietly)
[A LINE THAT SHOWS THEY HAVE CHANGED — OR CHOSEN NOT TO]

[THE OTHER PERSON / THE PLACE / THE THING responds.]

[PROTAGONIST NAME] [A SMALL PHYSICAL ACTION — PUTS DOWN THE WEAPON, PICKS UP THE CHILD, OPENS THE DOOR].

FADE TO BLACK.`,
};

// ─────────────────────────────────────────────────────────────────────────────
// HORROR
// ─────────────────────────────────────────────────────────────────────────────
const HORROR: ScriptTemplate = {
  id: "horror",
  genre: "Horror",
  title: "Horror",
  loglineTemplate:
    "When [PROTAGONIST] arrives at [LOCATION], they discover [SUPERNATURAL/PSYCHOLOGICAL THREAT] — and must survive [ESCALATING HORROR] while confronting [PERSONAL FEAR] that the horror embodies.",
  toneDescription:
    "Dread before fear. The best horror is about what you don't see. Every scene should build unease. The monster — whether supernatural or psychological — should embody a specific human fear. The audience should be afraid for the characters because they care about them.",
  targetRuntime: "90-100 min",
  targetPageCount: 95,
  acts: [
    {
      number: 1,
      title: "The Arrival",
      pageRange: "1-24",
      purpose: "Establish the characters, the location, and the first signs of wrongness.",
      beats: [
        {
          name: "False Normalcy",
          pageRange: "1-8",
          percentRange: [0, 8],
          description: "The world before the horror. Establish characters and their relationships.",
          scenePrompt:
            "[PROTAGONIST] arrives at [LOCATION] with [COMPANIONS/FAMILY]. Everything seems fine — but something is slightly off. A detail that the audience notices but the characters don't.",
        },
        {
          name: "First Signs",
          pageRange: "8-18",
          percentRange: [8, 18],
          description: "The first signs of the horror — easily explained away.",
          scenePrompt:
            "Something happens that could be explained rationally — a sound, a shadow, an animal behaving strangely. The characters rationalize it. The audience knows better.",
        },
        {
          name: "The Warning Ignored",
          pageRange: "18-24",
          percentRange: [18, 24],
          description: "Someone warns the protagonist. They don't listen.",
          scenePrompt:
            "[LOCAL CHARACTER / EXPOSITION FIGURE] warns [PROTAGONIST] about [THE HORROR]. They are dismissed as superstitious or crazy. The protagonist has a rational explanation.",
        },
      ],
    },
    {
      number: 2,
      title: "The Descent",
      pageRange: "24-72",
      purpose: "The horror escalates. Characters are isolated and picked off. The protagonist's personal fear is mirrored in the horror.",
      beats: [
        {
          name: "First Real Scare",
          pageRange: "24-32",
          percentRange: [24, 32],
          description: "The horror is undeniable. Someone is hurt or killed.",
          scenePrompt:
            "The first undeniable horror event. [FIRST VICTIM / FIRST REAL ENCOUNTER]. The rules of the horror are partially revealed.",
        },
        {
          name: "Investigation",
          pageRange: "32-48",
          percentRange: [32, 48],
          description: "The protagonist tries to understand the horror. The mythology is revealed.",
          scenePrompt:
            "[PROTAGONIST] investigates — discovers the history of [LOCATION/ENTITY]. The horror has a logic. It is connected to [PROTAGONIST]'s personal fear or wound.",
        },
        {
          name: "Midpoint — The Rules Change",
          pageRange: "48",
          percentRange: [48, 52],
          description: "The protagonist's plan to survive is revealed to be insufficient.",
          scenePrompt:
            "What [PROTAGONIST] thought would protect them doesn't work — or works in an unexpected way. The horror is more personal than they realized.",
        },
        {
          name: "Escalation — Isolation",
          pageRange: "48-65",
          percentRange: [48, 65],
          description: "Characters are isolated. The group fractures. The horror picks them off.",
          scenePrompt:
            "The group is separated. [PROTAGONIST] is increasingly alone. The horror targets the personal fear — it knows what they're afraid of.",
        },
        {
          name: "All Is Lost",
          pageRange: "65-72",
          percentRange: [65, 72],
          description: "The protagonist is alone, the horror is at its most powerful.",
          scenePrompt:
            "[PROTAGONIST] is alone. The horror has won — or seems to have. The personal fear is fully exposed. They must face it to survive.",
        },
      ],
    },
    {
      number: 3,
      title: "The Confrontation",
      pageRange: "72-95",
      purpose: "The protagonist confronts the horror on its own terms — and survives by confronting their personal fear.",
      beats: [
        {
          name: "The New Plan",
          pageRange: "72-78",
          percentRange: [72, 78],
          description: "The protagonist finds the key to defeating the horror.",
          scenePrompt:
            "[PROTAGONIST] understands the horror's logic. They find the weakness — often connected to the personal fear they've been running from.",
        },
        {
          name: "Final Confrontation",
          pageRange: "78-90",
          percentRange: [78, 95],
          description: "The protagonist faces the horror directly.",
          scenePrompt:
            "[PROTAGONIST] confronts [THE HORROR] in its lair or at its most powerful. They use what they've learned — and what they've faced about themselves — to survive.",
        },
        {
          name: "Aftermath",
          pageRange: "90-95",
          percentRange: [95, 100],
          description: "Survival — but at a cost. The horror may not be entirely gone.",
          scenePrompt:
            "[PROTAGONIST] survives. But the experience has changed them. A final image suggests the horror may not be entirely defeated — or that the protagonist carries it with them.",
        },
      ],
    },
  ],
  characterSlots: [
    {
      role: "Protagonist",
      description: "Carrying a specific personal fear or wound that the horror will embody and exploit.",
      arcSummary: "From denial of personal fear → forced confrontation → survival through acceptance",
      voiceNotes: "Rational, skeptical initially. Voice changes under stress — shorter sentences, more direct.",
    },
    {
      role: "The Skeptic",
      description: "Refuses to believe in the horror longest — often the first to die or the one who gets others killed.",
      arcSummary: "Rationalism as fatal flaw",
      voiceNotes: "Dismissive, explanatory. Talks too much when nervous.",
    },
    {
      role: "The Believer",
      description: "Understands the horror intuitively — often dismissed, often right.",
      arcSummary: "Vindicated but at great cost",
      voiceNotes: "Quiet, watchful. Speaks in warnings and observations.",
    },
  ],
  settingNotes:
    "Isolated, specific, with a history. The location should feel like a character. Establish the geography clearly so the audience always knows where everyone is — and what the horror can reach.",
  cinematicReferences: [
    "The Shining (1980)",
    "Hereditary (2018)",
    "Get Out (2017)",
    "The Witch (2015)",
    "Midsommar (2019)",
    "A Quiet Place (2018)",
  ],
  writingGuidelines: [
    "Dread is built through anticipation, not revelation. What you don't show is scarier than what you do.",
    "Every character who dies should be mourned — the audience must care before they fear.",
    "The horror's rules must be consistent. Establish them clearly so violations feel earned.",
    "Sound design is written in the script — silence is as important as screams.",
    "The personal fear should be established before the horror arrives.",
    "The ending should be earned — the protagonist survives because of who they are, not luck.",
  ],
  openingSceneScaffold: `FADE IN:

EXT. [ISOLATED LOCATION — ROAD, FOREST, COASTLINE] - [TIME OF DAY — OFTEN DUSK OR OVERCAST]

[ESTABLISH THE ISOLATION. THE BEAUTY THAT CONCEALS SOMETHING WRONG.]

[PROTAGONIST NAME] ([AGE]) [ARRIVES — BY CAR, ON FOOT, BY BOAT]. They look at the [LOCATION] with [EMOTION — HOPE, APPREHENSION, FORCED OPTIMISM].

[A DETAIL THAT IS WRONG — but easily explained away. An animal watching. A door that should be locked, open. A smell.]

[PROTAGONIST NAME]
(to companion or to themselves)
[A LINE THAT ESTABLISHES THEIR REASON FOR BEING HERE — AND THEIR PERSONAL VULNERABILITY]

[THEY ENTER. THE DOOR CLOSES BEHIND THEM.]`,

  closingSceneScaffold: `EXT. [OUTSIDE THE HORROR LOCATION] - [DAWN OR HARSH DAYLIGHT]

[PROTAGONIST NAME] [EMERGES / ESCAPES / SURVIVES]. Bloodied, exhausted, changed.

[THE HORROR LOCATION BEHIND THEM — silent now. Or is it?]

[PROTAGONIST NAME] [A PHYSICAL ACTION THAT SHOWS THEY HAVE SURVIVED — BUT NOT UNSCATHED].

[BEAT.]

[A FINAL
 DETAIL THAT SUGGESTS THE HORROR IS NOT ENTIRELY GONE — OR THAT [PROTAGONIST] CARRIES IT WITH THEM.]

FADE TO BLACK.`,
};

// ─────────────────────────────────────────────────────────────────────────────
// COMEDY
// ─────────────────────────────────────────────────────────────────────────────
const COMEDY: ScriptTemplate = {
  id: "comedy",
  genre: "Comedy",
  title: "Comedy",
  loglineTemplate:
    "When [PROTAGONIST], a [DESCRIPTION WITH COMIC FLAW], is forced into [COMIC PREMISE/SITUATION], they must [GOAL] — while learning that [THEMATIC TRUTH] is more important than [WHAT THEY THOUGHT THEY WANTED].",
  toneDescription:
    "Warm, specific, character-driven. The best comedy comes from character — from people being exactly who they are in situations that expose them. Every joke should be rooted in truth. The audience laughs because they recognize something real.",
  targetRuntime: "95-105 min",
  targetPageCount: 100,
  acts: [
    {
      number: 1,
      title: "The Setup",
      pageRange: "1-25",
      purpose: "Establish the comic world, the protagonist's flaw, and the premise that will drive the comedy.",
      beats: [
        {
          name: "Comic World",
          pageRange: "1-10",
          percentRange: [0, 10],
          description: "Establish the world and its comic rules. The protagonist's flaw is on full display.",
          scenePrompt:
            "[PROTAGONIST] in their element — their flaw is charming and funny here, but we can see how it will cause problems. The world has a specific comic logic.",
        },
        {
          name: "The Inciting Premise",
          pageRange: "10-17",
          percentRange: [10, 17],
          description: "The comic premise is established. The situation that will expose the protagonist's flaw.",
          scenePrompt:
            "[THE COMIC SITUATION BEGINS] — [PROTAGONIST] is thrust into a situation where their flaw is both their greatest asset and their biggest liability.",
        },
        {
          name: "Commitment to the Premise",
          pageRange: "17-25",
          percentRange: [17, 25],
          description: "The protagonist commits to the comic situation, often for the wrong reasons.",
          scenePrompt:
            "[PROTAGONIST] decides to [COMMIT TO THE COMIC PREMISE] — for reasons that make perfect sense to them and are clearly going to backfire.",
        },
      ],
    },
    {
      number: 2,
      title: "Complications",
      pageRange: "25-75",
      purpose: "The comic premise generates escalating complications. The protagonist's flaw creates increasingly absurd situations.",
      beats: [
        {
          name: "Fun & Games",
          pageRange: "25-50",
          percentRange: [25, 50],
          description: "The comedy of the premise — the audience is getting what they came for.",
          scenePrompt:
            "A series of comic set pieces where [PROTAGONIST]'s flaw and the premise collide in increasingly funny ways. Each scene escalates.",
        },
        {
          name: "Midpoint — Emotional Stakes",
          pageRange: "50",
          percentRange: [48, 52],
          description: "The comedy gets real. The protagonist's flaw is hurting someone they care about.",
          scenePrompt:
            "The comedy becomes personal. [PROTAGONIST]'s flaw has damaged [RELATIONSHIP/OPPORTUNITY]. They realize they want something real — not just what they thought they wanted.",
        },
        {
          name: "Complications Escalate",
          pageRange: "50-68",
          percentRange: [50, 68],
          description: "The lies/mistakes compound. Everything is about to collapse.",
          scenePrompt:
            "The comic situation spirals. Every attempt to fix it makes it worse. [PROTAGONIST] is juggling too many balls.",
        },
        {
          name: "All Is Lost — The Reveal",
          pageRange: "68-75",
          percentRange: [68, 75],
          description: "Everything comes out. The protagonist's deception/flaw is exposed.",
          scenePrompt:
            "The truth comes out in the worst possible way. [PROTAGONIST] loses everything they've been trying to protect. The person they care about is hurt.",
        },
      ],
    },
    {
      number: 3,
      title: "The Resolution",
      pageRange: "75-100",
      purpose: "The protagonist earns the happy ending by changing — not by getting lucky.",
      beats: [
        {
          name: "Grand Gesture",
          pageRange: "75-90",
          percentRange: [75, 90],
          description: "The protagonist makes a genuine, vulnerable gesture — without the comic armor.",
          scenePrompt:
            "[PROTAGONIST] makes a grand gesture — but this time, it's real. No tricks, no schemes. They are genuinely themselves, genuinely vulnerable.",
        },
        {
          name: "Resolution",
          pageRange: "90-100",
          percentRange: [90, 100],
          description: "The comic world is restored — but better. The protagonist has changed.",
          scenePrompt:
            "The situation resolves. [PROTAGONIST] gets what they actually needed — not what they thought they wanted. The comic world is restored, but with new understanding.",
        },
      ],
    },
  ],
  characterSlots: [
    {
      role: "Protagonist",
      description: "A specific, lovable flaw that drives the comedy and needs to be overcome.",
      arcSummary: "From comic flaw as identity → flaw exposed as defense mechanism → genuine vulnerability",
      voiceNotes: "Fast, specific, self-aware but not self-knowing. Their humor is their shield.",
    },
    {
      role: "Love Interest / Foil",
      description: "The person who sees through the protagonist's comic armor.",
      arcSummary: "Charmed, then hurt, then won back honestly",
      voiceNotes: "Dry, direct. Not fooled by the protagonist's act.",
    },
    {
      role: "Comic Sidekick",
      description: "Amplifies the protagonist's flaw and provides comic escalation.",
      arcSummary: "Unwitting accomplice who somehow always makes things worse",
      voiceNotes: "Enthusiastic, slightly oblivious. Commits fully to bad ideas.",
    },
  ],
  settingNotes: "Specific, recognizable worlds — workplaces, families, communities. The comedy should feel grounded in a real place with real rules.",
  cinematicReferences: [
    "Some Like It Hot (1959)",
    "The 40-Year-Old Virgin (2005)",
    "Bridesmaids (2011)",
    "About Time (2013)",
    "Game Night (2018)",
    "Superbad (2007)",
  ],
  writingGuidelines: [
    "Comedy is tragedy plus time — the funniest scenes are also the most painful.",
    "Specificity is funnier than generality. 'A 1997 Honda Civic' is funnier than 'a car'.",
    "The rule of three — set up a pattern twice, break it the third time.",
    "Never explain the joke. If you have to explain it, cut it.",
    "The protagonist must earn the happy ending — luck is not funny.",
    "Callbacks — plant jokes early and pay them off late.",
  ],
  openingSceneScaffold: `FADE IN:

INT. [SPECIFIC, RECOGNIZABLE LOCATION] - [TIME OF DAY]

[ESTABLISH THE WORLD IN ITS COMIC SPECIFICITY — the details that make it funny and real.]

[PROTAGONIST NAME] ([AGE], [BRIEF DESCRIPTION THAT HINTS AT THE FLAW]) [ACTION THAT IMMEDIATELY DEMONSTRATES THEIR COMIC FLAW].

[SECONDARY CHARACTER]
[A REACTION THAT TELLS US THIS IS NORMAL FOR [PROTAGONIST NAME]]

[PROTAGONIST NAME]
[A LINE THAT IS FUNNY BECAUSE IT IS COMPLETELY SINCERE — THEY HAVE NO IDEA HOW THEY COME ACROSS]

[ESTABLISH THE WORLD, THE FLAW, AND THE STAKES IN THE FIRST PAGE. THE AUDIENCE SHOULD BE LAUGHING AND ROOTING FOR THEM SIMULTANEOUSLY.]`,

  closingSceneScaffold: `INT./EXT. [LOCATION — IDEALLY ECHOES THE OPENING] - [TIME OF DAY]

[PROTAGONIST NAME] [ACTION THAT MIRRORS THE OPENING — but without the comic armor. They are genuinely themselves.]

[THE PERSON / THING THEY CARE ABOUT responds to the real them.]

[PROTAGONIST NAME]
(no longer performing — just honest)
[A LINE THAT IS FUNNY BECAUSE IT IS TRUE, NOT BECAUSE IT IS A JOKE]

[THE WORLD RESPONDS. THE COMIC LOGIC IS RESTORED — BUT BETTER.]

FADE OUT.`,
};

// ─────────────────────────────────────────────────────────────────────────────
// SCI-FI
// ─────────────────────────────────────────────────────────────────────────────
const SCIFI: ScriptTemplate = {
  id: "sci-fi",
  genre: "Sci-Fi",
  title: "Science Fiction",
  loglineTemplate:
    "In a world where [SPECULATIVE PREMISE], [PROTAGONIST] must [MISSION/GOAL] — while grappling with [PHILOSOPHICAL QUESTION] that the premise forces them to confront.",
  toneDescription:
    "Ideas made visceral. The best science fiction uses the speculative premise to explore a specific human question. The world-building should feel inevitable — as if this is exactly how things would develop. The emotional story must be as strong as the concept.",
  targetRuntime: "110-130 min",
  targetPageCount: 120,
  acts: [
    {
      number: 1,
      title: "The World",
      pageRange: "1-30",
      purpose: "Establish the speculative world through action and character, not exposition. The philosophical question is embedded in the premise.",
      beats: [
        {
          name: "World Establishment",
          pageRange: "1-15",
          percentRange: [0, 15],
          description: "The speculative world revealed through character behavior, not narration.",
          scenePrompt:
            "Open in the speculative world — show how people live in it, what's normal, what's different. [PROTAGONIST] navigating their world reveals the rules without explaining them.",
        },
        {
          name: "The Question",
          pageRange: "10-20",
          percentRange: [10, 20],
          description: "The philosophical question at the heart of the film is introduced.",
          scenePrompt:
            "A scene or situation that poses the central question — about identity, consciousness, humanity, power, time — without answering it.",
        },
        {
          name: "The Inciting Event",
          pageRange: "20-30",
          percentRange: [20, 30],
          description: "The event that forces the protagonist into the story.",
          scenePrompt:
            "[PROTAGONIST] is confronted with [THE EVENT] that makes the philosophical question personal and urgent.",
        },
      ],
    },
    {
      number: 2,
      title: "The Exploration",
      pageRange: "30-90",
      purpose: "The protagonist explores the implications of the premise. The philosophical question deepens. The world reveals its complexity.",
      beats: [
        {
          name: "Into the New World",
          pageRange: "30-50",
          percentRange: [30, 50],
          description: "The protagonist navigates the speculative world with new eyes.",
          scenePrompt:
            "[PROTAGONIST] discovers the full implications of [THE PREMISE]. What seemed like a solution reveals new problems. The world is more complex than it appeared.",
        },
        {
          name: "Midpoint — The Revelation",
          pageRange: "55-65",
          percentRange: [55, 65],
          description: "A revelation that reframes everything — the world is not what it seemed.",
          scenePrompt:
            "A major revelation about [THE WORLD / THE PREMISE / THE ANTAGONIST] that forces [PROTAGONIST] to reconsider everything. The philosophical question becomes personal.",
        },
        {
          name: "The Cost",
          pageRange: "65-80",
          percentRange: [65, 80],
          description: "The protagonist discovers the true cost of the premise.",
          scenePrompt:
            "The speculative premise extracts its price. [PROTAGONIST] loses something or someone because of the world they're in. The philosophical question has a personal answer now.",
        },
        {
          name: "All Is Lost",
          pageRange: "80-88",
          percentRange: [80, 88],
          description: "The protagonist's plan has failed. The world's logic seems to have won.",
          scenePrompt:
            "[PROTAGONIST] is defeated — by the system, the antagonist, or the logic of the world itself. The philosophical question seems to have a terrible answer.",
        },
      ],
    },
    {
      number: 3,
      title: "The Answer",
      pageRange: "90-120",
      purpose: "The protagonist finds a human answer to the philosophical question. The climax is both action and idea.",
      beats: [
        {
          name: "The Human Solution",
          pageRange: "90-100",
          percentRange: [90, 95],
          description: "The protagonist finds an answer that the system/antagonist couldn't predict — because it's human.",
          scenePrompt:
            "[PROTAGONIST] finds the solution — it comes from their humanity, their relationships, their values. The speculative world's logic cannot account for it.",
        },
        {
          name: "Climax",
          pageRange: "100-115",
          percentRange: [95, 98],
          description: "The philosophical question is answered in action.",
          scenePrompt:
            "The climax is both a physical confrontation and an answer to the film's central question. [PROTAGONIST]'s choice embodies the theme.",
        },
        {
          name: "New World",
          pageRange: "115-120",
          percentRange: [98, 100],
          description: "The world after — changed by the protagonist's choice.",
          scenePrompt:
            "The world after [PROTAGONIST]'s choice. It may not be utopia — but it is more honest. The philosophical question has been answered, even if imperfectly.",
        },
      ],
    },
  ],
  characterSlots: [
    {
      role: "Protagonist",
      description: "A person whose humanity is tested by the speculative premise.",
      arcSummary: "From certainty about [PHILOSOPHICAL POSITION] → doubt → earned conviction",
      voiceNotes: "Curious, analytical, but with a specific emotional wound. Asks questions others don't.",
    },
    {
      role: "Antagonist / System",
      description: "Often the logic of the world itself — a corporation, an AI, a government, a philosophy taken to its conclusion.",
      arcSummary: "Represents the dehumanizing answer to the philosophical question",
      voiceNotes: "Rational, persuasive, genuinely believes they are right. The scariest antagonists make sense.",
    },
    {
      role: "The Human Anchor",
      description: "The relationship that keeps the protagonist connected to their humanity.",
      arcSummary: "At risk because of the premise — their survival is the emotional stakes",
      voiceNotes: "Warm, specific, grounded. Speaks in concrete terms about real things.",
    },
  ],
  settingNotes:
    "The world should feel inevitable — as if this is exactly how things would develop from our present. Avoid generic 'sci-fi aesthetics'. Make the technology feel used, lived-in, and specific to the world's logic.",
  cinematicReferences: [
    "Blade Runner 2049 (2017)",
    "Arrival (2016)",
    "Ex Machina (2014)",
    "Children of Men (2006)",
    "Interstellar (2014)",
    "Moon (2009)",
  ],
  writingGuidelines: [
    "The speculative premise must be internally consistent — establish the rules and follow them.",
    "World-building through behavior, not exposition. Show how people live in this world.",
    "The philosophical question must be personal to the protagonist — not just abstract.",
    "Technology should have costs and limitations — nothing is free.",
    "The emotional story must be able to stand without the sci-fi premise.",
    "The ending should answer the philosophical question — even if the answer is complicated.",
  ],
  openingSceneScaffold: `FADE IN:

[INT./EXT.] [SPECULATIVE LOCATION — ESTABLISH THE WORLD IN ITS SPECIFICITY] - [TIME OF DAY]

[THE WORLD IS REVEALED THROUGH DETAIL — not narration. What do people wear? How do they move? What technology is present, and how do they interact with it as if it's normal?]

[PROTAGONIST NAME] ([AGE], [BRIEF DESCRIPTION]) [ACTION THAT IS NORMAL IN THIS WORLD BUT STRANGE TO US — establishes the premise without explaining it].

[A SMALL HUMAN MOMENT — something universal, something that grounds us in the character despite the strangeness of the world.]

[PROTAGONIST NAME]
[A LINE THAT REVEALS THEIR RELATIONSHIP TO THE WORLD'S CENTRAL QUESTION]`,

  closingSceneScaffold: `[INT./EXT.] [LOCATION — THE WORLD AFTER THE PROTAGONIST'S CHOICE] - [TIME OF DAY]

[THE WORLD HAS CHANGED — or the protagonist has changed within it. Show the difference through detail, not narration.]

[PROTAGONIST NAME] [ACTION THAT MIRRORS THE OPENING — but with new understanding].

[THE PHILOSOPHICAL QUESTION IS ANSWERED IN ACTION — not in dialogue.]

[A FINAL IMAGE THAT HOLDS THE COMPLEXITY OF THE ANSWER — it is not simple, but it is true.]

FADE TO BLACK.`,
};

// ─────────────────────────────────────────────────────────────────────────────
// ROMANCE
// ─────────────────────────────────────────────────────────────────────────────
const ROMANCE: ScriptTemplate = {
  id: "romance",
  genre: "Romance",
  title: "Romance",
  loglineTemplate:
    "When [PROTAGONIST], guarded by [WOUND/BELIEF], meets [LOVE INTEREST] — the wrong person at the wrong time — they must choose between [SAFETY] and [LOVE] before [EXTERNAL DEADLINE] forces them apart.",
  toneDescription:
    "Intimate, specific, emotionally honest. Romance is not about grand gestures — it's about the small moments of recognition between two people. The chemistry must be earned through conflict and vulnerability, not manufactured through proximity.",
  targetRuntime: "100-115 min",
  targetPageCount: 108,
  acts: [
    {
      number: 1,
      title: "The Meeting",
      pageRange: "1-27",
      purpose: "Establish both characters, their wounds, and the charged first encounter.",
      beats: [
        {
          name: "Protagonist's World",
          pageRange: "1-12",
          percentRange: [0, 12],
          description: "The protagonist's life without love — functional but incomplete.",
          scenePrompt:
            "[PROTAGONIST] in their world — competent, perhaps happy on the surface, but with a specific emotional absence. The wound that makes them guarded is visible in how they interact.",
        },
        {
          name: "The Meet",
          pageRange: "12-20",
          percentRange: [12, 20],
          description: "The first encounter — charged, possibly antagonistic, definitely memorable.",
          scenePrompt:
            "[PROTAGONIST] meets [LOVE INTEREST] in circumstances that are charged — a conflict, a misunderstanding, an unexpected connection. There is immediate chemistry, even if it presents as friction.",
        },
        {
          name: "The Complication",
          pageRange: "20-27",
          percentRange: [20, 27],
          description: "The reason they can't be together — established clearly.",
          scenePrompt:
            "The obstacle is established — external (they're rivals, they live in different cities, one is leaving) or internal (one or both is guarded, committed elsewhere, afraid). The audience sees both the chemistry and the impossibility.",
        },
      ],
    },
    {
      number: 2,
      title: "The Courtship",
      pageRange: "27-81",
      purpose: "The relationship develops through conflict and connection. The walls come down slowly, then all at once.",
      beats: [
        {
          name: "Forced Proximity",
          pageRange: "27-40",
          percentRange: [27, 40],
          description: "Circumstances force them together despite the complication.",
          scenePrompt:
            "[PROTAGONIST] and [LOVE INTEREST] are thrown together by circumstance — they must work together, live together, or navigate the same situation. The chemistry builds through conflict.",
        },
        {
          name: "The First Wall Down",
          pageRange: "40-54",
          percentRange: [40, 54],
          description: "A moment of genuine vulnerability — one character lets the other in.",
          scenePrompt:
            "A quiet scene — not a grand gesture — where [PROTAGONIST] or [LOVE INTEREST] reveals something true about themselves. The other person responds with unexpected tenderness.",
        },
        {
          name: "Midpoint — The Almost",
          pageRange: "54",
          percentRange: [50, 54],
          description: "A near-kiss, a near-declaration, a moment of almost.",
          scenePrompt:
            "The moment they almost cross the line — and don't. Or do, briefly, and then pull back. The tension is at its peak. The audience is screaming.",
        },
        {
          name: "The Relationship Deepens",
          pageRange: "54-68",
          percentRange: [54, 68],
          description: "They are falling in love — shown in small, specific moments.",
          scenePrompt:
            "A montage of small moments — not grand gestures. The specific things that make [LOVE INTEREST] unlike anyone [PROTAGONIST] has known. The audience falls in love with them too.",
        },
        {
          name: "The Break",
          pageRange: "68-75",
          percentRange: [68, 75],
          description: "The wound/complication drives them apart. The protagonist's fear wins.",
          scenePrompt:
            "The wound reasserts itself. [PROTAGONIST] pushes [LOVE INTEREST] away — or the external complication forces them apart. The break should feel inevitable and heartbreaking.",
        },
        {
          name: "All Is Lost",
          pageRange: "75-81",
          percentRange: [75, 81],
          description: "Alone, the protagonist realizes what they've lost.",
          scenePrompt:
            "[PROTAGONIST] alone — and for the first time, they feel the absence. Not just of [LOVE INTEREST] but of the version of themselves that existed with them.",
        },
      ],
    },
    {
      number: 3,
      title: "The Choice",
      pageRange: "81-108",
      purpose: "The protagonist chooses love over safety — not because it's easy, but because they've changed.",
      beats: [
        {
          name: "The Decision",
          pageRange: "81-90",
          percentRange: [81, 90],
          description: "The protagonist decides to fight for the relationship.",
          scenePrompt:
            "[PROTAGONIST] makes the decision — not a grand gesture yet, but an internal shift. They understand what they want and what it will cost them.",
        },
        {
          name: "The Grand Gesture",
          pageRange: "90-100",
          percentRange: [90, 95],
          description: "The protagonist acts — publicly, vulnerably, without guarantee of success.",
          scenePrompt:
            "[PROTAGONIST] makes their move — it should be specific to who they are and who [LOVE INTEREST] is. Not a generic romantic gesture, but the exact right thing for these two people.",
        },
        {
          name: "Resolution",
          pageRange: "100-108",
          percentRange: [95, 100],
          description: "The honest ending — earned, not manufactured.",
          scenePrompt:
            "[LOVE INTEREST] responds. The ending should feel earned — not because everything is perfect, but because these two people have chosen each other honestly.",
        },
      ],
    },
  ],
  characterSlots: [
    {
      role: "Protagonist",
      description: "Guarded by a specific wound. Competent in every area of life except love.",
      arcSummary: "From self-protection → vulnerability → chosen love",
      voiceNotes: "Witty, deflects with humor. When genuinely moved, goes quiet.",
    },
    {
      role: "Love Interest",
      description: "The specific person who can reach the protagonist — not despite their wound, but because of it.",
      arcSummary: "Patient, then hurt, then won honestly",
      voiceNotes: "Direct, warm, specific. Says what they mean. Calls out the protagonist's deflections.",
    },
    {
      role: "The Best Friend",
      description: "Provides perspective, comic relief, and the push the protagonist needs.",
      arcSummary: "Sees the love interest's worth before the protagonist does",
      voiceNotes: "Honest to the point of bluntness. The voice of the audience.",
    },
  ],
  settingNotes:
    "Specific, lived-in locations that reflect the characters' inner lives. The city, the neighborhood, the coffee shop — these should feel like characters. The final scene location should have personal meaning to both characters.",
  cinematicReferences: [
    "When Harry Met Sally (1989)",
    "Before Sunrise (1995)",
    "Eternal Sunshine of the Spotless Mind (2004)",
    "Normal People (2020)",
    "The Notebook (2004)",
    "Portrait of a Lady on Fire (2019)",
  ],
  writingGuidelines: [
    "Chemistry is built through conflict, not proximity. They should disagree before they connect.",
    "The grand gesture must be specific to these two characters — not generic.",
    "The wound must be established before the love interest arrives.",
    "Small moments are more romantic than big ones — a look, a gesture, a specific detail.",
    "The obstacle must be real — not a misunderstanding that a single conversation would resolve.",
    "Both characters must change — not just the protagonist.",
  ],
  openingSceneScaffold: `FADE IN:

INT./EXT. [PROTAGONIST'S WORLD — SPECIFIC, LIVED-IN] - [TIME OF DAY]

[ESTABLISH THE PROTAGONIST'S LIFE — competent, perhaps even happy, but with a specific absence. The wound is visible in the details.]

[PROTAGONIST NAME] ([AGE], [BRIEF DESCRIPTION]) [ACTION THAT ESTABLISHES WHO THEY ARE — and what they're protecting themselves from].

[A SMALL DETAIL that tells us about the wound — a photo, a habit, a choice they make without thinking.]

[SECONDARY CHARACTER — BEST FRIEND OR COLLEAGUE]
(teasing, affectionate)
[A LINE THAT ESTABLISHES THE PROTAGONIST'S PATTERN WITH LOVE — gently, not cruelly]

[PROTAGONIST NAME]
(deflecting with humor)
[A LINE THAT IS FUNNY AND ALSO COMPLETELY SINCERE — they believe this]`,

  closingSceneScaffold: `INT./EXT. [THE LOCATION THAT MEANS SOMETHING TO BOTH OF THEM] - [TIME OF DAY — OFTEN GOLDEN HOUR OR NIGHT]

[PROTAGONIST NAME] and [LOVE INTEREST NAME] [TOGETHER — in a way that is specific to who they are].

[NOT A GENERIC ROMANTIC IMAGE — something that is exactly right for these two people.]

[PROTAGONIST NAME]
(no longer deflecting)
[THE LINE THEY COULDN'T SAY AT THE BEGINNING — now they can]

[LOVE INTEREST NAME]
[THE RESPONSE — honest, warm, specific]

[A SMALL GESTURE — not a grand one. The exact right thing.]

FADE TO BLACK.`,
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export const SCRIPT_TEMPLATES: ScriptTemplate[] = [
  THRILLER,
  DRAMA,
  ACTION,
  HORROR,
  COMEDY,
  SCIFI,
  ROMANCE,
];

export const SCRIPT_TEMPLATE_MAP: Record<string, ScriptTemplate> = Object.fromEntries(
  SCRIPT_TEMPLATES.map((t) => [t.id, t]),
);

/**
 * Get a template by genre ID.
 */
export function getScriptTemplate(id: string): ScriptTemplate | undefined {
  return SCRIPT_TEMPLATE_MAP[id];
}

/**
 * Get the opening scaffold for a template, with placeholder substitution.
 */
export function getOpeningScaffold(templateId: string): string {
  return SCRIPT_TEMPLATE_MAP[templateId]?.openingSceneScaffold ?? "";
}

/**
 * Get the closing scaffold for a template.
 */
export function getClosingScaffold(templateId: string): string {
  return SCRIPT_TEMPLATE_MAP[templateId]?.closingSceneScaffold ?? "";
}

/**
 * Build a beat sheet summary string for use in AI generation prompts.
 */
export function buildBeatSheetPrompt(templateId: string): string {
  const t = SCRIPT_TEMPLATE_MAP[templateId];
  if (!t) return "";
  const lines: string[] = [
    `GENRE: ${t.genre.toUpperCase()}`,
    `TONE: ${t.toneDescription}`,
    `TARGET: ${t.targetPageCount} pages / ${t.targetRuntime}`,
    ``,
    `THREE-ACT BEAT SHEET:`,
  ];
  for (const act of t.acts) {
    lines.push(`\nACT ${act.number}: ${act.title} (pp. ${act.pageRange})`);
    lines.push(act.purpose);
    for (const beat of act.beats) {
      lines.push(`  • ${beat.name} (p. ${beat.pageRange}): ${beat.description}`);
    }
  }
  lines.push(`\nWRITING GUIDELINES:`);
  for (const g of t.writingGuidelines) {
    lines.push(`  • ${g}`);
  }
  lines.push(`\nCINEMATIC REFERENCES: ${t.cinematicReferences.join(", ")}`);
  return lines.join("\n");
}
