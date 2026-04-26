/**
 * THE SHOWRUNNER — Virelle Studios showcase film package data.
 *
 * Pure data export consumed by client/src/pages/Showcase.tsx and
 * client/src/pages/Landing.tsx. No JSX, no runtime logic.
 *
 * All names, scenarios, and the rival "ClipWizard.ai" platform are
 * fictional. See `DISCLAIMER.long` for the full notice.
 */

export const TITLE = "THE SHOWRUNNER";

export const TAGLINE = "No crew. No budget. One link.";

export const LOGLINE =
  "A broke Melbourne filmmaker receives an email from an old school friend " +
  "retired in Hawaii, reminding him how funny and imaginative his stories " +
  "once were. The email includes a link to Virelle.life. One click turns " +
  "Leo's forgotten storytelling talent into SIGNAL BLACK, a viral hit-show " +
  "package — and suddenly everyone wants a piece of it.";

export const SYNOPSIS =
  "Leo Vale is a broke, sleep-deprived Melbourne filmmaker with old scripts, " +
  "no budget, and one dying laptop. When an old school friend named Sam " +
  "emails from Hawaii reminding Leo how he used to make everyone laugh with " +
  "his stories, Leo clicks the link Sam sends: Virelle.life. Inside Virelle " +
  "Studios, Leo turns one sci-fi idea into SIGNAL BLACK — a complete " +
  "production package with story, characters, scene cards, trailer, poster, " +
  "music direction, and pitch assets. The trailer goes viral. Investors " +
  "call. A rival fake-guru creator tries to copy him with ClipWizard.ai and " +
  "produces chaos. Leo realises the difference: clips are not a production. " +
  "Virelle helped him build the show.";

export const TONE: string[] = [
  "Comical",
  "Fast",
  "Exciting",
  "Aspirational",
  "Premium",
  "Cinematic",
  "Founder-energy",
  "Not cheesy",
  "Not corporate",
  "Not slow",
];

export interface Character {
  name: string;
  role: string;
  description: string;
}

export const CHARACTERS: Character[] = [
  {
    name: "Leo Vale",
    role: "Protagonist — broke Melbourne filmmaker",
    description:
      "Funny, ambitious, exhausted, dramatic. Talented but stuck. Starts " +
      "as a guy with ideas and ends as a real showrunner.",
  },
  {
    name: "Mia Tran",
    role: "Best friend / editor",
    description:
      "Sharp, deadpan, practical. She calls out Leo's nonsense but " +
      "believes in him.",
  },
  {
    name: "Uncle Ray",
    role: "The loud uncle",
    description:
      "Old-school, funny, suspicious of AI, supportive in the worst " +
      "possible way. Accidentally joins investor calls on video.",
  },
  {
    name: "Sam Kealoha",
    role: "Old school friend, retired in Hawaii",
    description:
      "Warm, nostalgic, successful. Remembers Leo's storytelling gift and " +
      "sends him the Virelle.life link.",
  },
  {
    name: "Dana Cross",
    role: "Streaming / investor type",
    description:
      "Polished, intense, opportunistic. Wants to buy Leo's viral show " +
      "the moment it lands.",
  },
  {
    name: "Cass Bell",
    role: "Rival fake-guru creator",
    description:
      "Overconfident, performative, trend-chasing. Tries to copy Leo's " +
      "success using ClipWizard.ai and gets chaos.",
  },
];

export const SAM_EMAIL = {
  subject: "Remember your stories?",
  from: "Sam Kealoha",
  body:
    "Hey Leo,\n\n" +
    "It's been years. I'm retired in Hawaii now — still can't believe it.\n\n" +
    "I was thinking about school the other day and remembered how you used " +
    "to make all of us laugh with those wild stories you'd tell at lunch. " +
    "You had the whole table waiting for the next episode.\n\n" +
    "I found this website and thought of you immediately. It helped me " +
    "more than I expected, and I hope it will improve yours as it did " +
    "mine:\n\n" +
    "https://Virelle.life\n\n" +
    "Hope I see you in Hawaii soon for your retirement trip.\n\n" +
    "Your old mate,\n" +
    "Sam",
};

