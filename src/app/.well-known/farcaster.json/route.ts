function withValidProperties(properties: Record<string, undefined | string | string[]>) {
    return Object.fromEntries(
        Object.entries(properties).filter(([_, value]) => (Array.isArray(value) ? value.length > 0 : !!value))
    );
    }
    
    export async function GET() {
    const URL = process.env.NEXT_PUBLIC_URL as string;
    return Response.json({
        "accountAssociation": {
          "header": "REPLACE_WITH_HEADER_FROM_SCRIPT",
          "payload": "REPLACE_WITH_PAYLOAD_FROM_SCRIPT",
          "signature": "REPLACE_WITH_SIGNATURE_FROM_SCRIPT"
        },
        "frame": {
          "version": "1",
          "name": "MOONSTACK",
          "iconUrl": "https://www.moonstack.fun/logo.png",
          "splashImageUrl": "https://www.moonstack.fun/logo.png",
          "splashBackgroundColor": "#000d1d",
          "homeUrl": "https://www.moonstack.fun/",
          "webhookUrl": "https://www.moonstack.fun/api/webhook"
        },
        "baseBuilder": {
          "allowedAddresses": [
            "0xeb25729836dFC723A0ad35eCDEf95C9F5FFBFca9"
          ]
        },
        "metadata": {
          "name": "MOONSTACK",
          "description": "Predict market movements and earn returns on Base.",
          "category": "finance",
          "tags": ["options", "trading", "defi", "predictions", "base"],
          "images": {
            "icon": "https://www.moonstack.fun/logo.png",
            "splash": "https://www.moonstack.fun/logo.png"
          }
        }
      }); // see the next step for the manifest_json_object
    }