import { Metadata } from "next";

interface SharePageProps {
  searchParams: { image?: string };
}

export async function generateMetadata({
  searchParams,
}: SharePageProps): Promise<Metadata> {
  const nftImage = searchParams.image;

  if (!nftImage) {
    return {
      title: "MOONSTACK NFT",
      description: "Mint your MOONSTACK NFT",
    };
  }

  // Generate the dynamic image URL
  const imageUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "https://moonstack.fun"}/api/nft-image?image=${encodeURIComponent(nftImage)}`;
  const miniappUrl = "https://moonstack.fun/";

  // Farcaster Mini App embed configuration
  const miniappConfig = {
    version: "1",
    imageUrl: imageUrl,
    button: {
      title: "Mint Your MOON",
      action: {
        type: "launch_frame",
        name: "MOON",
        url: miniappUrl,
        splashImageUrl: imageUrl,
        splashBackgroundColor: "#000000",
      },
    },
  };

  return {
    title: "My MOON NFT",
    description: "Just minted my MOON onchain @moonstackdotfun!",
    openGraph: {
      title: "My MOON NFT",
      description: "Just minted my MOON onchain @moonstackdotfun!",
      images: [imageUrl],
    },
    other: {
      "fc:miniapp": JSON.stringify(miniappConfig),
    },
  };
}

export default function SharePage({ searchParams }: SharePageProps) {
  const nftImage = searchParams.image;

  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      {nftImage ? (
        <div className="max-w-2xl w-full p-4">
          <img
            src={nftImage}
            alt="MOON NFT"
            className="w-full h-auto rounded-lg"
          />
          <div className="mt-4 text-center">
            <h1 className="text-2xl font-bold text-white mb-2">
              Just minted my MOON!
            </h1>
            <p className="text-gray-400">
              View this in Base App to mint your own
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-2">MOON NFT</h1>
          <p className="text-gray-400">Invalid share link</p>
        </div>
      )}
    </div>
  );
}