export const DISCLAIMER = {
  placement: "After Virelle opener video / logo animation and before THE SHOWRUNNER begins.",
  durationSeconds: 4,
  long:
    "This showcase film was created as a Virelle Studios demonstration. " +
    "All characters, names, dialogue, events, businesses, platforms, and " +
    "scenarios depicted are fictional. Any resemblance to actual persons, " +
    "living or dead, real companies, real productions, or real events is " +
    "purely coincidental. This content is intended for demonstration and " +
    "entertainment purposes only. Generated and assembled through the " +
    "Virelle Studios workflow.",
  short:
    "This showcase film was created as a Virelle Studios demonstration. " +
    "All characters, names, events, businesses, platforms, and scenarios " +
    "are fictional. Any resemblance to actual persons, living or dead, " +
    "companies, productions, or events is purely coincidental. For " +
    "demonstration and entertainment purposes only. Generated and " +
    "assembled through the Virelle Studios workflow.",
};

export type ScriptLineType =
  | "action"
  | "dialogue"
  | "parenthetical"
  | "transition"
  | "on_screen"
  | "caption"
  | "email";

export interface ScriptLine {
  type: ScriptLineType;
  speaker?: string;
  text: string;
}

export interface ScriptScene {
  id: number;
  heading: string;
  setting: string;
  lines: ScriptLine[];
}

