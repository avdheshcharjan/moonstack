export async function GET() {
  const URL = process.env.NEXT_PUBLIC_URL as string;

  return Response.json({
    accountAssociation: {
      header: "",
      payload: "",
      signature: "",
    },
    miniapp: {
      version: '1',
      name: 'Moonstack',
      homeUrl: URL || 'https://moonstack.fun',
      iconUrl: `${URL}/logo.png`,
      splashImageUrl: `${URL}/logo_splash.png`,
      splashBackgroundColor: '#000d1d',
      webhookUrl: `${URL}/api/webhook`,
      subtitle: 'Swipe, Predict, and Earn',
      description: 'Predict Crypto with Yes and No.',
      screenshotUrls: [
        `${URL}/logo.png`,
        `${URL}/logo_splash.png`,
        `${URL}/logo_hero.png`
      ],
      primaryCategory: 'finance',
      tags: ['trading', 'news-media', 'games', 'socials', 'predictions'],
      heroImageUrl: `${URL}/logo_hero.png`,
      tagline: 'Swipe, Predict, and Earn.',
      ogTitle: 'Moonstack',
      ogDescription: 'Swipe to Predict',
      ogImageUrl: `${URL}/logo.png`,
      noindex: false,
    },
  });
}
