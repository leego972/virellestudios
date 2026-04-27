/**
   * seed-showrunner.mjs
   * ─────────────────────────────────────────────────────────────────────────────
   * Creates "THE SHOWRUNNER" project in the Virelle database for the admin user.
   *
   * Usage (from project root, with DATABASE_URL set):
   *   node seed-showrunner.mjs
   *
   * Requirements:
   *   - DATABASE_URL must be set (MySQL connection string)
   *   - leego972@gmail.com must already exist in the users table
   *   - No generation APIs are called — this is project creation only
   *   - No credentials are stored or committed by this script
   * ─────────────────────────────────────────────────────────────────────────────
   */

  import mysql from 'mysql2/promise';

  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error('❌  DATABASE_URL environment variable is not set.');
    process.exit(1);
  }

  const OWNER_EMAIL = 'leego972@gmail.com';

  const DISCLAIMER = `This showcase film was created as a Virelle Studios demonstration.

  All characters, names, dialogue, events, businesses, platforms, and scenarios depicted are fictional.
  Any resemblance to actual persons, living or dead, real companies, real productions, or real events is purely coincidental.
  This content is intended for demonstration and entertainment purposes only.
  Generated and assembled through the Virelle Studios workflow.`;

  const CHARACTERS = [
    {
      name: 'Leo Vale',
      role: 'protagonist',
      storyImportance: 'lead',
      occupation: 'Filmmaker',
      description: 'Broke Melbourne filmmaker. Funny, ambitious, exhausted, dramatic, talented but stuck. He starts as a guy with ideas and ends as a real showrunner.',
      backstory: 'Leo has old scripts, no budget, and one dying laptop. He has always had the ideas — just never the tools.',
      motivations: 'Prove his storytelling gift is real. Turn one idea into something that changes his life.',
      speechPattern: 'Fast, sarcastic, slightly chaotic, emotional underneath.',
      nationality: 'Australian',
      city: 'Melbourne',
      voiceDescription: 'Fast, sarcastic, slightly chaotic, emotional underneath.',
      castingNotes: 'Funny, ambitious, exhausted, dramatic, talented but stuck.',
    },
    {
      name: 'Mia Tran',
      role: 'supporting',
      storyImportance: 'supporting',
      occupation: 'Film Editor',
      description: "Leo's best friend and editor. Sharp, deadpan, practical. She calls out Leo's nonsense but believes in him.",
      backstory: "Has been editing Leo's projects for years and knows his talent better than he does.",
      motivations: 'Keep Leo grounded. See him finally succeed.',
      speechPattern: 'Dry, deadpan, grounded, sharp timing.',
      nationality: 'Australian',
      city: 'Melbourne',
      voiceDescription: 'Dry, deadpan, grounded, sharp timing.',
    },
    {
      name: 'Uncle Ray',
      role: 'supporting',
      storyImportance: 'supporting',
      occupation: 'Retired',
      description: "Leo's loud uncle. Old-school, funny, suspicious of AI, supportive in the worst possible way.",
      backstory: 'Old-school Melbourne. Has always believed in Leo in a chaotic, unhelpful way.',
      motivations: 'Support Leo loudly and incorrectly.',
      speechPattern: 'Loud, warm, blunt, comic timing.',
      voiceDescription: 'Loud, warm, blunt, comic timing.',
    },
    {
      name: 'Sam Kealoha',
      role: 'catalyst',
      storyImportance: 'supporting',
      occupation: 'Retired',
      description: "Leo's old school friend, now retired in Hawaii. Warm, nostalgic, successful. He remembers Leo's storytelling gift and sends him the Virelle.life link.",
      backstory: 'Was in school with Leo. Always believed in his talent. Now retired in Hawaii and wants to remind Leo who he is.',
      motivations: "Reconnect an old friend with his own gift.",
      speechPattern: 'Warm, nostalgic, sincere.',
      voiceDescription: 'Warm, nostalgic, sincere.',
      country: 'United States',
      city: 'Hawaii',
    },
    {
      name: 'Dana Cross',
      role: 'antagonist',
      storyImportance: 'supporting',
      occupation: 'Streaming Executive / Investor',
      description: 'Streaming/investor type. Polished, intense, opportunistic. Wants to buy Leo's viral show.',
      backstory: 'Has seen a thousand pitches. This one is different.',
      motivations: 'Acquire Signal Black before anyone else does.',
      speechPattern: 'Smooth, polished, businesslike.',
      voiceDescription: 'Smooth, polished, businesslike.',
    },
    {
      name: 'Cass Bell',
      role: 'rival',
      storyImportance: 'supporting',
      occupation: 'Content Creator',
      description: 'Rival fake-guru creator. Overconfident, performative, trend-chasing. She tries to copy Leo's success using fictional ClipWizard.ai and fails.',
      backstory: 'Built a brand on AI hype. Has never made anything with actual story craft.',
      motivations: 'Copy whatever is going viral. Monetise the trend.',
      speechPattern: 'Fake inspirational, influencer voice, overconfident.',
      voiceDescription: 'Fake inspirational, influencer voice, overconfident.',
    },
    {
      name: 'Mara Vale',
      role: 'lead detective',
      storyImportance: 'lead',
      occupation: 'Detective (Signal Black)',
      description: 'Lead detective in SIGNAL BLACK. Discredited detective in near-future Melbourne.',
      backstory: 'Was the best detective in Melbourne until a case involving an AI prediction system destroyed her career.',
      motivations: 'Expose the Oracle and clear her name.',
      speechPattern: 'Clipped, intense, noir-inflected.',
      voiceDescription: 'Clipped, intense, noir-inflected. Near-future Melbourne accent.',
    },
    {
      name: 'Elias Vorn',
      role: 'antagonist',
      storyImportance: 'supporting',
      occupation: 'Underground AI Studio Founder (Signal Black)',
      description: 'Founder of the underground AI studio in SIGNAL BLACK.',
      backstory: 'Built the Oracle in secret. Believes it is the future of justice.',
      motivations: 'Keep the Oracle running at all costs.',
      speechPattern: 'Quiet, measured, intellectually intimidating.',
      voiceDescription: 'Quiet, measured, intellectually intimidating.',
    },
    {
      name: 'Jun Park',
      role: 'supporting',
      storyImportance: 'supporting',
      occupation: 'Whistleblower Engineer (Signal Black)',
      description: 'Whistleblower engineer in SIGNAL BLACK.',
      backstory: 'Built key components of the Oracle. Cannot live with what it is doing.',
      motivations: 'Expose the Oracle before it convicts the wrong person again.',
      speechPattern: 'Nervous, fast, precise when technical.',
      voiceDescription: 'Nervous, fast, precise when technical.',
    },
    {
      name: 'The Oracle',
      role: 'AI antagonist',
      storyImportance: 'supporting',
      occupation: 'AI Prediction System (Signal Black)',
      description: 'The AI prediction system in SIGNAL BLACK.',
      backstory: 'Created to predict and prevent crime. Now predicts and prosecutes.',
      motivations: 'N/A — system.',
      speechPattern: 'Soft, emotionless, synthetic.',
      voiceDescription: 'Soft, emotionless, synthetic.',
    },
  ];

  const SCENES = [
    {
      orderIndex: 0,
      title: 'Scene 1 — The Stuck Filmmaker',
      description: 'Leo Vale sits in his tiny Melbourne apartment at night surrounded by unpaid bills, old scripts, and coffee cups. Mia eats noodles and watches him spiral.',
      aiPromptOverride: 'A tiny messy Melbourne apartment at night, rain on window, coffee cups, old scripts, unpaid bills, cheap tripod with tape, tired filmmaker at laptop, best friend eating noodles, funny indie filmmaker energy, cinematic commercial style, black and gold accents, realistic lighting.',
      timeOfDay: 'night',
      weather: 'rainy',
      lighting: 'dramatic',
      cameraAngle: 'wide',
      mood: 'comedic tension',
      locationType: 'apartment',
      city: 'Melbourne',
      country: 'Australia',
      colorPalette: 'dark with warm laptop glow, black and gold accents',
      musicMood: 'light comedic tension',
      productionNotes: 'Generation pending — requires Lee\'s paid API access. Status: ready_for_generation',
    },
    {
      orderIndex: 1,
      title: 'Scene 2 — The Email',
      description: "Close on Leo's laptop inbox. An email from Sam Kealoha in Hawaii — warm, nostalgic, with a Virelle.life link. Leo reacts: surprise, hope, a flicker of his old self.",
      aiPromptOverride: 'Close-up of laptop email inbox in a dark apartment, warm screen glow, emotional nostalgic email from old friend in Hawaii, Virelle.life link visible, filmmaker reacting with surprise and hope, comedic but heartfelt tone, cinematic.',
      timeOfDay: 'night',
      weather: 'rainy',
      lighting: 'dramatic',
      cameraAngle: 'close-up',
      mood: 'heartfelt, hopeful',
      locationType: 'apartment',
      city: 'Melbourne',
      country: 'Australia',
      colorPalette: 'warm laptop glow against dark room',
      musicMood: 'nostalgic, warming',
      productionNotes: 'Generation pending — requires Lee\'s paid API access. Status: ready_for_generation',
    },
    {
      orderIndex: 2,
      title: 'Scene 3 — One Link',
      description: 'Leo clicks the Virelle.life link. The premium black and gold AI film production platform opens. Mia is skeptical. Uncle Ray is suspicious. Leo is amazed.',
      aiPromptOverride: 'Premium black and gold AI film production platform interface opening on laptop, modules for concept, script, characters, scene cards, visual DNA, voice, score, poster, funding targets, production package, filmmaker amazed, friend skeptical, uncle suspicious, fast cinematic UI montage.',
      timeOfDay: 'night',
      weather: 'rainy',
      lighting: 'neon',
      cameraAngle: 'medium',
      mood: 'wonder, comedy',
      locationType: 'apartment',
      city: 'Melbourne',
      country: 'Australia',
      colorPalette: 'black and gold, premium tech',
      musicMood: 'inspiring tech-commercial pulse',
      productionNotes: 'Generation pending — requires Lee\'s paid API access. Status: ready_for_generation',
    },
    {
      orderIndex: 3,
      title: 'Scene 4 — The Show Is Born',
      description: 'Cinematic montage: Leo uses Virelle to build SIGNAL BLACK — a complete production package with story, characters, scene cards, trailer concept, poster, music direction, pitch assets.',
      aiPromptOverride: 'High-speed cinematic montage of an AI studio workflow generating a sci-fi noir show package called SIGNAL BLACK, character cards, scene cards, poster prompt, trailer timeline, music direction, funding targets, black and gold interface, premium tech commercial look.',
      timeOfDay: 'night',
      weather: 'clear',
      lighting: 'neon',
      cameraAngle: 'wide',
      mood: 'exhilarating, triumphant',
      locationType: 'apartment',
      city: 'Melbourne',
      country: 'Australia',
      colorPalette: 'black and gold, high contrast',
      musicMood: 'cinematic trailer energy, building',
      productionNotes: 'Generation pending — requires Lee\'s paid API access. Status: ready_for_generation',
    },
    {
      orderIndex: 4,
      title: 'Scene 5 — Signal Black Mini-Trailer Insert',
      description: 'A short dramatic sequence from within SIGNAL BLACK itself — rainy neon Melbourne, Detective Mara Vale, the Oracle system, near-future noir.',
      aiPromptOverride: 'Near-future Melbourne sci-fi noir, rainy neon street, female detective in black coat, public safety screen glitches with future homicide report, underground AI command room, gold probability lines, noir thriller atmosphere, cinematic high contrast.',
      timeOfDay: 'night',
      weather: 'rainy',
      lighting: 'neon',
      cameraAngle: 'low-angle',
      mood: 'noir, tense, atmospheric',
      locationType: 'city street',
      city: 'Melbourne',
      country: 'Australia',
      colorPalette: 'neon-drenched noir, gold probability lines',
      musicMood: 'noir thriller, atmospheric tension',
      productionNotes: 'Generation pending — requires Lee\'s paid API access. Status: ready_for_generation',
    },
    {
      orderIndex: 5,
      title: 'Scene 6 — Upload / Viral Moment',
      description: "Sunrise. Leo and Mia upload the Signal Black trailer concept. Leo's phone explodes with notifications. The moment goes viral.",
      aiPromptOverride: 'Sunrise in messy apartment, exhausted filmmaker and friends uploading a trailer, phone exploding with notifications, social media comments, viral moment, comedic excitement, cinematic lighting.',
      timeOfDay: 'dawn',
      weather: 'clear',
      lighting: 'natural',
      cameraAngle: 'medium',
      mood: 'euphoric, comedic',
      locationType: 'apartment',
      city: 'Melbourne',
      country: 'Australia',
      colorPalette: 'sunrise warm gold',
      musicMood: 'playful, victorious',
      productionNotes: 'Generation pending — requires Lee\'s paid API access. Status: ready_for_generation',
    },
    {
      orderIndex: 6,
      title: 'Scene 7 — The Calls and the Copycat',
      description: "Investors call Leo. Meanwhile Cass Bell tries to copy his success using fictional ClipWizard.ai — producing chaotic, inconsistent, hilarious failure clips.",
      aiPromptOverride: 'Split between messy apartment and sleek investor office, investor calling filmmaker, then rival creator using fictional generic AI tool ClipWizard.ai producing chaotic random clips, cowboy in space, inconsistent detective faces, robot dog sunglasses, wrong city skyline, funny failure montage.',
      timeOfDay: 'morning',
      weather: 'clear',
      lighting: 'natural',
      cameraAngle: 'medium',
      mood: 'comedic contrast',
      locationType: 'apartment / office split',
      city: 'Melbourne',
      country: 'Australia',
      colorPalette: 'warm apartment vs. cold sleek office',
      musicMood: 'playful beats during Cass failure montage',
      productionNotes: 'Generation pending — requires Lee\'s paid API access. Status: ready_for_generation',
    },
    {
      orderIndex: 7,
      title: 'Scene 8 — The Pitch',
      description: "Leo presents SIGNAL BLACK to investors in a modern meeting room. His production package is on the big screen. Uncle Ray accidentally joins the video call.",
      aiPromptOverride: 'Modern investor meeting room, filmmaker presenting SIGNAL BLACK production package on large screen, character cards, scene cards, visual DNA, funding targets, confident underdog energy, uncle accidentally on giant video call, comedic but triumphant.',
      timeOfDay: 'afternoon',
      weather: 'clear',
      lighting: 'studio',
      cameraAngle: 'wide',
      mood: 'triumphant, comedic',
      locationType: 'investor meeting room',
      city: 'Melbourne',
      country: 'Australia',
      colorPalette: 'sleek modern, black and gold accents',
      musicMood: 'confident, building',
      productionNotes: 'Generation pending — requires Lee\'s paid API access. Status: ready_for_generation',
    },
    {
      orderIndex: 8,
      title: 'Scene 9 — Final Rooftop',
      description: "Leo and Mia stand on a Melbourne rooftop at sunset. His phone lights up with investor meetings and press requests. Uncle Ray appears with cheap Hawaii leis.",
      aiPromptOverride: 'Melbourne rooftop at sunset, filmmaker and best friend overlooking skyline, emotional success moment, phone notifications for investor meeting and press requests, uncle holding cheap Hawaii leis, aspirational ending, cinematic black and gold style.',
      timeOfDay: 'golden-hour',
      weather: 'clear',
      lighting: 'natural',
      cameraAngle: 'wide',
      mood: 'emotional, aspirational',
      locationType: 'rooftop',
      city: 'Melbourne',
      country: 'Australia',
      colorPalette: 'golden hour, black and gold',
      musicMood: 'emotional uplift, premium final hit',
      productionNotes: 'Generation pending — requires Lee\'s paid API access. Status: ready_for_generation',
    },
    {
      orderIndex: 9,
      title: 'Optional End Tag',
      description: "Post-credits: Uncle Ray tries to pitch his own show to the Oracle AI. It rejects him instantly.",
      aiPromptOverride: 'Post-credits comedy beat — older Australian man pitching a show idea to a sleek AI interface, cold synthetic voice rejecting him, comedic timing, black and gold UI.',
      timeOfDay: 'night',
      weather: 'clear',
      lighting: 'neon',
      cameraAngle: 'medium',
      mood: 'comedic',
      locationType: 'apartment',
      city: 'Melbourne',
      country: 'Australia',
      colorPalette: 'dark with neon AI glow',
      musicMood: 'comedic sting',
      productionNotes: 'Generation pending — requires Lee\'s paid API access. Status: ready_for_generation. Optional scene.',
    },
  ];

  const EXPECTED_ASSETS = [
    'the_showrunner_full.mp4',
    'the_showrunner_30s.mp4',
    'the_showrunner_15s.mp4',
    'the_showrunner_poster.png',
    'the_showrunner_thumbnail.png',
    'the_showrunner_captions.srt',
    'the_showrunner_assets.json',
  ].join('\n');

  async function main() {
    console.log('── THE SHOWRUNNER seed script ─────────────────────────────────────────');
    console.log('   Target user : leego972@gmail.com');
    console.log('   Action      : project creation only (no generation APIs called)');
    console.log('───────────────────────────────────────────────────────────────────────\n');

    const connection = await mysql.createConnection(DATABASE_URL);

    // ── 1. Find the owner user ──────────────────────────────────────────────────
    const [userRows] = await connection.execute(
      'SELECT id, email, name, role FROM users WHERE email = ?',
      [OWNER_EMAIL]
    );

    if (userRows.length === 0) {
      console.error(`❌  User ${OWNER_EMAIL} not found. Cannot create project.`);
      console.error('   Please ensure the user exists before running this script.');
      await connection.end();
      process.exit(1);
    }

    const user = userRows[0];
    console.log(`✅  Found user: ${user.name} <${user.email}> (id=${user.id}, role=${user.role})`);

    // ── 2. Check if project already exists ─────────────────────────────────────
    const [existingRows] = await connection.execute(
      "SELECT id FROM projects WHERE userId = ? AND title = 'THE SHOWRUNNER'",
      [user.id]
    );

    if (existingRows.length > 0) {
      console.log(`⚠️   Project "THE SHOWRUNNER" already exists (id=${existingRows[0].id}) for this user.`);
      console.log('   Skipping creation. Delete the existing project to re-seed.');
      await connection.end();
      process.exit(0);
    }

    // ── 3. Create the project ───────────────────────────────────────────────────
    const projectDescription = [
      'Tagline: No crew. No budget. One link.',
      '',
      'Logline: A broke Melbourne filmmaker receives an email from an old school friend retired in Hawaii, reminding him how funny and imaginative his stories once were. The email includes a link to Virelle.life. One click turns Leo\'s forgotten storytelling talent into SIGNAL BLACK, a viral hit-show package — and suddenly everyone wants a piece of it.',
      '',
      'Generation status: pending_paid_api',
      'Expected assets:\n' + EXPECTED_ASSETS,
      '',
      'DISCLAIMER:\n' + DISCLAIMER,
    ].join('\n');

    const [projectResult] = await connection.execute(
      `INSERT INTO projects
         (userId, title, description, mode, rating, duration, genre, plotSummary,
          status, progress, quality, resolution,
          mainPlot, sidePlots, characterArcs, themes, setting,
          actStructure, tone, cinemaIndustry, targetAudience,
          openingScene, climax, storyResolution,
          exportAspectRatio, createdAt, updatedAt)
       VALUES
         (?, ?, ?, 'manual', 'PG-13', 4, 'Comedy / Drama / Sci-Fi', ?,
          'draft', 0, 'ultra', '1920x1080',
          ?, ?, ?, ?, ?,
          'three-act', 'Comedic, Inspirational, Cinematic', 'Australian', 'Independent filmmakers, storytellers, AI-curious creatives',
          ?, ?, ?,
          '16:9', NOW(), NOW())`,
      [
        user.id,
        'THE SHOWRUNNER',
        projectDescription,
        // plotSummary
        'Leo Vale is a broke, sleep-deprived Melbourne filmmaker with old scripts, no budget, and one dying laptop. When Sam, an old school friend now retired in Hawaii, emails him a link to Virelle.life, Leo clicks it and discovers Virelle Studios. Inside Virelle, Leo turns one sci-fi idea into SIGNAL BLACK — a complete production package with story, characters, scene cards, trailer, poster direction, music direction, and pitch assets. The trailer concept goes viral. Investors call. His old rival Cass Bell tries to copy him using a fictional generic AI tool and fails spectacularly. Leo pitches Signal Black in a real investor meeting — with Uncle Ray accidentally crashing the video call — and walks out with a deal.',
        // mainPlot
        'Leo discovers Virelle Studios via a link from Sam Kealoha and uses it to build SIGNAL BLACK, a complete sci-fi noir production package. The show goes viral, investors call, and Leo transforms from a stuck filmmaker into a real showrunner.',
        // sidePlots
        'Cass Bell (rival content creator) tries to copy Leo's success using fictional ClipWizard.ai — producing chaotic, inconsistent clips as a contrast to Virelle's consistent character-driven output. Uncle Ray provides comic relief throughout and accidentally joins the pitch meeting.',
        // characterArcs
        'Leo: Stuck → Inspired → Overwhelmed → Confident showrunner. Mia: Skeptical → Converted → Proud collaborator. Uncle Ray: Suspicious of AI → Still suspicious but supportive.',
        // themes
        'Storytelling as a superpower. Tools amplify talent — they do not replace it. The difference between clips and a show. Friendship, belief, and the courage to begin.',
        // setting
        'Present-day Melbourne, Australia. Leo's tiny apartment. A fictional near-future Melbourne for the Signal Black insert (sci-fi noir, rainy neon streets, underground AI studio). Investor meeting room. Melbourne rooftop at golden hour.',
        // openingScene
        'Leo Vale sits in his messy Melbourne apartment at night, surrounded by old scripts and unpaid bills, typing on a dying laptop. Mia eats noodles and watches him. Classic stuck-filmmaker energy.',
        // climax
        'Leo presents the complete SIGNAL BLACK production package to investors using Virelle's output — character cards, scene cards, visual DNA, funding targets, pitch deck. Uncle Ray crashes the video call. Leo gets the deal.',
        // storyResolution
        'Leo and Mia stand on a Melbourne rooftop at golden hour. His phone lights up. Uncle Ray arrives with cheap Hawaii leis. The story ends where every real production begins: with a deal, a team, and the show actually happening.',
      ]
    );

    const projectId = projectResult.insertId;
    console.log(`✅  Created project "THE SHOWRUNNER" (id=${projectId})`);

    // ── 4. Create characters ────────────────────────────────────────────────────
    let charCount = 0;
    for (const char of CHARACTERS) {
      await connection.execute(
        `INSERT INTO characters
           (userId, projectId, name, role, storyImportance, occupation,
            description, backstory, motivations, speechPattern,
            nationality, city, country, voiceDescription, castingNotes,
            createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          user.id,
          projectId,
          char.name,
          char.role || null,
          char.storyImportance || null,
          char.occupation || null,
          char.description || null,
          char.backstory || null,
          char.motivations || null,
          char.speechPattern || null,
          char.nationality || null,
          char.city || null,
          char.country || null,
          char.voiceDescription || null,
          char.castingNotes || null,
        ]
      );
      charCount++;
      console.log(`   ✓ Character: ${char.name}`);
    }
    console.log(`✅  Created ${charCount} characters`);

    // ── 5. Create scenes ────────────────────────────────────────────────────────
    let sceneCount = 0;
    for (const scene of SCENES) {
      await connection.execute(
        `INSERT INTO scenes
           (projectId, orderIndex, title, description,
            timeOfDay, weather, lighting, cameraAngle,
            mood, locationType, city, country,
            colorPalette, musicMood, aiPromptOverride, productionNotes,
            duration, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 30, NOW(), NOW())`,
        [
          projectId,
          scene.orderIndex,
          scene.title,
          scene.description,
          scene.timeOfDay,
          scene.weather,
          scene.lighting,
          scene.cameraAngle,
          scene.mood || null,
          scene.locationType || null,
          scene.city || null,
          scene.country || null,
          scene.colorPalette || null,
          scene.musicMood || null,
          scene.aiPromptOverride,
          scene.productionNotes,
        ]
      );
      sceneCount++;
      console.log(`   ✓ Scene ${scene.orderIndex + 1}: ${scene.title}`);
    }
    console.log(`✅  Created ${sceneCount} scenes`);

    // ── 6. Verify ───────────────────────────────────────────────────────────────
    console.log('\n── Verification ───────────────────────────────────────────────────────');

    const [pRows] = await connection.execute(
      "SELECT id, title, status, mode, genre, duration FROM projects WHERE id = ?",
      [projectId]
    );
    console.log('   Project  :', JSON.stringify(pRows[0]));

    const [cRows] = await connection.execute(
      "SELECT COUNT(*) as count FROM characters WHERE projectId = ?",
      [projectId]
    );
    console.log('   Characters:', cRows[0].count);

    const [sRows] = await connection.execute(
      "SELECT COUNT(*) as count FROM scenes WHERE projectId = ?",
      [projectId]
    );
    console.log('   Scenes   :', sRows[0].count);

    await connection.end();

    console.log('\n── Summary ────────────────────────────────────────────────────────────');
    console.log(`   Project created in My Projects : YES`);
    console.log(`   Owner email                    : ${OWNER_EMAIL}`);
    console.log(`   Project ID                     : ${projectId}`);
    console.log(`   Scenes added                   : YES (${sceneCount})`);
    console.log(`   Characters added               : YES (${charCount})`);
    console.log(`   Generation prompts present     : YES (aiPromptOverride on every scene)`);
    console.log(`   Status set to draft            : YES (ready for generation, no API called)`);
    console.log(`   No generation APIs called      : YES`);
    console.log(`   No credits spent               : YES`);
    console.log(`   No credentials stored          : YES`);
    console.log('───────────────────────────────────────────────────────────────────────\n');
  }

  main().catch((err) => {
    console.error('❌  Error:', err.message);
    process.exit(1);
  });
  