export const FULL_SCRIPT: ScriptScene[] = [
  {
    id: 1,
    heading: "SCENE 1 — THE STUCK FILMMAKER",
    setting: "INT. LEO'S APARTMENT — NIGHT",
    lines: [
      { type: "action", text: "A tiny Melbourne apartment. Coffee cups. Old scripts. Bills. A cheap tripod held together with tape. Rain taps against the window." },
      { type: "action", text: "Leo sits at his laptop. The screen shows a blank document titled: MASTERPIECE_FINAL_FINAL_ACTUALLY_FINAL.docx" },
      { type: "action", text: "He types one word: FADE. He stops. He deletes it." },
      { type: "action", text: "Mia sits nearby eating noodles from the container." },
      { type: "dialogue", speaker: "MIA", text: "Leo, you don't have writer's block." },
      { type: "dialogue", speaker: "LEO", text: "Thank you." },
      { type: "dialogue", speaker: "MIA", text: "You have life block." },
      { type: "dialogue", speaker: "LEO", text: "Less thank you." },
      { type: "dialogue", speaker: "MIA", text: "You said this was going to be a production company." },
      { type: "dialogue", speaker: "LEO", text: "It is." },
      { type: "dialogue", speaker: "MIA", text: "It's a hoodie, a laptop, and three overdue bills." },
      { type: "dialogue", speaker: "LEO", text: "Every empire starts somewhere." },
      { type: "dialogue", speaker: "MIA", text: "Usually not with a laptop that sounds like it's boiling rice." },
      { type: "action", text: "The laptop fan screams." },
      { type: "dialogue", speaker: "LEO", text: "She's under pressure because she believes in cinema." },
      { type: "dialogue", speaker: "MIA", text: "She's under pressure because you have forty-seven browser tabs open and no income." },
      { type: "dialogue", speaker: "LEO", text: "I had stories once." },
      { type: "dialogue", speaker: "MIA", text: "You still do." },
      { type: "dialogue", speaker: "LEO", text: "No crew. No budget. No studio. No one waiting for my genius." },
      { type: "dialogue", speaker: "MIA", text: "I'm waiting." },
      { type: "action", text: "Leo looks touched." },
      { type: "dialogue", speaker: "MIA", text: "For you to pay me back." },
      { type: "transition", text: "CUT TO BLACK." },
      { type: "on_screen", text: "NO CREW. NO MONEY. ONE LAST IDEA." },
    ],
  },
  {
    id: 2,
    heading: "SCENE 2 — THE EMAIL",
    setting: "INT. LEO'S APARTMENT — LATER",
    lines: [
      { type: "action", text: "Leo's inbox dings." },
      { type: "dialogue", speaker: "MIA", text: "If that's another festival rejection, read it dramatically." },
      { type: "dialogue", speaker: "LEO", text: "I only accept rejection in PDF format." },
      { type: "action", text: "Leo opens the email." },
      { type: "email", text: "Subject: Remember your stories?\nFrom: Sam Kealoha" },
      { type: "email", text: "Hey Leo,\n\nIt's been years. I'm retired in Hawaii now — still can't believe it.\n\nI was thinking about school the other day and remembered how you used to make all of us laugh with those wild stories you'd tell at lunch. You had the whole table waiting for the next episode.\n\nI found this website and thought of you immediately. It helped me more than I expected, and I hope it will improve yours as it did mine:\n\nhttps://Virelle.life\n\nHope I see you in Hawaii soon for your retirement trip.\n\nYour old mate,\nSam" },
      { type: "action", text: "Leo stares at the email." },
      { type: "dialogue", speaker: "MIA", text: "Who's Sam?" },
      { type: "dialogue", speaker: "LEO", text: "School friend. He used to trade lunch snacks for my stories." },
      { type: "dialogue", speaker: "MIA", text: "And now he's retired in Hawaii?" },
      { type: "dialogue", speaker: "LEO", text: "Apparently everyone got a life update except me." },
      { type: "dialogue", speaker: "MIA", text: "\"Hope I see you in Hawaii soon for your retirement trip.\"" },
      { type: "dialogue", speaker: "LEO", text: "Retirement trip? I can't even afford airport parking." },
      { type: "action", text: "Uncle Ray enters from the kitchenette holding toast." },
      { type: "dialogue", speaker: "UNCLE RAY", text: "Hawaii is expensive. Make the robot movie first." },
      { type: "dialogue", speaker: "MIA", text: "How long have you been standing there?" },
      { type: "dialogue", speaker: "UNCLE RAY", text: "Long enough to know Sam is rich and you are not." },
      { type: "action", text: "Leo looks back at the link: https://Virelle.life" },
      { type: "dialogue", speaker: "LEO", text: "Maybe I'll just look." },
      { type: "dialogue", speaker: "MIA", text: "That sentence has ruined many lives." },
      { type: "action", text: "Leo clicks." },
    ],
  },
  {
    id: 3,
    heading: "SCENE 3 — ONE LINK",
    setting: "INT. LEO'S APARTMENT — CONTINUOUS",
    lines: [
      { type: "action", text: "The Virelle Studios page opens. Black and gold. Premium." },
      { type: "on_screen", text: "Virelle Studios — Turn your idea into a production-ready package." },
      { type: "action", text: "The interface shows: CONCEPT · SCRIPT · CHARACTERS · SCENE CARDS · VISUAL DNA · VOICE · SCORE · POSTER · FUNDING TARGETS · PRODUCTION PACKAGE" },
      { type: "dialogue", speaker: "LEO", text: "Wait." },
      { type: "dialogue", speaker: "MIA", text: "No." },
      { type: "dialogue", speaker: "LEO", text: "It does all of it?" },
      { type: "dialogue", speaker: "MIA", text: "Don't get emotional. It's a website." },
      { type: "dialogue", speaker: "LEO", text: "No. It's a sign." },
      { type: "dialogue", speaker: "UNCLE RAY", text: "If it asks for your passport, close it." },
      { type: "action", text: "Leo types into the concept box:" },
      { type: "on_screen", text: "\"In near-future Melbourne, a detective discovers an underground AI that predicts crimes before they happen — until it predicts her own murder.\"" },
      { type: "dialogue", speaker: "MIA", text: "That's actually not bad." },
      { type: "dialogue", speaker: "LEO", text: "I know. I've been emotionally unemployed, not creatively dead." },
      { type: "action", text: "He hits GENERATE." },
      { type: "on_screen", text: "Generating title... Building logline... Creating characters... Creating scene cards... Generating trailer script... Creating poster prompt... Suggesting music direction... Assembling production package..." },
      { type: "dialogue", speaker: "UNCLE RAY", text: "It's moving too fast. That's how they steal your organs." },
      { type: "dialogue", speaker: "MIA", text: "Ray." },
      { type: "dialogue", speaker: "UNCLE RAY", text: "I'm saying be alert." },
      { type: "on_screen", text: "SIGNAL BLACK — The future already saw you." },
      { type: "dialogue", speaker: "LEO", text: "That's better than mine." },
      { type: "dialogue", speaker: "MIA", text: "Most things are." },
      { type: "action", text: "Leo scrolls. Character cards appear: MARA VALE — Discredited detective. ELIAS VORN — AI studio founder. JUN PARK — Whistleblower engineer. THE ORACLE — Prediction system." },
      { type: "action", text: "Scene cards appear. Poster art placeholder appears. Trailer structure appears." },
      { type: "dialogue", speaker: "MIA", text: "Leo." },
      { type: "dialogue", speaker: "LEO", text: "Yeah?" },
      { type: "dialogue", speaker: "MIA", text: "This is annoyingly good." },
      { type: "dialogue", speaker: "LEO", text: "Say that again, but with less hatred." },
      { type: "dialogue", speaker: "MIA", text: "No." },
    ],
  },
  {
    id: 4,
    heading: "SCENE 4 — THE SHOW IS BORN",
    setting: "MONTAGE — VIRELLE WORKFLOW",
    lines: [
      { type: "action", text: "Fast, exciting, cinematic." },
      { type: "action", text: "Leo enters the concept." },
      { type: "on_screen", text: "TITLE: SIGNAL BLACK · LOGLINE · CHARACTERS · SCENE CARDS · VISUAL DNA · TRAILER SCRIPT · POSTER PROMPT · MUSIC DIRECTION · FUNDING TARGETS · PRODUCTION PACKAGE" },
      { type: "dialogue", speaker: "MIA", text: "It made a pitch package." },
      { type: "dialogue", speaker: "LEO", text: "It made a universe." },
      { type: "dialogue", speaker: "UNCLE RAY", text: "Can it make invoices disappear?" },
      { type: "dialogue", speaker: "LEO", text: "That's version seven." },
      { type: "on_screen", text: "ONE EMAIL. ONE IDEA. ONE SHOW." },
    ],
  },
  {
    id: 5,
    heading: "SCENE 5 — UPLOAD",
    setting: "INT. LEO'S APARTMENT — MORNING",
    lines: [
      { type: "action", text: "Sunrise. Everyone is wrecked but excited." },
      { type: "on_screen", text: "SIGNAL BLACK — Trailer Export Complete." },
      { type: "dialogue", speaker: "MIA", text: "Upload it." },
      { type: "dialogue", speaker: "LEO", text: "What if no one watches?" },
      { type: "dialogue", speaker: "MIA", text: "Then nothing changes." },
      { type: "dialogue", speaker: "UNCLE RAY", text: "What if everyone watches?" },
      { type: "dialogue", speaker: "MIA", text: "Then everything changes." },
      { type: "action", text: "Leo looks at Sam's email again: \"I remembered how you used to make all of us laugh with those wild stories.\"" },
      { type: "dialogue", speaker: "LEO", text: "Alright, Sam." },
      { type: "action", text: "He clicks upload." },
      { type: "on_screen", text: "One like. Ten. One hundred. Thousands." },
      { type: "action", text: "Leo's phone starts buzzing." },
      { type: "dialogue", speaker: "LEO", text: "I think twelve people watched it." },
      { type: "dialogue", speaker: "MIA", text: "Leo." },
      { type: "dialogue", speaker: "LEO", text: "Good twelve or bad twelve?" },
      { type: "dialogue", speaker: "MIA", text: "Twelve million." },
      { type: "dialogue", speaker: "UNCLE RAY", text: "Do we know twelve million people?" },
      { type: "dialogue", speaker: "MIA", text: "No, Ray." },
      { type: "dialogue", speaker: "UNCLE RAY", text: "Then this is suspicious." },
      { type: "on_screen", text: "Social comments: \"Wait this is AI??\" · \"Who made this?\" · \"This looks better than half the stuff I watched this year.\" · \"Netflix better call this guy.\" · \"I need episode one now.\" · \"Virelle did this??\" · \"No crew?? No budget?? Nah this is crazy.\"" },
    ],
  },
  {
    id: 6,
    heading: "SCENE 6 — THE CALLS AND THE COPYCAT",
    setting: "INT. LEO'S APARTMENT / DANA'S OFFICE — DAY",
    lines: [
      { type: "action", text: "Leo's phone rings. CALLER ID: UNKNOWN — LOS ANGELES" },
      { type: "dialogue", speaker: "DANA", text: "Leo Vale?" },
      { type: "dialogue", speaker: "LEO", text: "Depends who's suing." },
      { type: "dialogue", speaker: "DANA", text: "Dana Cross. We saw Signal Black." },
      { type: "dialogue", speaker: "LEO", text: "You and twelve million emotionally unstable strangers." },
      { type: "dialogue", speaker: "DANA", text: "We want the show." },
      { type: "dialogue", speaker: "LEO", text: "Like... emotionally?" },
      { type: "dialogue", speaker: "DANA", text: "No. Legally." },
      { type: "action", text: "Leo covers the phone." },
      { type: "dialogue", speaker: "LEO", text: "They want it legally." },
      { type: "dialogue", speaker: "MIA", text: "That is usually how business works." },
      { type: "dialogue", speaker: "UNCLE RAY", text: "Tell them we want Marvel money." },
      { type: "dialogue", speaker: "DANA", text: "Bring your pitch package." },
      { type: "action", text: "Leo turns to the Virelle dashboard: SIGNAL BLACK — Production Package Ready." },
      { type: "dialogue", speaker: "LEO", text: "Yeah. I've got one." },
      { type: "action", text: "Suddenly another video notification appears. CASS BELL has posted a video." },
      { type: "on_screen", text: "CASS VIDEO — \"Hey creators, I've always believed storytelling should be automated, authentic, and monetized by Tuesday. That's why I'm launching my new AI series.\"" },
      { type: "action", text: "Her screen recording shows a fictional site: ClipWizard.ai" },
      { type: "on_screen", text: "Prompt: \"Make me a viral sci-fi noir show like Signal Black but legally different and more expensive looking.\"" },
      { type: "action", text: "The output is chaos: a cowboy in space, a detective with three different faces, a Melbourne skyline that looks like Miami, a robot dog wearing sunglasses, a castle explosion for no reason, subtitles reading: \"The future is yesterday, detective man.\"" },
      { type: "dialogue", speaker: "CASS", text: "Obviously this is just the first pass." },
      { type: "action", text: "The detective's face changes mid-sentence." },
      { type: "dialogue", speaker: "AI DETECTIVE", text: "I am here to solve the murder of the moon." },
      { type: "action", text: "Back to Leo's apartment. Leo, Mia, and Uncle Ray stare." },
      { type: "dialogue", speaker: "LEO", text: "Is that supposed to be me?" },
      { type: "dialogue", speaker: "MIA", text: "No. That is what happens when you ask a slot machine to be a production company." },
      { type: "dialogue", speaker: "UNCLE RAY", text: "The robot dog has charisma." },
      { type: "dialogue", speaker: "MIA", text: "Ray." },
      { type: "dialogue", speaker: "UNCLE RAY", text: "I'm not saying it's good. I'm saying he committed." },
      { type: "action", text: "Leo looks back at his Virelle package: character consistency, visual DNA, scene cards, trailer structure, pitch package." },
      { type: "dialogue", speaker: "MIA", text: "That's the difference." },
      { type: "dialogue", speaker: "LEO", text: "What?" },
      { type: "dialogue", speaker: "MIA", text: "She made clips. You built a show." },
      { type: "dialogue", speaker: "LEO", text: "Put that on the website." },
    ],
  },
  {
    id: 7,
    heading: "SCENE 7 — THE PITCH",
    setting: "INT. INVESTOR MEETING ROOM — DAY",
    lines: [
      { type: "action", text: "Leo enters a polished meeting room. Mia is with him. Uncle Ray appears accidentally on video call, giant on the presentation screen." },
      { type: "dialogue", speaker: "UNCLE RAY", text: "Can everyone hear me?" },
      { type: "dialogue", speaker: "LEO", text: "Ray, hang up." },
      { type: "dialogue", speaker: "UNCLE RAY", text: "I'm part of the company now." },
      { type: "dialogue", speaker: "DANA", text: "So, Leo. What is Signal Black?" },
      { type: "action", text: "Leo freezes. Then he opens the Virelle production package." },
      { type: "on_screen", text: "SLIDE 1 — SIGNAL BLACK — The future already saw you. SLIDE 2 — Logline. SLIDE 3 — Characters. SLIDE 4 — Season arc. SLIDE 5 — Scene cards. SLIDE 6 — Visual DNA. SLIDE 7 — Trailer. SLIDE 8 — Funding targets. SLIDE 9 — Production plan." },
      { type: "dialogue", speaker: "LEO", text: "Signal Black is a near-future sci-fi noir thriller set in Melbourne." },
      { type: "action", text: "He clicks. Mara Vale appears." },
      { type: "dialogue", speaker: "LEO", text: "It follows Mara Vale, a detective who discovers an AI system that doesn't just predict crime..." },
      { type: "action", text: "He clicks. The Oracle appears." },
      { type: "dialogue", speaker: "LEO", text: "It manufactures the future people are afraid of." },
      { type: "action", text: "The executives lean in." },
      { type: "dialogue", speaker: "LEO", text: "But this isn't just about one show." },
      { type: "action", text: "He clicks to Virelle workflow." },
      { type: "dialogue", speaker: "LEO", text: "This is how I built it." },
      { type: "dialogue", speaker: "LEO", text: "No studio. No crew. No gatekeeper. One idea, built into a production-ready package." },
      { type: "dialogue", speaker: "DANA", text: "You made all this yourself?" },
      { type: "dialogue", speaker: "LEO", text: "No." },
      { type: "action", text: "Beat." },
      { type: "dialogue", speaker: "LEO", text: "I finally had a studio." },
      { type: "action", text: "Uncle Ray nods proudly on the screen." },
      { type: "dialogue", speaker: "UNCLE RAY", text: "And we want Hawaii money." },
      { type: "dialogue", speaker: "MIA", text: "Honestly, keep that in." },
    ],
  },
  {
    id: 8,
    heading: "SCENE 8 — THE REALIZATION",
    setting: "EXT. MELBOURNE ROOFTOP — SUNSET",
    lines: [
      { type: "action", text: "Leo and Mia overlook the city. Leo checks his phone." },
      { type: "email", text: "New email from Sam:\n\nLeo,\nSaw the trailer.\nThat's the storyteller I remember.\nHawaii soon.\nSam" },
      { type: "action", text: "Leo smiles." },
      { type: "dialogue", speaker: "MIA", text: "So what now, Showrunner?" },
      { type: "dialogue", speaker: "LEO", text: "Now?" },
      { type: "action", text: "He looks at the skyline." },
      { type: "dialogue", speaker: "LEO", text: "We make episode one." },
      { type: "dialogue", speaker: "MIA", text: "With what money?" },
      { type: "on_screen", text: "Leo's phone buzzes: INVESTOR MEETING · PRESS REQUEST · CREATOR PARTNERSHIP · DISTRIBUTION CALL · VIRELLE EXPORT COMPLETE" },
      { type: "dialogue", speaker: "LEO", text: "With pressure." },
      { type: "dialogue", speaker: "MIA", text: "That is not a currency." },
      { type: "action", text: "Uncle Ray appears holding cheap leis." },
      { type: "dialogue", speaker: "UNCLE RAY", text: "It is in this family." },
      { type: "action", text: "Leo looks into camera." },
      { type: "dialogue", speaker: "LEO", text: "I didn't need permission." },
      { type: "transition", text: "CUT TO BLACK." },
      { type: "dialogue", speaker: "LEO V.O.", text: "I needed a studio." },
      { type: "on_screen", text: "TITLE CARD: THE SHOWRUNNER" },
      { type: "on_screen", text: "FINAL CARD: Built as a Virelle Studios showcase." },
      { type: "caption", text: "Turn your idea into a production-ready package." },
      { type: "caption", text: "Start your production at Virelle.life" },
    ],
  },
  {
    id: 9,
    heading: "OPTIONAL END TAG",
    setting: "INT. LEO'S APARTMENT — NIGHT",
    lines: [
      { type: "action", text: "Uncle Ray types into Virelle." },
      { type: "dialogue", speaker: "MIA", text: "Ray, what are you doing?" },
      { type: "dialogue", speaker: "UNCLE RAY", text: "Making a spin-off." },
      { type: "dialogue", speaker: "LEO", text: "About what?" },
      { type: "dialogue", speaker: "UNCLE RAY", text: "A retired uncle in Hawaii who solves crimes with an AI fridge." },
      { type: "dialogue", speaker: "MIA", text: "I'd watch that." },
      { type: "transition", text: "CUT TO BLACK." },
    ],
  },
];

