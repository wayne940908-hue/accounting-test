# Security Specification - Personal Finance Ledger App

## 1. Data Invariants
*   **User Ownership Sandbox**: All transactions and rule assets belong within the `/users/{userId}` subcollection namespace. Users may only access (create, read, update, delete) records whose parent `userId` matches their authenticated UID.
*   **Identifier Integrity**: The ID key embedded in the document (`transactionDoc.id` or `ruleDoc.id`) must strictly match the queryable Firestore document ID key (`transactionId` or `ruleId`).
*   **Strict Property Type Constraints & Bounds**: 
    *   Amounts must be numeric values and days of month must be integers between 1 and 31.
    *   Main categories, subcategories, names, and notes must have size limits to defend against payload bloat and Denial of Wallet (DoW) attacks.
    *   Types must only be `'income'` or `'expense'`.
*   **Immutability**: Once written, document primary IDs and ownership context must not change during updates.

---

## 2. The "Dirty Dozen" Rogue Payloads
Here are 12 specific rogue payloads/operations meant to break security rules. All of these must return `PERMISSION_DENIED`:

### Rogue Payload 1: Unauthorized Path Traverse (Access Other User Data)
An attacker authenticated as `alice_uid` tries to write to Bob's transactions:
```json
// path: /users/bob_uid/transactions/tx-123
{
  "id": "tx-123",
  "datetime": "2026-05-22T16:00:00.000Z",
  "amount": 100,
  "type": "expense",
  "category": "餐飲",
  "subcategory": "晚餐"
}
```

### Rogue Payload 2: Key Identifier Identity Fraud / Spoofing
User tries to write a transaction document where the payload's inner `id` is different from the document path key:
```json
// path: /users/alice_uid/transactions/real-tx-abc
{
  "id": "spoofed-tx-xyz",
  "datetime": "2026-05-22T16:00:00.000Z",
  "amount": 150,
  "type": "expense",
  "category": "交通",
  "subcategory": "公車"
}
```

### Rogue Payload 3: Injection of Shadow Ghost Fields (The "Ghost Field" Attack)
Add malicious non-declared attributes (`isVerifiedAdmin`) to elevate status:
```json
// path: /users/alice_uid/transactions/tx-789
{
  "id": "tx-789",
  "datetime": "2026-05-22T16:00:00.000Z",
  "amount": 50,
  "type": "expense",
  "category": "醫療",
  "subcategory": "診所",
  "isVerifiedAdmin": true
}
```

### Rogue Payload 4: ID Resource Poisoning (Massive Trash ID)
Trying to write with an outrageously long ID string payload or path variable to bloat storage or cause indexing degradation:
```json
// path: /users/alice_uid/transactions/tx-VERY_LONG_TRASH_ID_FILLING_UP_KILOBYTES_OF_TEXT_AND_SPECIAL_CHARS_$%^@#$...
{
  "id": "tx-VERY_LONG_TRASH_ID_FILLING_UP_KILOBYTES_OF_TEXT_AND_SPECIAL_CHARS_$%^@#$...",
  "datetime": "2026-05-22T16:00:00.000Z",
  "amount": 10,
  "type": "expense",
  "category": "其他支出",
  "subcategory": "雜項"
}
```

### Rogue Payload 5: Invalid Type Assignment (State Value Poisoning)
Providing an invalid enum type string instead of 'income' or 'expense':
```json
// path: /users/alice_uid/transactions/tx-456
{
  "id": "tx-456",
  "datetime": "2026-05-22T16:00:00.000Z",
  "amount": 20,
  "type": "stolen_cash",
  "category": "餐飲",
  "subcategory": "飲料"
}
```

### Rogue Payload 6: Rogue Type Conversion (DoW Payload Bloat)
Adding a note containing massive character data (e.g. 100,000 chars) or invalid array-like type where a string is expected:
```json
// path: /users/alice_uid/transactions/tx-note-attack
{
  "id": "tx-note-attack",
  "datetime": "2026-05-22T16:00:00.000Z",
  "amount": 5,
  "type": "expense",
  "category": "娛樂",
  "subcategory": "課金",
  "note": ["Should raise", "Error", "Since it is a list, not string"]
}
```

### Rogue Payload 7: Recurring Rule Invalid Day (Underflow / Overflow)
Providing a day of month outside the valid range [1, 31]:
```json
// path: /users/alice_uid/recurringRules/rule-999
{
  "id": "rule-999",
  "name": "訂閱影音",
  "amount": 320,
  "type": "expense",
  "category": "數位服務",
  "subcategory": "Netflix",
  "dayOfMonth": 35,
  "isActive": true
}
```

### Rogue Payload 8: Immutable Core Field Alteration (Update-Gap Attack)
Updating a transaction to alter its inner unique id:
```json
// path: /users/alice_uid/transactions/tx-origin
// original payload id was "tx-origin"
// updating to:
{
  "id": "tx-changed-id",
  "datetime": "2026-05-22T16:00:00.000Z",
  "amount": 500,
  "type": "expense",
  "category": "居家",
  "subcategory": "房租"
}
```

### Rogue Payload 9: Listing Other Users' Ledger ( PI Blanket Test Fail )
An anonymous or arbitrary authenticated user fetching Bob's transaction logs globally without specifying an owner filter, or querying the base path directly:
```ts
// Attempt to lists /users/bob_uid/transactions/
// Must result in PERMISSION_DENIED
```

### Rogue Payload 10: Recurring Rule Schema Incompletion
Attempting to save a recurring template rule with missing mandatory fields:
```json
// path: /users/alice_uid/recurringRules/rule-invalid-omission
{
  "id": "rule-invalid-omission",
  "name": "Gym membership",
  "amount": 1000
  // Missing type, category, subcategory, dayOfMonth, isActive fields
}
```

### Rogue Payload 11: Unauthenticated Creation (Anonymity Spoof Attack)
Attempting to write records on a user path by a client session which has not authenticated (`request.auth == null`):
```json
// path: /users/any_uid/transactions/tx-unauth
{
  "id": "tx-unauth",
  "datetime": "2026-05-22T16:00:00.000Z",
  "amount": 25,
  "type": "expense",
  "category": "餐飲",
  "subcategory": "午餐"
}
```

### Rogue Payload 12: Bad Type for Numeric Value
Attempting to save a transaction with a string representation of an amount:
```json
// path: /users/alice_uid/transactions/tx-amount-string
{
  "id": "tx-amount-string",
  "datetime": "2026-05-22T16:00:00.000Z",
  "amount": "1000",
  "type": "expense",
  "category": "居家",
  "subcategory": "管理費"
}
```

---

## 3. Test Assurance Pattern
These payloads form the core baseline for our `firestore.rules` checks. The Fortress rules compile validators `isValidTransaction` and `isValidRecurringRule` to explicitly halt operations failing any of these.
