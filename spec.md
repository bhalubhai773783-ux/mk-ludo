# Ludo Battle Arena

## Current State
New project. No existing code.

## Requested Changes (Diff)

### Add
- **Lobby**: Main screen listing active battles (entry fee, status, players). Users can create a new battle or join an existing one.
- **Wallet**: Screen for users to view balance, add money (UPI/bank deposit request), and request withdrawals to bank/UPI.
- **Battle Room**: Private screen for two matched players. Displays a shared Ludo King room code, in-room chat, and a "Declare Winner" button for players to submit result with screenshot upload.
- **Admin Panel**: Password-protected screen for admin to view all battles, verify winner claims (view screenshots), approve/reject results, and manually settle disputes.
- **User Auth**: Login/register with username to identify players.
- **Battle lifecycle**: Created → Joined (2 players) → In Progress (room code set) → Result Submitted → Completed/Disputed.

### Modify
- Nothing (new project).

### Remove
- Nothing (new project).

## Implementation Plan
1. Backend actor with:
   - User registration/login (principal-based)
   - Battle CRUD: create, join, list, get by ID
   - Battle state machine: open → active → pending_result → completed/disputed
   - Room code storage per battle
   - Chat messages per battle room
   - Wallet: balance per user, deposit requests, withdrawal requests
   - Winner claim submission (player declares result)
   - Admin functions: list all battles, approve/reject result, set winner, settle dispute
   - Admin authentication via hardcoded admin principal or password check
2. Frontend screens:
   - Auth: login/register page
   - Lobby: list battles with entry fee, status, join/create buttons
   - Wallet: balance display, add money form, withdrawal form, transaction history
   - Battle Room: room code display, chat, declare winner UI
   - Admin Panel: battle management table, winner verification, dispute resolution
3. Navigation between screens via React Router or tab-based layout