export interface SignalBlackBeat {
  speaker?: string;
  text: string;
  kind: "voiceover" | "dialogue" | "visual" | "title" | "on_screen";
}

export const SIGNAL_BLACK_MINI_TRAILER: {
  title: string;
  tagline: string;
  beats: SignalBlackBeat[];
} = {
  title: "SIGNAL BLACK",
  tagline: "The future already saw you.",
  beats: [
    { kind: "voiceover", speaker: "MARA V.O.", text: "Three hours before the murder, the system already knew my name." },
    { kind: "visual", text: "Rainy Melbourne street. Public safety screen glitches. Mara's name appears under FUTURE HOMICIDE REPORT." },
    { kind: "dialogue", speaker: "JUN PARK", text: "If you're watching this, it means the prediction engine has started choosing victims." },
    { kind: "dialogue", speaker: "ELIAS VORN", text: "Prediction is just control with better branding." },
    { kind: "dialogue", speaker: "MARA", text: "It doesn't predict the future. It chooses one." },
    { kind: "on_screen", text: "TARGET: MARA VALE — TIME TO EVENT: 04:12:09" },
    { kind: "dialogue", speaker: "ORACLE", text: "Outcome confirmed." },
    { kind: "dialogue", speaker: "MARA", text: "Then let's make the one future you didn't see." },
    { kind: "title", text: "SIGNAL BLACK" },
  ],
};

