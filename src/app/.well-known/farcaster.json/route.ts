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
      splashImageUrl: `${URL}/splash.png`,
      splashBackgroundColor: '#000d1d',
      webhookUrl: `${URL}/api/webhook`,
      subtitle: 'Moonstack is a platform for trading options on-chain',
      description: 'A fast, fun way to trade options and manage your positions in real time.',
      screenshotUrls: [
        `${URL}/screenshot1.png`,
        `${URL}/screenshot2.png`,
        `${URL}/screenshot3.png`,
      ],
      primaryCategory: 'social',
      tags: ['trading', 'defi', 'options'],
      heroImageUrl: `${URL}/og.png`,
      tagline: 'Trade instantly',
      ogTitle: 'Thetanuts Trading Demo',
      ogDescription: 'Trade options in real time.',
      ogImageUrl: `${URL}/og.png`,
      noindex: true,
    },
  });
}
