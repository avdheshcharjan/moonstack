# Paymaster & Bundler Troubleshooting

This tutorial explains how to debug common issues you may face when sending UserOperations.

## Execution reverted

The UserOperation was able to make it onchain, but an error occurred in one of the smart contracts it interacted with, and thus the entire operation had to be reverted. This can be due to

* Not enough gas to pay for execution
  * Try increasing the `preVerificationGas` or `callGasLimit` padding
* An issue with the `callData` of your UserOperations
  * This is an issue with your dapp's smart contract, which you will need to debug.

You can use a tool like [Tenderly](https://dashboard.tenderly.co/) to help simulate and debug the UserOperation.

### Issue regarding gas estimation

If you think the issue may be related to gas, simulate using the Entrypoint contract, `0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789`, and pasting in your UserOperation into the `tuple` field.

For example, your UserOperation may look something like

```
{
  "callData": "0xb61d27f600000000000000000000000066519fcaee1ed65bc9e0acc25ccd900668d3ed490000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000443f84ac0e0000000000000000000000001e3143e0ed8c0ea51f1551b6c355e02f3e0baae0000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000",
  "paymasterAndData": "0xc484bcd10ab8ad132843872deb1a0adc1473189c000066cd03db0000000000000098973f00000a968163f0a57b400000018633de6cf5e53752c5eac49e8f8ffb4ecd16b2afe7b4074086d6693536a9ab1f117bae0b427f83f94246c34d25add97b05e8a73859c2dceef6ee730ab2842bf31b",
  "sender": "0x1e3143E0ED8C0Ea51F1551B6c355e02f3e0bAae0",
  "initCode": "0x",
  "maxFeePerGas": "3000000000",
  "maxPriorityFeePerGas": "1000000000",
  "nonce": "31815307923431762811356398485504",
  "signature": "0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000041ca7a742cff01aa9d5e377c5a146b5d8f03a4e44bd1817b1899bf7e0ff6885ed63294c69f017fe47f385c046055cc687e503bba08513ff52fbf21dcd8019c1f1d1b00000000000000000000000000000000000000000000000000000000000000",
  "callGasLimit": "257565",
  "preVerificationGas": "96024",
  "verificationGasLimit": "87888"
}
```

You can use the `simulateHandleOp` function and pass that UserOperation in the `op` field (don't forget to add array brackets around it, because technically it handles a "bundle" of UserOperations).

<Accordion title="Expand for images and click to enlarge">
  <img src="https://mintcdn.com/coinbase-prod/s_QeFV8SFwGVfV_u/paymaster/images/pb-paymaster-tenderly-entrypoint.png?fit=max&auto=format&n=s_QeFV8SFwGVfV_u&q=85&s=41b481bd2c828c215a14e9f7949d6acb" data-og-width="1842" width="1842" data-og-height="1702" height="1702" data-path="paymaster/images/pb-paymaster-tenderly-entrypoint.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/coinbase-prod/s_QeFV8SFwGVfV_u/paymaster/images/pb-paymaster-tenderly-entrypoint.png?w=280&fit=max&auto=format&n=s_QeFV8SFwGVfV_u&q=85&s=9dcd5f77e0d54f2b8963d8eeb32911c9 280w, https://mintcdn.com/coinbase-prod/s_QeFV8SFwGVfV_u/paymaster/images/pb-paymaster-tenderly-entrypoint.png?w=560&fit=max&auto=format&n=s_QeFV8SFwGVfV_u&q=85&s=7638380caf25f989fd10e34927e03718 560w, https://mintcdn.com/coinbase-prod/s_QeFV8SFwGVfV_u/paymaster/images/pb-paymaster-tenderly-entrypoint.png?w=840&fit=max&auto=format&n=s_QeFV8SFwGVfV_u&q=85&s=38a5ffa0bc31e44f538f75da1386a75d 840w, https://mintcdn.com/coinbase-prod/s_QeFV8SFwGVfV_u/paymaster/images/pb-paymaster-tenderly-entrypoint.png?w=1100&fit=max&auto=format&n=s_QeFV8SFwGVfV_u&q=85&s=eea7bff2ed3d999d9353f3dc2426654f 1100w, https://mintcdn.com/coinbase-prod/s_QeFV8SFwGVfV_u/paymaster/images/pb-paymaster-tenderly-entrypoint.png?w=1650&fit=max&auto=format&n=s_QeFV8SFwGVfV_u&q=85&s=311b8a83e7cdf593f9603dbd4adae89c 1650w, https://mintcdn.com/coinbase-prod/s_QeFV8SFwGVfV_u/paymaster/images/pb-paymaster-tenderly-entrypoint.png?w=2500&fit=max&auto=format&n=s_QeFV8SFwGVfV_u&q=85&s=8a10a1a7b40326378f0a0886c8559c6b 2500w" />
</Accordion>

### Execution reverted with data

Error may look something like this

```
cause: {
  "code": -32004,
  "message": " - execution reverted with data",
  "data": "0xed6c3dec00000000000000000000000036e53f56454e1206f775dafe2b33c1b737c43632"
}
```

You can use a tool like [https://bia.is/tools/abi-decoder/](https://bia.is/tools/abi-decoder/) to upload your ABI, enter the data in, and decode the error message. Try using the ABI of every smart contract your dapp could be interacting with.

### Execution reverted for an unknown reason

Similar to above, except your contract is reverting without any error codes. Try reviewing your smart contract's code, your `callData`, and using [Tenderly](https://dashboard.tenderly.co/) to debug. It may help to have your [contract verified.](https://book.getfoundry.sh/reference/forge/forge-verify-contract)

The example below shows you how to debug your own smart contract.

* `Insert any address` - Enter your smart contract's address here
* `Enter raw input data` - Enter the `callData` of your contract's function (right after `callData = encodeFunctionData()`)

<Accordion title="Expand for images and click to enlarge">
  <img src="https://mintcdn.com/coinbase-prod/s_QeFV8SFwGVfV_u/paymaster/images/pb-paymaster-tenderly-dev-debug.png?fit=max&auto=format&n=s_QeFV8SFwGVfV_u&q=85&s=9048f07e28807bc2498d57dabbd59a6a" data-og-width="1220" width="1220" data-og-height="1036" height="1036" data-path="paymaster/images/pb-paymaster-tenderly-dev-debug.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/coinbase-prod/s_QeFV8SFwGVfV_u/paymaster/images/pb-paymaster-tenderly-dev-debug.png?w=280&fit=max&auto=format&n=s_QeFV8SFwGVfV_u&q=85&s=41104763f0619788dcb971a2d66b2641 280w, https://mintcdn.com/coinbase-prod/s_QeFV8SFwGVfV_u/paymaster/images/pb-paymaster-tenderly-dev-debug.png?w=560&fit=max&auto=format&n=s_QeFV8SFwGVfV_u&q=85&s=069432719d5e8df8594f34a5c3252957 560w, https://mintcdn.com/coinbase-prod/s_QeFV8SFwGVfV_u/paymaster/images/pb-paymaster-tenderly-dev-debug.png?w=840&fit=max&auto=format&n=s_QeFV8SFwGVfV_u&q=85&s=7cc071189dba586784c1a037c4e7d8c7 840w, https://mintcdn.com/coinbase-prod/s_QeFV8SFwGVfV_u/paymaster/images/pb-paymaster-tenderly-dev-debug.png?w=1100&fit=max&auto=format&n=s_QeFV8SFwGVfV_u&q=85&s=b48059a4535f59cb6076c25024b31a16 1100w, https://mintcdn.com/coinbase-prod/s_QeFV8SFwGVfV_u/paymaster/images/pb-paymaster-tenderly-dev-debug.png?w=1650&fit=max&auto=format&n=s_QeFV8SFwGVfV_u&q=85&s=bbc1e36a2bf8ad83ae0cc2d3e2f5eb3d 1650w, https://mintcdn.com/coinbase-prod/s_QeFV8SFwGVfV_u/paymaster/images/pb-paymaster-tenderly-dev-debug.png?w=2500&fit=max&auto=format&n=s_QeFV8SFwGVfV_u&q=85&s=16369912c1aaa02b53e77329a7b7f84e 2500w" />
</Accordion>

## Invalid chain id

You might be using the mainnet RPC url instead of the testnet RPC url (or vis versa). Make sure you select the right network in the CDP portal

<Accordion title="Expand for images and click to enlarge">
  <img src="https://mintcdn.com/coinbase-prod/s_QeFV8SFwGVfV_u/paymaster/images/pb-paymaster-chainid.png?fit=max&auto=format&n=s_QeFV8SFwGVfV_u&q=85&s=65916bdcc1515aaa52c25987108a43c3" data-og-width="1662" width="1662" data-og-height="728" height="728" data-path="paymaster/images/pb-paymaster-chainid.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/coinbase-prod/s_QeFV8SFwGVfV_u/paymaster/images/pb-paymaster-chainid.png?w=280&fit=max&auto=format&n=s_QeFV8SFwGVfV_u&q=85&s=83d2cf5b7398ff144e6f0a045a3b031f 280w, https://mintcdn.com/coinbase-prod/s_QeFV8SFwGVfV_u/paymaster/images/pb-paymaster-chainid.png?w=560&fit=max&auto=format&n=s_QeFV8SFwGVfV_u&q=85&s=e591171edd2fcee5b3b6d5f601ec6d73 560w, https://mintcdn.com/coinbase-prod/s_QeFV8SFwGVfV_u/paymaster/images/pb-paymaster-chainid.png?w=840&fit=max&auto=format&n=s_QeFV8SFwGVfV_u&q=85&s=c936ad9067a043082af7c9e0f68019b3 840w, https://mintcdn.com/coinbase-prod/s_QeFV8SFwGVfV_u/paymaster/images/pb-paymaster-chainid.png?w=1100&fit=max&auto=format&n=s_QeFV8SFwGVfV_u&q=85&s=fc9987ca16f60596738b1277541c9a3a 1100w, https://mintcdn.com/coinbase-prod/s_QeFV8SFwGVfV_u/paymaster/images/pb-paymaster-chainid.png?w=1650&fit=max&auto=format&n=s_QeFV8SFwGVfV_u&q=85&s=9222111d8fc6daaeac3fd4d9cefc662a 1650w, https://mintcdn.com/coinbase-prod/s_QeFV8SFwGVfV_u/paymaster/images/pb-paymaster-chainid.png?w=2500&fit=max&auto=format&n=s_QeFV8SFwGVfV_u&q=85&s=af55444b9ec4d67d8900cb28af7205da 2500w" />
</Accordion>

## Invalid UserOperation signature or paymaster signature

```
UserOperation rejected because account signature check failed (or paymaster signature, if the paymaster uses its data as signature).
```

This likely means that you updated the UserOperation after getting a signature from our Paymaster service. Our Paymaster signs the UserOperation with the UserOperation itself, so make sure you're not making any changes to the UserOperation after it's already been signed by our Paymaster `paymasterClient.getPaymasterData()`. If you need to adjust things like `callData`, `preVerificationGas`, or `callGasLimit`, you will need to receive a new signature from our Paymaster. Also if you're handling multiple UserOperation, make sure the paymaster signature matches the right UserOperation.
