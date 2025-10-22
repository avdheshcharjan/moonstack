export async function GET() {
  const URL = process.env.NEXT_PUBLIC_URL as string;

  return Response.json({
    accountAssociation: {
      header: '',
      payload: '',
      signature: '',
    },
    baseBuilder: {
      allowedAddresses: [''], // Add your Base Account address here
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
