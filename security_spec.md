# Security Specification: YEAR INFO AI Firebase Architecture

## 1. Data Invariants

1. **User Invariant**: A user document at `/users/{userId}` can only be written by the authenticated user whose `request.auth.uid == userId` or a platform Super Admin (`yearinvo@gmail.com`).
2. **Workspace Isolation**: Data stored in `/workspaces/{workspaceId}/...` is strictly partitioned per workspace. Only verified members or owners of the workspace can read/write data in that workspace subtree.
3. **Immutability of IDs & Timestamps**: Critical relational keys (`id`, `workspaceId`, `customerId`) cannot be altered during update operations.
4. **Subscription Authority**: Subscriptions can only be approved or updated by platform SuperAdmins (`isAdmin()`).
5. **No Blanket Reads**: All list and query operations must enforce ownership and boundaries (`allow list: if resource.data.workspaceId == ...`).
6. **Strict Field Whitelisting**: Every update operation must use `affectedKeys().hasOnly(...)` to forbid shadow fields and injection of unauthorized attributes.

## 2. The Dirty Dozen Payloads (Rejection Targets)

1. **Payload 1 (Ghost Fields)**: Adding `isSuperAdmin: true` to a self-created user profile -> **REJECTED**.
2. **Payload 2 (Cross-Tenant Spoofing)**: Creating an order in workspace `ws_victim` while authenticated as user from `ws_attacker` -> **REJECTED**.
3. **Payload 3 (ID Poisoning)**: Document ID with 2KB payload or malicious characters -> **REJECTED**.
4. **Payload 4 (Unverified Email Write)**: Modifying financial subscription records with unverified email -> **REJECTED**.
5. **Payload 5 (Unbounded String Inflation)**: Sending 10MB string inside product description -> **REJECTED** (Max length 1000).
6. **Payload 6 (Shadow Field Injection)**: Injecting `apiKey` into product document -> **REJECTED**.
7. **Payload 7 (Orphan Message)**: Creating a message with nonexistent conversation ID -> **REJECTED**.
8. **Payload 8 (Role Privilege Escalation)**: Modifying `role: 'superadmin'` on existing profile -> **REJECTED**.
9. **Payload 9 (State Shortcutting)**: Directly updating an order from `cancelled` to `delivered` -> **REJECTED**.
10. **Payload 10 (Immortality Violation)**: Modifying `createdAt` or `ownerId` on an existing workspace -> **REJECTED**.
11. **Payload 11 (Unauthenticated Probe)**: Reading `/subscriptions` without authentication -> **REJECTED**.
12. **Payload 12 (Foreign Media Deletion)**: Deleting another workspace's product image from Storage -> **REJECTED**.