export interface SocialCut {
  length: string;
  label: string;
  beats: string[];
  cta: string;
}

export const SOCIAL_CUTS: SocialCut[] = [
  {
    length: "15s",
    label: "Hook",
    beats: [
      "A broke filmmaker gets one email.",
      "\"Remember your stories?\"",
      "One link: Virelle.life",
      "No crew. No budget. One link.",
      "Virelle builds Signal Black.",
      "Mia: \"Leo. It's twelve million.\"",
    ],
    cta: "Start your production at Virelle.life",
  },
  {
    length: "30s",
    label: "Product proof",
    beats: [
      "Leo opens Virelle.",
      "Concept → Script → Characters → Scene Cards → Trailer → Poster → Production Package",
      "Leo: \"Wait... it does all of it?\"",
      "Mia: \"This is annoyingly good.\"",
      "Signal Black flashes.",
      "Leo V.O.: \"I didn't need permission. I needed a studio.\"",
    ],
    cta: "Virelle.life",
  },
  {
    length: "45s",
    label: "Comedy cut",
    beats: [
      "Mia: \"You don't have writer's block. You have life block.\"",
      "Email: Remember your stories?",
      "Uncle Ray: \"Hawaii is expensive. Make the robot movie first.\"",
      "Virelle builds Signal Black.",
      "Mia: \"Leo. It's twelve million.\"",
      "Cass opens ClipWizard.ai and gets chaos.",
      "AI Detective: \"I am here to solve the murder of the moon.\"",
      "Mia: \"She made clips. You built a show.\"",
    ],
    cta: "Virelle.life",
  },
];

