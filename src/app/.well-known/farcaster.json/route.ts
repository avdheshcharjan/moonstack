export async function GET() {
  const URL = process.env.NEXT_PUBLIC_URL as string;

  return Response.json({
    accountAssociation: {
      header: "eyJmaWQiOjI1OTE0OCwidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweDgyYjU0NkJiOTc5OUM4YThGMDc4NThmZEIxZWU3OUI4RjY5RkFCMDAifQ",
      payload: "eyJkb21haW4iOiJtb29uc3RhY2suZnVuIn0",
      signature: "Bp0TQQ/4Q8kJbYt1ZbwEyJyX9z1z6MSE4cNN+MimlgYMho7ZMbPoAXZbGfYgdBowwrBqNB/u/yfqxwTbZUKQwRs=",
    },
    baseBuilder: {
      ownerAddress: '0x88eBc2a2BCD44947c78DD80407F6Dc5b00049C1E',
    },
    miniapp: {
      version: '1',
      name: 'Moonstack',
      homeUrl: URL || 'https://moonstack.fun',
      iconUrl: `${URL}/logo.png`,
      splashImageUrl: `${URL}/logo_splash.png`,
      splashBackgroundColor: '#000d1d',
      webhookUrl: `${URL}/api/webhook`,
      subtitle: 'Swipe to Predict',
      description: 'Predict Crypto with Yes and No.',
      screenshotUrls: [
        `${URL}/logo.png`,
        `${URL}/logo_splash.png`,
        `${URL}/logo_hero.png`
      ],
      primaryCategory: 'finance',
      tags: ['trading', 'news-media', 'games', 'socials', 'predictions'],
      heroImageUrl: `${URL}/logo_hero.png`,
      tagline: 'Swipe To Predict',
      ogTitle: 'Moonstack',
      ogDescription: 'Swipe to Predict',
      ogImageUrl: `${URL}/logo.png`,
      noindex: false,
    },
  });
}
