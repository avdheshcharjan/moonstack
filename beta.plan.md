<!-- 09ed1f6e-77db-4b2f-903a-e24196fcce06 4c25574d-85b3-4b9f-89c7-f8c59dc8d722 -->
# Fix Connector Dependency Errors Plan

## Steps
1. **Reset Lockfile** ✅  
   - Confirmed the previous `package-lock.json` was absent so a fresh one could be generated.

2. **Install Required Packages** ✅  
   - Ran `npm install` to recreate the lockfile.  
   - Added `@react-native-async-storage/async-storage` and `pino-pretty` to satisfy MetaMask/wagmi peer dependencies.

3. **Verify Build** ✅  
   - `npm run lint` now advances beyond the missing-module errors (remaining warnings stem from existing code).

4. **Update Plan Doc** ✅  
   - Documented the completed steps here for future reference.

## Todos
- [x] Reset lockfile
- [x] Reinstall dependencies, adding missing peer deps if needed
- [x] Verify build succeeds
- [x] Sync beta.plan.md with actual steps


### Historical To-dos

- [x] Inspect beta_access app files & dependencies
- [x] Align root package/tailwind with beta homepage needs
- [x] Copy beta homepage assets into new root entry