export const LANDING_COPY = {
  headline:
    "One email reminded him he was a storyteller. Virelle helped him build the show.",
  subheadline:
    "THE SHOWRUNNER is a fast, funny Virelle showcase about a broke filmmaker " +
    "who receives a link from an old school friend in Hawaii — then uses " +
    "Virelle Studios to turn one idea into SIGNAL BLACK, a viral hit-show package.",
  proofLine: "Generic AI tools make clips. Virelle helps you build the show.",
  primaryCta: { label: "Watch Showcase", href: "/showcase" },
  secondaryCta: { label: "Start Production", href: "/register" },
};

export interface ProductionPackageItem {
  label: string;
  description: string;
}

export const PRODUCTION_PACKAGE_CHECKLIST: ProductionPackageItem[] = [
  { label: "Concept", description: "One sentence becomes a working premise." },
  { label: "Script", description: "Structured scenes with consistent character voice." },
  { label: "Characters", description: "Cast with backstory, motivation, and visual notes." },
  { label: "Scene cards", description: "Shot-by-shot breakdown ready for production." },
  { label: "Visual DNA", description: "Locked palette, mood, lighting, lens language." },
  { label: "Voice direction", description: "Per-character voice cast and delivery notes." },
  { label: "Score direction", description: "Music tone, instrumentation, and cue structure." },
  { label: "Poster prompt", description: "Ready-to-render key art with composition rules." },
  { label: "Funding targets", description: "Realistic budget tiers and where to pitch them." },
  { label: "Production package", description: "Single export the investor opens and understands." },
];

