"use client";

import { useState, useEffect, useRef } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Gift,
  ExternalLink,
  AlertTriangle,
  Share2,
} from "lucide-react";
import AuraNFTContract from "@/contracts/AuraNFT.json";
import { parseEther } from "viem";
import { fetchNeynarProfile } from "@/services/nft/neynar";
import { checkMultiAddressOwnership } from "@/utils/nft/ownership";
import { useFarcasterMiniApp } from "@/hooks/use-farcaster-miniapp";
import { sdk } from "@farcaster/miniapp-sdk";

interface GiftNFTDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipient: {
    fid: number;
    username: string;
    display_name: string;
    pfp_url: string;
    verified_addresses?: {
      eth_addresses?: string[];
    };
  };
  profileId: number | null;
}

type GiftStep =
  | "idle"
  | "checking"
  | "generating"
  | "uploading"
  | "minting"
  | "awarding"
  | "success"
  | "error";

export function GiftNFTDialog({
  open,
  onOpenChange,
  recipient,
  profileId,
}: GiftNFTDialogProps) {
  const { address, isConnected } = useAccount();
  const { isInFarcaster, farcasterFid } = useFarcasterMiniApp();
  const [currentStep, setCurrentStep] = useState<GiftStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [ipfsImageUrl, setIpfsImageUrl] = useState<string | null>(null);
  const [metadataUrl, setMetadataUrl] = useState<string | null>(null);
  const [tier, setTier] = useState<number | null>(null);
  const [traits, setTraits] = useState<any>(null);
  const [recipientWallet, setRecipientWallet] = useState<string | null>(null);

  const confirmedTxHashRef = useRef<string | null>(null);

  const {
    writeContract,
    data: hash,
    isPending,
    error: contractError,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError,
  } = useWaitForTransactionReceipt({ hash });

  const NFT_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS;

  // Reset dialog state
  const resetDialog = () => {
    setCurrentStep("idle");
    setError(null);
    setGeneratedImage(null);
    setIpfsImageUrl(null);
    setMetadataUrl(null);
    setTier(null);
    setTraits(null);
    setRecipientWallet(null);
    confirmedTxHashRef.current = null;
  };

  // Handle dialog close
  const handleClose = () => {
    if (currentStep !== "minting" && currentStep !== "awarding") {
      resetDialog();
      onOpenChange(false);
    }
  };

  // Main gift flow
  const handleGift = async () => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!profileId) {
      toast.error("Please visit the home page to create your profile first");
      return;
    }

    // Prevent users from gifting to themselves
    if (farcasterFid && recipient.fid === farcasterFid) {
      toast.error("You cannot gift an AURA to yourself!");
      setError("You cannot gift an AURA to yourself!");
      setCurrentStep("error");
      return;
    }

    try {
      // Step 1: Fetch full recipient profile and check all wallet addresses
      setCurrentStep("checking");
      setError(null);

      console.log("[Gift] Fetching full recipient profile from Neynar...");

      // Fetch complete user profile with all wallet addresses
      const recipientProfile = await fetchNeynarProfile(recipient.fid);

      // Build list of addresses to check
      const addressesToCheck: string[] = [];

      // Add primary address first (if exists)
      if (recipientProfile.primaryEthAddress) {
        addressesToCheck.push(recipientProfile.primaryEthAddress);
        console.log(
          "[Gift] Primary address:",
          recipientProfile.primaryEthAddress
        );
      }

      // Add verified addresses (excluding primary if already added)
      if (
        recipientProfile.verifiedEthAddresses &&
        recipientProfile.verifiedEthAddresses.length > 0
      ) {
        recipientProfile.verifiedEthAddresses.forEach((addr) => {
          const normalizedAddr = addr.toLowerCase();
          const alreadyIncluded = addressesToCheck.some(
            (existing) => existing.toLowerCase() === normalizedAddr
          );
          if (!alreadyIncluded) {
            addressesToCheck.push(addr);
          }
        });
        console.log(
          "[Gift] Total verified addresses:",
          recipientProfile.verifiedEthAddresses.length
        );
      }

      console.log(
        "[Gift] Checking",
        addressesToCheck.length,
        "unique addresses for NFT ownership"
      );

      // Check if any addresses exist
      if (addressesToCheck.length === 0) {
        throw new Error(
          `${recipient.display_name} doesn't have a verified wallet address on Farcaster`
        );
      }

      // Check if ANY address owns an NFT using Alchemy
      const ownershipCheck = await checkMultiAddressOwnership(
        addressesToCheck,
        NFT_CONTRACT_ADDRESS!
      );

      if (ownershipCheck.ownsNFT) {
        throw new Error(
          `${recipient.display_name} already owns an AURA!`
        );
      }

      console.log("[Gift] No existing NFT found. Proceeding with gift...");

      // Use primary address (first in the list) for minting
      const recipientAddress = addressesToCheck[0];
      setRecipientWallet(recipientAddress);

      // Step 2: Generate NFT for recipient
      setCurrentStep("generating");

      const generateRes = await fetch("/api/nft/gift-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientFid: recipient.fid,
          recipientUsername: recipient.username,
          recipientDisplayName: recipient.display_name,
          recipientPfpUrl: recipient.pfp_url,
        }),
      });

      if (!generateRes.ok) {
        const errorData = await generateRes.json();
        throw new Error(errorData.error || "Failed to generate NFT");
      }

      const generateData = await generateRes.json();
      setGeneratedImage(generateData.imageData);
      setTier(generateData.tier);
      setTraits(generateData.traits);

      // Step 3: Upload to IPFS
      setCurrentStep("uploading");

      const uploadRes = await fetch("/api/nft/upload-to-ipfs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageDataUrl: generateData.imageData,
          tier: generateData.tier,
          traits: generateData.traits,
          fid: recipient.fid,
        }),
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json();
        throw new Error(errorData.error || "Failed to upload to IPFS");
      }

      const uploadData = await uploadRes.json();
      setMetadataUrl(uploadData.metadataUrl);
      setIpfsImageUrl(uploadData.imageUrl);

      // Step 4: Mint NFT to recipient's wallet
      setCurrentStep("minting");

      writeContract({
        address: NFT_CONTRACT_ADDRESS as `0x${string}`,
        abi: AuraNFTContract.abi,
        functionName: "mint",
        args: [recipientAddress, uploadData.metadataUrl],
        value: parseEther("0.0003"),
      });
    } catch (err: any) {
      console.error("Gift error:", error);
      setError(err.message || "Failed to gift NFT");
      setCurrentStep("error");
      toast.error(err.message || "Failed to gift NFT", { duration: 6000 });
    }
  };

  // Handle transaction confirmation
  const handleConfirmed = async () => {
    if (!address || !profileId || !recipientWallet) return;

    try {
      // Step 5: Award points to both gifter and recipient
      setCurrentStep("awarding");

      // Step 5a: Check if recipient has a profile (create if needed)
      console.log("[Gift] Checking recipient profile for FID:", recipient.fid);
      let recipientProfileId: number | null = null;

      const recipientProfileRes = await fetch(
        `/api/profiles/by-fid/${recipient.fid}`
      );

      if (recipientProfileRes.ok) {
        const recipientProfile = await recipientProfileRes.json();
        recipientProfileId = recipientProfile.id;
        console.log("[Gift] Recipient profile exists:", recipientProfileId);
      } else if (recipientProfileRes.status === 404) {
        // Step 5b: Create recipient profile
        console.log("[Gift] Recipient profile not found, creating...");

        const createProfileRes = await fetch("/api/profiles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            farcasterFid: recipient.fid,
            displayName:
              recipient.display_name ||
              recipient.username ||
              `fid:${recipient.fid}`,
            avatarUrl: recipient.pfp_url || undefined,
            walletAddress: recipientWallet?.toLowerCase() || undefined,
          }),
        });

        if (!createProfileRes.ok) {
          const errorData = await createProfileRes.json();
          // Handle race condition - profile created by another process
          if (errorData.code === "DUPLICATE_FARCASTER_FID") {
            console.log("[Gift] Profile created concurrently, refetching...");
            const refetchRes = await fetch(
              `/api/profiles/by-fid/${recipient.fid}`
            );
            if (refetchRes.ok) {
              const recipientProfile = await refetchRes.json();
              recipientProfileId = recipientProfile.id;
            } else {
              console.warn("[Gift] Failed to fetch concurrent profile");
            }
          } else {
            // Non-duplicate error - log but don't fail
            console.warn(
              "[Gift] Failed to create recipient profile:",
              errorData.error
            );
          }
        } else {
          const recipientProfile = await createProfileRes.json();
          recipientProfileId = recipientProfile.id;
          console.log("[Gift] Created recipient profile:", recipientProfileId);
        }
      } else {
        console.warn("[Gift] Unexpected error checking recipient profile");
      }

      // Step 5c: Award points to both gifter and recipient using the new API
      const awardRes = await fetch("/api/tasks/gift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gifterProfileId: profileId,
          gifterWalletAddress: address,
          recipientProfileId: recipientProfileId,
          recipientWalletAddress: recipientWallet,
          recipientFid: recipient.fid,
          recipientUsername: recipient.username,
          recipientDisplayName: recipient.display_name,
        }),
      });

      if (!awardRes.ok) {
        const errorData = await awardRes.json();
        throw new Error(errorData.error || "Failed to award points");
      }

      const awardData = await awardRes.json();
      console.log("[Gift] Points awarded:", {
        gifter: awardData.gifterPoints,
        recipient: awardData.recipientPoints,
        recipientAwarded: awardData.recipientAwarded,
      });

      // Step 6: Success
      setCurrentStep("success");
      const successMessage = awardData.recipientAwarded
        ? `NFT gifted to ${recipient.display_name}! You earned +${awardData.gifterPoints} AURA, they earned +${awardData.recipientPoints} AURA`
        : `NFT gifted to ${recipient.display_name}! You earned +${awardData.gifterPoints} AURA`;

      toast.success(successMessage);
    } catch (err: any) {
      console.error("Award points error:", err);
      // Still show success state even if points fail
      setCurrentStep("success");
      toast.success(
        `NFT gifted to ${recipient.display_name}! Points will be credited shortly.`
      );
    }
  };

  // Handle share functionality
  const handleShare = async () => {
    // Use IPFS image URL if available, otherwise use generated data URL
    let imageToShare = ipfsImageUrl || generatedImage;
    if (!imageToShare) return;

    console.log("[GiftNFTDialog] Original image URL:", imageToShare);

    // Convert IPFS URL to HTTP gateway URL if needed
    if (imageToShare.startsWith("ipfs://")) {
      const hash = imageToShare.replace("ipfs://", "");
      imageToShare = `https://ipfs.io/ipfs/${hash}`;
      console.log("[GiftNFTDialog] Converted to HTTP gateway:", imageToShare);
    }

    const shareText = `Just gifted an AURA to @${recipient.username} onchain @auramaxdotfun! 🎁✨`;

    // Generate share page URL with NFT image
    const sharePageUrl = `${window.location.origin}/share?image=${encodeURIComponent(imageToShare)}`;

    console.log("[GiftNFTDialog] Share page URL:", sharePageUrl);
    console.log("[GiftNFTDialog] Final image URL:", imageToShare);

    if (isInFarcaster) {
      try {
        // Ensure SDK is ready before using it
        await sdk.actions.ready();

        console.log("[GiftNFTDialog] Composing cast with share page:", {
          sharePageUrl,
        });

        // Use composeCast with share page URL
        const result = await sdk.actions.composeCast({
          text: shareText,
          embeds: [sharePageUrl],
        });

        if (result?.cast) {
          toast.success("Cast posted successfully!");
          console.log("[GiftNFTDialog] Cast hash:", result.cast.hash);
        } else {
          console.log("[GiftNFTDialog] User cancelled cast composition");
        }
      } catch (error) {
        console.error("[GiftNFTDialog] Error composing cast:", error);
        // Fallback to clipboard
        try {
          await navigator.clipboard.writeText(`${shareText}\n${sharePageUrl}`);
          toast.success("Share text copied to clipboard!");
        } catch (err) {
          toast.error("Failed to share");
        }
      }
    } else {
      // Web Share API or clipboard fallback
      if (navigator.share) {
        try {
          await navigator.share({
            text: shareText,
            url: sharePageUrl,
          });
          toast.success("Shared successfully!");
        } catch (error) {
          console.log("Share cancelled or failed:", error);
        }
      } else {
        // Fallback to clipboard
        try {
          await navigator.clipboard.writeText(`${shareText}\n${sharePageUrl}`);
          toast.success("Share text copied to clipboard!");
        } catch (err) {
          toast.error("Failed to copy to clipboard");
        }
      }
    }
  };

  // Watch for transaction errors
  useEffect(() => {
    if (
      contractError &&
      currentStep === "minting" &&
      !isConfirmed &&
      !isConfirming &&
      (!hash || hash !== confirmedTxHashRef.current)
    ) {
      console.error("Contract error:", contractError);

      let errorMessage = "Transaction failed";
      const errorMsg = (contractError.message || "").toLowerCase();

      if (
        errorMsg.includes("user rejected") ||
        errorMsg.includes("user denied")
      ) {
        errorMessage =
          "You cancelled the transaction. Click 'Retry' to gift the NFT.";
        toast.info(errorMessage, { duration: 5000 });
      } else if (
        errorMsg.includes("insufficient funds") ||
        errorMsg.includes("insufficient balance")
      ) {
        errorMessage =
          "Insufficient funds. Please add more ETH to your wallet.";
        toast.error(errorMessage, { duration: 6000 });
      } else {
        errorMessage = contractError.message || "Transaction failed";
        toast.error(errorMessage, { duration: 6000 });
      }

      setError(errorMessage);
      setCurrentStep("error");
    }
  }, [contractError, currentStep, isConfirmed, isConfirming, hash]);

  // Watch for confirmation errors
  useEffect(() => {
    if (confirmError && currentStep === "minting" && !isConfirmed) {
      console.error("Confirmation error:", confirmError);

      const errorMessage =
        "Transaction confirmation timeout. Check BaseScan to verify the transaction.";

      setError(errorMessage);
      setCurrentStep("error");
      toast.error(errorMessage, { duration: 8000 });
    }
  }, [confirmError, currentStep, isConfirmed]);

  // Watch for confirmation
  useEffect(() => {
    if (isConfirmed && currentStep === "minting" && hash) {
      confirmedTxHashRef.current = hash;
      console.log("[GiftNFTDialog] Transaction confirmed:", hash);
      handleConfirmed();
    }
  }, [isConfirmed, currentStep, hash]);

  const getStepMessage = () => {
    switch (currentStep) {
      case "checking":
        return "Checking all recipient wallets for existing NFTs...";
      case "generating":
        return `Generating AURA for ${recipient.display_name}...`;
      case "uploading":
        return "Uploading to IPFS...";
      case "minting":
        return isPending
          ? "Waiting for wallet approval..."
          : isConfirming
            ? "Minting NFT to recipient..."
            : "Preparing transaction...";
      case "awarding":
        return "Awarding you 3000 points...";
      case "success":
        return "Gift sent successfully!";
      case "error":
        return error || "An error occurred";
      default:
        return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Gift AURA
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipient Info */}
          {currentStep === "idle" && (
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-2">Gifting to:</p>
              <div className="flex items-center gap-3">
                <img
                  src={recipient.pfp_url}
                  alt={recipient.display_name}
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <p className="font-semibold">{recipient.display_name}</p>
                  <p className="text-sm text-muted-foreground">
                    @{recipient.username}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Progress */}
          {currentStep !== "idle" &&
            currentStep !== "success" &&
            currentStep !== "error" && (
              <div className="flex items-center justify-center py-8">
                <div className="text-center space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                  <p className="text-sm text-muted-foreground">
                    {getStepMessage()}
                  </p>
                </div>
              </div>
            )}

          {/* Success State */}
          {currentStep === "success" && (
            <div className="text-center py-6 space-y-4">
              <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
              <div>
                <h3 className="font-bold text-lg mb-2">Gift Sent!</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Successfully gifted AURA NFT to {recipient.display_name}
                  <br />
                  <span className="font-bold text-primary">
                    You earned 3000 AURA points!
                  </span>
                  <br />
                  <span className="text-xs text-muted-foreground">
                    {recipient.display_name} earned 2000 AURA points
                  </span>
                </p>
              </div>

              {generatedImage && (
                <div className="rounded-lg border border-border overflow-hidden">
                  <img
                    src={generatedImage}
                    alt="Gifted NFT"
                    className="w-full aspect-square object-cover"
                  />
                </div>
              )}

              <div className="space-y-2 w-full">
                <Button
                  onClick={handleShare}
                  variant="default"
                  className="w-full"
                  disabled={!generatedImage && !ipfsImageUrl}
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Share Gift
                </Button>

                {hash && (
                  <Button
                    onClick={() =>
                      window.open(`https://basescan.org/tx/${hash}`, "_blank")
                    }
                    variant="outline"
                    className="w-full"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Transaction
                  </Button>
                )}

                <Button
                  onClick={handleClose}
                  variant="outline"
                  className="w-full"
                >
                  Done
                </Button>
              </div>
            </div>
          )}

          {/* Error State */}
          {currentStep === "error" && (
            <div className="text-center py-6 space-y-4">
              <XCircle className="h-16 w-16 mx-auto text-red-500" />
              <div>
                <h3 className="font-bold text-lg mb-2">Gift Failed</h3>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleGift}
                  variant="outline"
                  className="flex-1"
                >
                  Retry
                </Button>
                <Button
                  onClick={handleClose}
                  variant="default"
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          )}

          {/* Idle State - Start Button */}
          {currentStep === "idle" && (
            <div className="space-y-4">
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-primary mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold mb-1">Before you gift:</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• The AURA will be sent to their wallet</li>
                      <li>• You'll earn 3000 AURA</li>
                      <li>• They will earn 2000 AURA</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleGift}
                className="w-full"
                size="lg"
                disabled={!isConnected}
              >
                <Gift className="mr-2 h-5 w-5" />
                Gift AURA (0.0003 ETH)
              </Button>

              {!isConnected && (
                <p className="text-sm text-center text-muted-foreground">
                  Please connect your wallet to continue
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