export const POSTER_PROMPT =
  "Cinematic noir movie poster for SIGNAL BLACK. Near-future Melbourne at " +
  "night, neon reflections in wet pavement. Detective Mara Vale in a long " +
  "dark coat, half-lit by a glitching public safety screen displaying her " +
  "own name under FUTURE HOMICIDE REPORT. Tagline: 'The future already saw " +
  "you.' Color palette: deep blacks, glacial cyan, single sodium-orange " +
  "light source. 2:3 portrait. Premium streaming-platform key art quality.";

export const COMPARISON_COPY = {
  headline: "Clips are not a production.",
  body:
    "Generic AI tools can generate random clips. Virelle is built for " +
    "controlled film production — story, characters, continuity, visual " +
    "DNA, trailer structure, poster, music direction, funding targets, " +
    "and a production-ready package.",
  clipWizardCons: [
    "inconsistent characters",
    "wrong tone",
    "random visuals",
    "no scene continuity",
    "no pitch package",
  ],
  virellePros: [
    "clear story",
    "consistent characters",
    "visual DNA",
    "scene cards",
    "trailer structure",
    "production package",
  ],
  landingProofLine:
    "Generic AI tools make clips. Virelle helps you build the show.",
  rivalName: "ClipWizard.ai",
  rivalNote:
    "ClipWizard.ai is a fictional rival platform invented for this " +
    "showcase. Any resemblance to a real product or service is " +
    "coincidental.",
};

const SHOWRUNNER_SHOWCASE = {
  title: TITLE,
  tagline: TAGLINE,
  logline: LOGLINE,
  synopsis: SYNOPSIS,
  tone: TONE,
  characters: CHARACTERS,
  samEmail: SAM_EMAIL,
  disclaimer: DISCLAIMER,
  fullScript: FULL_SCRIPT,
  signalBlackMiniTrailer: SIGNAL_BLACK_MINI_TRAILER,
  socialCuts: SOCIAL_CUTS,
  landingCopy: LANDING_COPY,
  productionPackageChecklist: PRODUCTION_PACKAGE_CHECKLIST,
  posterPrompt: POSTER_PROMPT,
  comparisonCopy: COMPARISON_COPY,
};

export default SHOWRUNNER_SHOWCASE;
